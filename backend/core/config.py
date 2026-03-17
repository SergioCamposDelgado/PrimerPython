# backend/core/config.py
import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Gestión centralizada de la configuración y variables de entorno.

    Esta clase carga automáticamente los valores desde un archivo `.env` o desde
    las variables de entorno del sistema operativo.

    Attributes:
        MONGO_URL (str): URI de conexión para el clúster de MongoDB.
        DATABASE_NAME (str): Nombre de la base de datos lógica.
        MAX_FILE_SIZE_MB (int): Límite máximo para la carga de archivos en MB.
        PROJECT_NAME (str): Nombre del proyecto para OpenAPI.
    """

    # --- INFRAESTRUCTURA Y PERSISTENCIA ---
    MONGO_URL: str = os.getenv("MONGO_DETAILS", "mongodb://localhost:27017")
    DATABASE_NAME: str = "reto_final"

    # --- POLÍTICAS DE SEGURIDAD Y GESTIÓN DE DATOS ---
    MAX_FILE_SIZE_MB: int = 5

    # --- METADATOS DEL PROYECTO ---
    PROJECT_NAME: str = "FARM Energy API"

    # --- CONFIGURACIÓN DEL CARGADOR ---
    # Se especifica el archivo .env, su codificación e ignora variables extra.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Instancia única (Singleton) de la configuración.
settings = Settings()
