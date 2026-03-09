# backend/main.py

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1.endpoints import lecturas
from backend.db.mongodb import close_mongo_connection, connect_to_mongo


# --- GESTIÓN DEL CICLO DE VIDA (LIFESPAN) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Orquestador del ciclo de vida de la aplicación (Eventos Start-up y Shutdown).

    Este gestor asegura que la conexión a MongoDB mediante Motor se establezca
    de forma asíncrona antes de que el servidor acepte peticiones. Al apagarse,
    realiza un cierre 'graceful' (limpio) de los sockets, liberando recursos
    en el clúster de base de datos y evitando conexiones huérfanas.
    """
    # [START-UP]: Conexión al motor asíncrono de MongoDB
    await connect_to_mongo()

    yield  # La aplicación permanece activa y procesando peticiones en este punto

    # [SHUTDOWN]: Cierre de la conexión al finalizar el proceso del servidor
    await close_mongo_connection()


# --- INSTANCIACIÓN DE LA APLICACIÓN ---
# Se define la instancia principal de FastAPI con metadatos para la documentación OpenAPI
app = FastAPI(
    title="FARM Energy API",
    description=(
        "Backend de alto rendimiento basado en el stack FARM (FastAPI, React, MongoDB). "
        "Especializado en ingesta masiva y analítica agregada de lecturas eléctricas."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# --- CONFIGURACIÓN DE SEGURIDAD (CORS) ---
# El middleware CORS (Cross-Origin Resource Sharing) es crítico para la comunicación
# entre dominios. Sin esto, el navegador bloquearía las peticiones del Frontend (Vite).
app.add_middleware(
    CORSMiddleware,
    # Orígenes permitidos: Se recomienda usar variables de entorno en producción
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    # Métodos permitidos (GET, POST, DELETE, etc.) y cabeceras de control (Headers)
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REGISTRO DE RUTAS Y ESTRATEGIA DE VERSIONADO ---
# Se utiliza un esquema de versionado /api/v1/ para garantizar la retrocompatibilidad.
# Esto permite que nuevas versiones de la API coexistan con la actual en el futuro.
app.include_router(
    lecturas.router, prefix="/api/v1", tags=["Módulo de Lecturas Energéticas"]
)


# --- ENDPOINT DE SALUD (HEALTH CHECK) ---
@app.get("/health", tags=["Sistema"])
async def health_check():
    """Verifica la disponibilidad básica del servicio."""
    return {"status": "ok", "service": "FARM Energy API"}
