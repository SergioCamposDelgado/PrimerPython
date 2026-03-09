# backend/api/v1/endpoints/lecturas.py

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Path, Query, UploadFile, status

from backend.core.config import settings
from backend.db.mongodb import db_client
from backend.models.lectura import LecturaCSV, LecturaUpdate
from backend.services.energy import EnergyService

# Inicialización del router para el módulo de lecturas energéticas
router = APIRouter()

# --- OPERACIONES DE CARGA MASIVA (CSV) ---


@router.post(
    "/upload-lecturas/",
    status_code=status.HTTP_201_CREATED,
    summary="Carga y valida un archivo CSV de lecturas",
)
async def upload_csv(file: UploadFile = File(...)):
    """
    Orquestador para la ingesta masiva de datos:

    1. **Validación de Capa de Transporte**: Verifica extensión y tamaño del archivo.
    2. **Procesamiento de Negocio**: Delega al Service el parsing y validación semántica.
    3. **Persistencia**: Ejecuta el volcado a la base de datos tras asegurar la integridad.
    """
    # Validación básica de formato
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de archivo no soportado. Debe ser un archivo .csv",
        )

    contents = await file.read()

    # Validación de seguridad por tamaño de payload
    if len(contents) > (settings.MAX_FILE_SIZE_MB * 1024 * 1024):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo excede el límite de {settings.MAX_FILE_SIZE_MB}MB",
        )

    try:
        # Delegación de lógica ETL al servicio
        validados, errores = await EnergyService.process_csv(contents)

        if validados:
            db = db_client.db
            if db is None:
                raise ConnectionError("Instancia de Base de Datos no recuperable")

            # Persistencia masiva para optimizar operaciones de E/S
            await db.lecturas.insert_many(validados)

        return {
            "status": "finalizado",
            "insertados": len(validados),
            "errores": errores,
        }

    except (ValueError, ConnectionError) as e:
        # Captura de errores de negocio o de infraestructura
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- OPERACIONES DE CONSULTA Y LISTADO (READ) ---


@router.get(
    "/",
    summary="Listado paginado con filtros avanzados",
    response_description="Lista de lecturas y metadatos de paginación",
)
async def list_lecturas(
    skip: int = Query(0, ge=0, description="Registros a omitir para paginación"),
    limit: int = Query(20, ge=1, le=100, description="Límite de registros por página"),
    cups: Optional[str] = Query(None, description="Filtrar por código CUPS"),
    fecha_inicio: Optional[datetime] = Query(
        None, description="Límite inferior temporal (ISO 8601)"
    ),
    fecha_fin: Optional[datetime] = Query(
        None, description="Límite superior temporal (ISO 8601)"
    ),
):
    """
    Punto de acceso para consumo de datos con soporte para:
    - **Paginación**: Mediante parámetros skip/limit.
    - **Filtro de Suministro**: Búsqueda por CUPS específico.
    - **Filtrado Temporal**: Rangos de fecha dinámicos gestionados por el Service.
    """
    try:
        return await EnergyService.get_paginated_lecturas(
            skip=skip,
            limit=limit,
            cups=cups,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
        )
    except ConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )


@router.get(
    "/{id}",
    summary="Obtiene una lectura específica por su ID único",
)
async def get_lectura(id: str = Path(..., description="ID hexadecimal de MongoDB")):
    """Recupera un documento individual tras validar la integridad del identificador."""
    lectura = await EnergyService.get_lectura_by_id(id)
    if not lectura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado o formato de ID inválido",
        )
    return lectura


# --- OPERACIONES CRUD (INDIVIDUALES) ---


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Registro manual de lectura individual",
)
async def create_lectura(lectura: LecturaCSV):
    """Inserta una lectura validada por el modelo Pydantic en la persistencia."""
    try:
        return await EnergyService.create_single_lectura(lectura)
    except ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Error de comunicación con la persistencia",
        )


@router.patch(
    "/{id}",
    summary="Actualización parcial de una lectura",
)
async def update_lectura(id: str, lectura_data: LecturaUpdate):
    """Aplica cambios atómicos a campos específicos de un registro existente."""
    updated = await EnergyService.update_lectura_partial(id, lectura_data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Actualización fallida: ID no encontrado o payload sin cambios",
        )
    return {"status": "actualizado"}


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminación de registro",
)
async def delete_lectura(id: str):
    """Ejecuta el borrado físico del registro identificado por ID."""
    deleted = await EnergyService.delete_lectura_by_id(id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referencia no encontrada para eliminación",
        )
    return None


# --- OPERACIONES ANALÍTICAS ---


@router.get(
    "/stats/{cups}",
    summary="Métricas agregadas por punto de suministro (CUPS)",
)
async def get_stats_by_cups(
    cups: str = Path(
        ..., pattern=r"^[A-Z]{2}\d{16}[A-Z]{2}$", description="Código CUPS estándar"
    )
):
    """
    Retorna analíticas procesadas en el motor de base de datos:
    - Sumatorio de consumo.
    - Media aritmética.
    - Conteo total de registros.
    """
    try:
        stats = await EnergyService.get_cups_stats(cups)
        if not stats:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No existen registros asociados a este CUPS",
            )
        return stats
    except ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Fallo en la ejecución del pipeline de analítica",
        )
