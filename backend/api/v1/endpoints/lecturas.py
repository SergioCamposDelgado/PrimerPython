# backend/api/v1/endpoints/lecturas.py
"""Módulo de controladores para la API de lecturas energéticas.

Define las rutas (endpoints) para la carga, consulta, gestión CRUD y analítica
de datos. Actúa como el puente entre el transporte HTTP y la capa de servicios.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from core.config import settings
from db.mongodb import db_client
from fastapi import APIRouter, File, HTTPException, Path, Query, UploadFile, status
from models.lectura import LecturaCSV, LecturaUpdate
from services.energy import EnergyService

# Inicialización del router para el módulo de lecturas energéticas
router = APIRouter()


# --- OPERACIONES DE CARGA MASIVA (CSV) ---


@router.post(
    "/upload-lecturas/",
    status_code=status.HTTP_201_CREATED,
    summary="Carga y valida un archivo CSV de lecturas",
)
async def upload_csv(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Orquestador para la ingesta masiva de datos mediante archivos CSV.

    Realiza un flujo de trabajo en tres pasos:
    1. **Validación de Capa de Transporte**: Verifica extensión y límites de tamaño.
    2. **Procesamiento de Negocio**: Delega al Service el parsing y validación semántica.
    3. **Persistencia**: Ejecuta el volcado masivo a MongoDB tras asegurar la integridad.

    Args:
        file: Objeto de archivo cargado mediante multipart/form-data.

    Returns:
        Un resumen del proceso con el número de registros insertados y lista de errores.

    Raises:
        HTTPException:
            - 400: Formato inválido o errores de negocio.
            - 413: Si el archivo excede el límite definido en configuración.
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
) -> Dict[str, Any]:
    """Punto de acceso para consumo de datos con soporte para paginación y filtros.

    Args:
        skip: Offset para la consulta.
        limit: Cantidad de resultados por página.
        cups: Filtro opcional por punto de suministro.
        fecha_inicio: Filtro opcional de fecha desde.
        fecha_fin: Filtro opcional de fecha hasta.

    Returns:
        Estructura paginada con el conteo total y los registros encontrados.
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
async def get_lectura(
    id: str = Path(..., description="ID hexadecimal de MongoDB")
) -> Dict[str, Any]:
    """Recupera un documento individual tras validar el identificador.

    Args:
        id: El ID del documento a recuperar.

    Returns:
        El objeto de la lectura encontrada.

    Raises:
        HTTPException 404: Si el registro no existe o el ID no es válido.
    """
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
async def create_lectura(lectura: LecturaCSV) -> Dict[str, Any]:
    """Inserta una lectura individual validada por Pydantic.

    Args:
        lectura: Cuerpo de la petición con los datos de la lectura.

    Returns:
        El registro creado con su identificador de base de datos.
    """
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
async def update_lectura(id: str, lectura_data: LecturaUpdate) -> Dict[str, str]:
    """Aplica cambios atómicos a campos específicos de un registro.

    Args:
        id: ID del registro a modificar.
        lectura_data: Campos opcionales a actualizar.

    Returns:
        Mensaje de confirmación del estado de la operación.
    """
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
async def delete_lectura(id: str) -> None:
    """Ejecuta el borrado físico de un registro identificado por ID.

    Args:
        id: ID del documento a eliminar.
    """
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
) -> Dict[str, Any]:
    """Retorna analíticas procesadas (Consumo medio, total y conteo).

    Args:
        cups: Código CUPS a analizar (debe cumplir el patrón regex).

    Returns:
        Objeto con las métricas calculadas por el motor de base de datos.
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
