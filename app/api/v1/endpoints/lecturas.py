# app/api/v1/endpoints/lecturas.py
from fastapi import APIRouter, File, HTTPException, Path, UploadFile, status

from app.core.config import settings
from app.db.mongodb import db_client
from app.services.energy import EnergyService

router = APIRouter()


@router.post("/upload-lecturas/", status_code=status.HTTP_201_CREATED)
async def upload_csv(file: UploadFile = File(...)):
    # Capa 1: Seguridad básica
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .csv")

    contents = await file.read()

    # Capa 2: Control de tamaño desde config
    if len(contents) > (settings.MAX_FILE_SIZE_MB * 1024 * 1024):
        raise HTTPException(
            status_code=413,
            detail=f"Archivo demasiado grande. Máximo {settings.MAX_FILE_SIZE_MB}MB",
        )

    # Capa 3: Procesamiento
    try:
        validados, errores = await EnergyService.process_csv(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Capa 4: Persistencia
    if validados:
        # Usamos db_client.db que inicializamos en el lifespan de main.py
        if db_client.db is not None:
            await db_client.db.lecturas.insert_many(validados)

    return {
        "mensaje": "Procesamiento finalizado",
        "insertados": len(validados),
        "errores": errores[:10],  # Limitamos para no saturar la respuesta
    }


@router.get(
    "/stats/{cups}",
    summary="Obtener estadísticas de consumo por CUPS",
    response_description="Estadísticas agregadas de consumo energético",
)
async def get_stats_by_cups(
    cups: str = Path(
        ...,
        pattern=r"^[A-Z]{2}\d{16}[A-Z]{2}$",
        description="Código CUPS del punto de suministro",
    )
):
    """
    Calcula estadísticas en tiempo real usando el motor de agregación de MongoDB:
    1. Filtra registros por CUPS exacto.
    2. Agrupa y calcula Suma, Promedio y Conteo total.
    """

    # Verificamos que la base de datos esté conectada
    if db_client.db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Error de conexión con la base de datos",
        )

    # Definición del Pipeline de Agregación
    pipeline = [
        # Etapa 1: Filtrado
        {"$match": {"cups": cups}},
        # Etapa 2: Agrupación y Cálculos
        {
            "$group": {
                "_id": "$cups",
                "consumo_total": {"$sum": "$consumo"},
                "consumo_medio": {"$avg": "$consumo"},
                "total_lecturas": {"$count": {}},
            }
        },
    ]

    try:
        # Ejecutamos la agregación de forma asíncrona
        cursor = db_client.db.lecturas.aggregate(pipeline)
        # Convertimos el cursor a una lista (esperamos máximo 1 resultado)
        result = await cursor.to_list(length=1)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se han encontrado lecturas para el CUPS: {cups}",
            )

        # Retornamos el único documento del resultado
        return result[0]

    except Exception as e:
        # Captura de errores inesperados de la base de datos
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al procesar estadísticas: {str(e)}",
        )
