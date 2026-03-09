# app/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.endpoints import lecturas
from app.db.mongodb import close_mongo_connection, connect_to_mongo


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestión del ciclo de vida (Lifespan) de la aplicación.

    Este manejador de contexto garantiza que los recursos críticos, como la
    conexión a la base de datos, se inicialicen correctamente antes de que
    la API acepte peticiones y se liberen de forma segura al apagar el servidor.
    """
    # Evento de inicio (Startup): Inicialización del pool de conexiones asíncronas.
    await connect_to_mongo()

    yield  # La aplicación permanece en este punto durante su ejecución.

    # Evento de cierre (Shutdown): Cierre ordenado de recursos para evitar fugas.
    await close_mongo_connection()


# Inicialización del núcleo de FastAPI con metadatos para OpenAPI (Swagger).
# El parámetro 'lifespan' vincula la lógica de conexión definida anteriormente.
app = FastAPI(
    title="FARM Energy API",
    description="Sistema de procesamiento de lecturas energéticas basado en el Stack FARM.",
    version="1.0.0",
    lifespan=lifespan,
)

# --- REGISTRO DE RUTAS (ROUTING) ---
# Se implementa un versionado (v1) para permitir cambios disruptivos en el futuro
# sin afectar a los clientes que consumen la API actual.
app.include_router(
    lecturas.router, prefix="/api/v1", tags=["Módulo de Lecturas Energéticas"]
)
