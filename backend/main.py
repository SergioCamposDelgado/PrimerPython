# backend/main.py
"""Punto de entrada principal de la aplicación FARM Energy API.

Este módulo inicializa la instancia de FastAPI, configura el ciclo de vida
de las conexiones (Lifespan), establece las políticas de seguridad CORS
y registra las rutas de la API bajo una estrategia de versionado.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1.endpoints import lecturas
from backend.db.mongodb import close_mongo_connection, connect_to_mongo


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Orquestador del ciclo de vida de la aplicación.

    Gestiona los eventos de inicio (Start-up) y parada (Shutdown) del servidor.
    Asegura que el pool de conexiones a MongoDB esté listo antes de recibir
    tráfico y que se cierren los sockets de forma limpia al finalizar.

    Args:
        app: Instancia de la aplicación FastAPI.

    Yields:
        Mantiene el contexto activo durante la ejecución del servidor.
    """
    # [START-UP]: Conexión al motor asíncrono de MongoDB
    await connect_to_mongo()

    yield

    # [SHUTDOWN]: Cierre de la conexión al finalizar el proceso
    await close_mongo_connection()


# --- INSTANCIACIÓN DE LA APLICACIÓN ---
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REGISTRO DE RUTAS ---
app.include_router(
    lecturas.router, prefix="/api/v1", tags=["Módulo de Lecturas Energéticas"]
)


@app.get("/health", tags=["Sistema"])
async def health_check():
    """Verifica la disponibilidad básica del servicio.

    Returns:
        dict: Un objeto con el estado actual del servicio y su identificador.
    """
    return {"status": "ok", "service": "FARM Energy API"}
