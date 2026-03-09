# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Gestión centralizada de la configuración y variables de entorno.

    Utiliza Pydantic para la validación de tipos y carga automática desde archivos .env.
    Este enfoque garantiza que las credenciales y parámetros de infraestructura
    permanezcan desacoplados del código fuente.
    """

    # --- INFRAESTRUCTURA Y PERSISTENCIA ---
    # Se definen valores por defecto para facilitar el desarrollo local,
    # pero deben ser sobrescritos en producción mediante el archivo .env.
    MONGO_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "reto_final"

    # --- POLÍTICAS DE SEGURIDAD Y GESTIÓN DE DATOS ---
    # Límite de carga (Payload) para prevenir ataques de denegación de servicio (DoS)
    # por agotamiento de memoria RAM durante el procesamiento de CSVs.
    MAX_FILE_SIZE_MB: int = 5

    # --- METADATOS DEL PROYECTO ---
    # Información utilizada para la autogeneración de la documentación OpenAPI/Swagger.
    PROJECT_NAME: str = "FARM Energy API"

    # --- CONFIGURACIÓN DEL CARGADOR ---
    model_config = SettingsConfigDict(
        # Especificamos la ubicación del archivo de secretos.
        env_file=".env",
        env_file_encoding="utf-8",
        # 'extra="ignore"' permite que existan otras variables en el .env
        # que no necesariamente estén mapeadas en esta clase.
        extra="ignore",
    )


# Instanciación Singleton de la configuración.
# Pydantic buscará automáticamente las variables en el entorno del Sistema Operativo
# o en el archivo .env al momento de la importación.
settings = Settings()
