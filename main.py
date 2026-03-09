import io

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ValidationError

# Inicialización de la aplicación con metadatos para la documentación OpenAPI
app = FastAPI(title="FARM Energy Processor Pro")

# Configuración del cliente asíncrono para MongoDB (Motor)
# Se recomienda mover estas credenciales a variables de entorno (.env) en producción
client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client["reto_final"]

# Governance de datos: límite de carga para mitigar ataques DoS por agotamiento de RAM
MAX_FILE_SIZE = 5 * 1024 * 1024


class LecturaCSV(BaseModel):
    """
    Data Transfer Object (DTO) para la validación de registros energéticos.
    Define las reglas de negocio atómicas para cada lectura de contador.
    """

    cups: str = Field(..., pattern=r"^[A-Z]{2}\d{16}[A-Z]{2}$")
    consumo: float = Field(..., gt=0)
    id_contador: int = Field(..., ge=1)


@app.post(
    "/upload-lecturas/",
    status_code=status.HTTP_201_CREATED,
    summary="Procesamiento masivo de lecturas CSV",
    description="Recibe, valida e inserta lecturas energéticas en MongoDB tras un proceso de limpieza",
)
async def upload_lecturas(file: UploadFile = File(...)):
    """
    Pipeline de ingesta de datos:
    1. Filtros de seguridad perimetral (Extensión, MIME, Tamaño).
    2. Parsing e integridad estructural con Pandas.
    3. Normalización y limpieza vectorizada.
    4. Validación semántica con Pydantic.
    5. Persistencia atómica en MongoDB.
    """

    # --- CAPA 1: VALIDACIÓN ESTRUCTURAL Y SEGURIDAD ---

    # Validación de extensión (filtro rápido)
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Extensión de archivo no permitida. Se requiere .csv",
        )

    # Validación de Content-Type para evitar ataques de suplantación de archivos
    if file.content_type != "text/csv":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El MIME-Type debe ser text/csv",
        )

    # Lectura asíncrona de bytes y control de desbordamiento de memoria
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Archivo demasiado pesado. Máximo permitido: {MAX_FILE_SIZE / 1024 / 1024}MB",
        )

    # --- CAPA 2: PARSING E INTEGRIDAD (PANDAS) ---

    try:
        # Uso de BytesIO para procesamiento 'in-memory' sin persistencia temporal en disco
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error crítico de parsing: El CSV tiene una estructura ilegible.",
        )

    if df.empty:
        return {
            "mensaje": "Estructura válida pero sin datos para procesar",
            "insertados": 0,
        }

    # --- CAPA 3: NORMALIZACIÓN Y LIMPIEZA ---

    # Eliminación de espacios en blanco (trim) solo en columnas de tipo objeto/string
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)

    # Conversión a tipos nativos de Python para asegurar compatibilidad BSON con MongoDB
    df = df.astype(object).replace({np.nan: None})

    # --- CAPA 4: VALIDACIÓN SEMÁNTICA (PYDANTIC) ---

    registros_validados = []
    errores = []

    # Iteración sobre los registros para validación granular
    # orient="records" genera una lista de diccionarios (clave: valor)
    for i, row in enumerate(df.to_dict(orient="records")):
        try:
            # Normalización preventiva de llaves del diccionario a string
            row_str_keys = {str(k): v for k, v in row.items()}

            # Instanciación del modelo: aquí se ejecutan los regex y restricciones de rango
            lectura = LecturaCSV(**row_str_keys)

            # model_dump() genera el diccionario limpio listo para la base de datos
            registros_validados.append(lectura.model_dump())

        except ValidationError as e:
            # Estrategia de 'Graceful Failure': se reporta el error pero no se aborta el proceso
            errores.append(
                {
                    "fila": i + 2,  # Offset: +1 por cabecera CSV, +1 por índice base 0
                    "detalles": e.errors(),
                }
            )

    # --- CAPA 5: PERSISTENCIA ASÍNCRONA ---

    if registros_validados:
        # Inserción por lotes (bulk insert) para optimizar el IO con la base de datos
        await db.lecturas.insert_many(registros_validados)

    # Respuesta informativa sobre el estado del proceso masivo
    return {
        "status": "success" if not errores else "partial_success",
        "estadisticas": {
            "insertados": len(registros_validados),
            "fallidos": len(errores),
        },
        "detalle_errores": errores[
            :10
        ],  # Limitación de logs en respuesta para evitar payloads masivos
    }
