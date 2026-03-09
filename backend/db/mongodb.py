# backend/db/mongodb.py
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from backend.core.config import settings


class MongoDB:
    """
    Contenedor de estado para la persistencia en MongoDB.

    Utiliza el patrón Singleton implícito para centralizar el acceso al cliente
    y a la base de datos, facilitando la inyección de la conexión en los
    diferentes módulos de la API.
    """

    # Se inicializan como Optional para permitir un arranque en frío (Cold Start)
    # y evitar errores de referencia antes de que el servidor esté listo.
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


# Instancia global que será importada por los routers y servicios.
db_client = MongoDB()


async def connect_to_mongo():
    """
    Inicializa la conexión con el clúster de MongoDB.

    Este método debe ser invocado durante el evento 'startup' de FastAPI
    (Lifespan) para asegurar que el pool de conexiones asíncronas esté
    disponible antes del tráfico de red.
    """
    # Instanciación del cliente asíncrono (Motor) utilizando la URI de configuración.
    db_client.client = AsyncIOMotorClient(settings.MONGO_URL)

    # Selección de la base de datos lógica definida en las variables de entorno.
    db_client.db = db_client.client[settings.DATABASE_NAME]

    # Tip pro: Aquí es donde se suelen disparar las creaciones de índices
    # para optimizar las búsquedas por CUPS desde el arranque.


async def close_mongo_connection():
    """
    Cierre ordenado (Graceful Shutdown) de la conexión.

    Libera los recursos del pool de conexiones cuando la aplicación se detiene,
    evitando conexiones 'zombies' en el servidor de base de datos.
    """
    if db_client.client:
        db_client.client.close()
