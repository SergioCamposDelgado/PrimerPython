# backend/db/mongodb.py
"""Módulo de gestión de persistencia para MongoDB.

Este módulo centraliza la configuración, conexión y cierre de la base de datos
utilizando el driver asíncrono Motor. Está diseñado para integrarse con el
ciclo de vida (Lifespan) de FastAPI.
"""

from typing import Optional

from core.config import settings
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase


class MongoDB:
    """Contenedor de estado para la persistencia en MongoDB.

    Utiliza un patrón de acceso centralizado para gestionar el cliente y la
    instancia de la base de datos, permitiendo que la conexión sea compartida
    por diferentes módulos de la API sin redundancia.

    Attributes:
        client (Optional[AsyncIOMotorClient]): Instancia del cliente asíncrono de Motor.
            Se inicializa como None para soportar el arranque en frío.
        db (Optional[AsyncIOMotorDatabase]): Referencia a la base de datos lógica
            especificada en la configuración.
    """

    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


# Instancia global que será importada por los routers y servicios.
db_client = MongoDB()


async def connect_to_mongo() -> None:
    """Inicializa la conexión con el clúster de MongoDB.

    Configura el cliente asíncrono utilizando la URL de conexión y selecciona
    la base de datos principal. Este método debe invocarse exclusivamente
    durante el evento 'startup' de la aplicación.

    Note:
        Es el lugar recomendado para la creación de índices automáticos
        al arrancar el servicio.

    Raises:
        ConfigurationError: Si las variables de entorno MONGO_URL o
            DATABASE_NAME no están correctamente definidas en settings.
    """
    # Instanciación del cliente asíncrono (Motor)
    db_client.client = AsyncIOMotorClient(settings.MONGO_URL)

    # Selección de la base de datos lógica
    db_client.db = db_client.client[settings.DATABASE_NAME]


async def close_mongo_connection() -> None:
    """Cierre ordenado (Graceful Shutdown) de la conexión con MongoDB.

    Verifica si existe una instancia activa del cliente y libera los recursos
    del pool de conexiones. Este proceso evita la persistencia de conexiones
    inactivas (zombies) en el servidor de base de datos.

    Example:
        Este método se utiliza típicamente en el handler de apagado:

        >>> await close_mongo_connection()
    """
    if db_client.client:
        db_client.client.close()
