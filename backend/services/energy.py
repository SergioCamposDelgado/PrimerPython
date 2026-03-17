# backend/services/energy.py
"""Módulo de servicios para la gestión de energía.

Proporciona la lógica de orquestación para el procesamiento de archivos,
operaciones CRUD en MongoDB y generación de estadísticas analíticas.
"""

import io
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from bson import ObjectId
from db.mongodb import db_client
from models.lectura import LecturaCSV, LecturaUpdate
from pydantic import ValidationError
from utils.serializers import decode_mongo


class EnergyService:
    """Servicio de orquestación para el procesamiento y persistencia de datos.

    Esta clase implementa el patrón Service Layer para desacoplar la lógica de
    negocio de los controladores de la API (FastAPI). Gestiona el ciclo de vida
    de los datos energéticos desde su carga en CSV hasta su análisis.
    """

    @staticmethod
    async def process_csv(
        contents: bytes,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Realiza el proceso ETL (Extracción, Transformación y Lectura) de un CSV.

        Limpia los datos, valida cada fila contra el esquema `LecturaCSV` y
        separa los registros exitosos de los errores de validación.

        Args:
            contents: Contenido binario del archivo CSV cargado.

        Returns:
            Una tupla que contiene:
                - List[Dict]: Registros válidos listos para persistencia.
                - List[Dict]: Errores encontrados, incluyendo el número de fila y detalle.

        Raises:
            ValueError: Si el archivo no tiene un formato CSV válido o está corrupto.
        """
        try:
            df = pd.read_csv(io.BytesIO(contents))
        except Exception as e:
            raise ValueError("El archivo no tiene un formato CSV válido.") from e

        if df.empty:
            return [], []

        # Limpieza inicial: eliminación de espacios y manejo de nulos
        df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
        df = df.replace({np.nan: None})

        validos, errores = [], []
        records = df.to_dict(orient="records")

        for i, row in enumerate(records):
            try:
                clean_row: Dict[str, Any] = {str(k): v for k, v in row.items()}
                lectura_obj = LecturaCSV(**clean_row)
                validos.append(lectura_obj.model_dump())
            except ValidationError as e:
                detalles_limpios = []
                for err in e.errors():
                    msg_final = err["msg"].replace("Value error, ", "")
                    campo = err["loc"][0]
                    detalles_limpios.append(f"Campo '{campo}': {msg_final}")

                errores.append(
                    {
                        "fila": i + 2,
                        "cups": str(row.get("cups", "N/A")),
                        "detalles": detalles_limpios,
                    }
                )
            except Exception as ex:
                errores.append(
                    {
                        "fila": i + 2,
                        "cups": str(row.get("cups", "N/A")),
                        "detalles": [f"Error de estructura: {str(ex)}"],
                    }
                )

        return validos, errores

    @staticmethod
    async def get_paginated_lecturas(
        skip: int,
        limit: int,
        cups: Optional[str] = None,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Obtiene lecturas de la base de datos con soporte para paginación y filtros.

        Args:
            skip: Número de registros a omitir (offset).
            limit: Número máximo de registros a retornar.
            cups: Filtro opcional por código CUPS.
            fecha_inicio: Límite inferior de la marca temporal.
            fecha_fin: Límite superior de la marca temporal.

        Returns:
            Un diccionario con el total de registros, parámetros de paginación y la data.

        Raises:
            ConnectionError: Si la conexión a MongoDB no está activa.
        """
        db = db_client.db
        if db is None:
            raise ConnectionError("Base de datos no disponible")

        query: Dict[str, Any] = {}
        if cups:
            query["cups"] = cups

        if fecha_inicio or fecha_fin:
            query["fecha"] = {}
            if fecha_inicio:
                query["fecha"]["$gte"] = fecha_inicio
            if fecha_fin:
                query["fecha"]["$lte"] = fecha_fin

        cursor = db.lecturas.find(query).sort("fecha", -1).skip(skip).limit(limit)
        lecturas = await cursor.to_list(length=limit)
        total = await db.lecturas.count_documents(query)

        return {
            "total_records": total,
            "skip": skip,
            "limit": limit,
            "data": decode_mongo(lecturas),
        }

    @staticmethod
    async def get_lectura_by_id(id_str: str) -> Optional[Dict[str, Any]]:
        """Busca una lectura específica por su identificador único de MongoDB.

        Args:
            id_str: ID del documento en formato string hexadecimal.

        Returns:
            El documento serializado si existe, None en caso contrario o si el ID es inválido.
        """
        db = db_client.db
        if db is None or not ObjectId.is_valid(id_str):
            return None

        lectura = await db.lecturas.find_one({"_id": ObjectId(id_str)})
        return decode_mongo(lectura) if lectura else None

    @staticmethod
    async def create_single_lectura(data: LecturaCSV) -> Dict[str, Any]:
        """Persiste una nueva lectura en la colección.

        Args:
            data: Objeto de datos validado mediante el esquema LecturaCSV.

        Returns:
            El documento recién creado incluyendo su ID generado.

        Raises:
            ConnectionError: Si falla la comunicación con el clúster.
        """
        db = db_client.db
        if db is None:
            raise ConnectionError("Fallo de conexión con la base de datos")

        doc = data.model_dump()
        result = await db.lecturas.insert_one(doc)

        doc["_id"] = result.inserted_id
        return decode_mongo(doc)

    @staticmethod
    async def update_lectura_partial(id_str: str, update_data: LecturaUpdate) -> bool:
        """Actualiza campos específicos de un registro existente (PATCH).

        Args:
            id_str: ID del registro a modificar.
            update_data: Esquema con los campos opcionales a actualizar.

        Returns:
            True si el registro fue encontrado y modificado, False en caso contrario.
        """
        db = db_client.db
        if db is None or not ObjectId.is_valid(id_str):
            return False

        fields = {k: v for k, v in update_data.model_dump(exclude_unset=True).items()}
        if not fields:
            return False

        result = await db.lecturas.update_one(
            {"_id": ObjectId(id_str)}, {"$set": fields}
        )
        return result.matched_count > 0

    @staticmethod
    async def delete_lectura_by_id(id_str: str) -> bool:
        """Elimina un registro de lectura de forma permanente.

        Args:
            id_str: ID del documento a eliminar.

        Returns:
            True si la operación de borrado fue exitosa.
        """
        db = db_client.db
        if db is None or not ObjectId.is_valid(id_str):
            return False

        result = await db.lecturas.delete_one({"_id": ObjectId(id_str)})
        return result.deleted_count > 0

    @staticmethod
    async def get_cups_stats(cups: str) -> Optional[Dict[str, Any]]:
        """Genera agregaciones estadísticas para un punto de suministro específico.

        Utiliza el aggregation framework de MongoDB para calcular totales y promedios.

        Args:
            cups: Identificador del suministro a analizar.

        Returns:
            Diccionario con estadísticas (consumo_total, medio, etc.) o None si no hay datos.
        """
        db = db_client.db
        if db is None:
            raise ConnectionError("Base de datos no disponible")

        pipeline = [
            {"$match": {"cups": cups}},
            {"$sort": {"fecha": 1}},
            {
                "$group": {
                    "_id": "$cups",
                    "consumo_total": {"$sum": "$consumo"},
                    "consumo_medio": {"$avg": "$consumo"},
                    "total_lecturas": {"$sum": 1},
                    "lecturas": {"$push": {"fecha": "$fecha", "consumo": "$consumo"}},
                }
            },
        ]

        cursor = db.lecturas.aggregate(pipeline)
        result = await cursor.to_list(length=1)

        return decode_mongo(result[0]) if result else None
