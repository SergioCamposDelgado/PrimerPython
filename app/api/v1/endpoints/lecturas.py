# app/api/v1/endpoints/lecturas.py

from fastapi import APIRouter, File, HTTPException, Path, UploadFile, status

from app.core.config import settings
from app.db.mongodb import db_client
from app.services.energy import EnergyService

# Inicialización del router para el módulo de lecturas
router = APIRouter()


@router.post(
    "/upload-lecturas/",
    status_code=status.HTTP_201_CREATED,
    summary="Carga y valida un archivo CSV de lecturas",
)
async def upload_csv(file: UploadFile = File(...)):
    """
    Procesa la carga masiva de lecturas energéticas mediante un archivo CSV.

    El flujo realiza una validación en capas:
    1. Formato de archivo.
    2. Tamaño máximo permitido.
    3. Integridad semántica de los datos (vía EnergyService).
    4. Persistencia en base de datos.

    Args:
        file (UploadFile): Archivo binario enviado a través de un formulario multipart/form-data.

    Returns:
        dict: Resumen del proceso indicando el número de registros insertados y lista de errores.

    Raises:
        HTTPException: 400 si el formato es inválido, 413 si excede el tamaño, 503 si la DB falla.
    """

    # Capa 1: Validación de extensión de archivo
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de archivo no soportado. Debe ser un .csv",
        )

    # Lectura del contenido binario del archivo
    contents = await file.read()

    # Capa 2: Control de cuota y protección de memoria del servidor
    # Se compara el tamaño contra el límite definido en las variables de entorno
    if len(contents) > (settings.MAX_FILE_SIZE_MB * 1024 * 1024):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo excede el límite de {settings.MAX_FILE_SIZE_MB}MB",
        )

    # Capa 3: Delegación de procesamiento lógico y validación de negocio
    try:
        validados, errores = await EnergyService.process_csv(contents)
    except ValueError as e:
        # Errores estructurales en la lectura del CSV (ej: delimitadores inválidos)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Capa 4: Persistencia atómica de los registros exitosos
    if validados:
        if db_client.db is not None:
            # Operación de inserción masiva (bulk insert) para optimizar rendimiento
            await db_client.db.lecturas.insert_many(validados)
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Base de datos no disponible para escritura",
            )

    # Retorno de reporte para feedback en el Frontend
    return {"status": "finalizado", "insertados": len(validados), "errores": errores}


@router.get(
    "/stats/{cups}",
    summary="Analítica agregada por CUPS",
    response_description="Métricas calculadas (Total, Medio, Conteo)",
)
async def get_stats_by_cups(
    cups: str = Path(
        ...,
        pattern=r"^[A-Z]{2}\d{16}[A-Z]{2}$",  # Validación Regex de formato CUPS
        description="CUPS estándar (ej: ES1234567890123456XX)",
    )
):
    """
    Calcula métricas de consumo energético para un CUPS específico.

    Utiliza el motor de agregación de MongoDB para realizar cálculos pesados
    en el servidor de datos, evitando la carga innecesaria de documentos en memoria.

    Args:
        cups (str): Código Unificado de Punto de Suministro validado por regex.

    Returns:
        dict: Objeto con _id, consumo_total, consumo_medio y total_lecturas.

    Raises:
        HTTPException: 404 si el CUPS no tiene datos, 500 para errores internos.
    """

    # Verificación de salud de la conexión a la base de datos
    if db_client.db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de base de datos temporalmente fuera de línea",
        )

    # Definición del Pipeline de Agregación:
    # 1. $match: Filtra documentos por el CUPS solicitado.
    # 2. $group: Agrupa resultados y aplica acumuladores matemáticos.
    pipeline = [
        {"$match": {"cups": cups}},
        {
            "$group": {
                "_id": "$cups",
                "consumo_total": {"$sum": "$consumo"},
                "consumo_medio": {"$avg": "$consumo"},
                "total_lecturas": {
                    "$sum": 1
                },  # Conteo manual compatible con versiones < 5.0
            }
        },
    ]

    try:
        # Ejecución de la consulta asíncrona
        cursor = db_client.db.lecturas.aggregate(pipeline)
        result = await cursor.to_list(length=1)

        # Validación de existencia de datos
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No existen lecturas registradas para el CUPS: {cups}",
            )

        return result[0]

    except HTTPException as he:
        # Propagación de excepciones de control (como el 404 anterior)
        raise he
    except Exception as e:
        # Captura de errores inesperados (fallos de red, sintaxis de pipeline, etc.)
        # El log en consola es vital para el mantenimiento en producción
        print(f"ERROR EN AGGREGATION: {type(e).__name__} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error técnico en el motor analítico: {str(e)}",
        )
