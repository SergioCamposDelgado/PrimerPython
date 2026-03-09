# backend/services/energy.py

import io
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from bson import ObjectId
from pydantic import ValidationError

from backend.db.mongodb import db_client
from backend.models.lectura import LecturaCSV, LecturaUpdate


class EnergyService:
    """
    Servicio de orquestación para el procesamiento, validación y persistencia
    de datos energéticos.

    Esta clase centraliza la lógica de negocio y el acceso a datos (Data Access),
    permitiendo que los endpoints sean 'thin' (delgados) y solo gestionen HTTP.
    """

    # --- LÓGICA DE PROCESAMIENTO (ETL) ---

    @staticmethod
    async def process_csv(
        contents: bytes,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Transforma contenido binario CSV en colecciones de objetos validados y errores.
        """
        try:
            df = pd.read_csv(io.BytesIO(contents), parse_dates=["fecha"])
        except Exception as e:
            raise ValueError(
                "El archivo no tiene un formato CSV válido o falta la columna 'fecha'."
            ) from e

        if df.empty:
            return [], []

        # Normalización inicial
        df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
        df = df.replace({np.nan: None})

        validos, errores = [], []

        for i, row in enumerate(df.to_dict(orient="records")):
            try:
                clean_row = {str(k): v for k, v in row.items()}
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
                        "cups": row.get("cups", "N/A"),
                        "detalles": detalles_limpios,
                    }
                )

        return validos, errores

    # --- LÓGICA DE CONSULTA (READ) ---

    @staticmethod
    async def get_paginated_lecturas(
        skip: int,
        limit: int,
        cups: Optional[str] = None,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Construye la query dinámica y recupera lecturas paginadas desde MongoDB.
        """
        db = db_client.db
        if db is None:
            raise ConnectionError("Base de datos no disponible")

        # Construcción de la Query de MongoDB (Encapsulada aquí)
        query: Dict[str, Any] = {}
        if cups:
            query["cups"] = cups

        if fecha_inicio or fecha_fin:
            query["fecha"] = {}
            if fecha_inicio:
                query["fecha"]["$gte"] = fecha_inicio
            if fecha_fin:
                query["fecha"]["$lte"] = fecha_fin

        # Ejecución
        cursor = db.lecturas.find(query).sort("fecha", -1).skip(skip).limit(limit)
        lecturas = await cursor.to_list(length=limit)

        # Sanitización de IDs (Transformación de datos)
        for item in lecturas:
            item["_id"] = str(item["_id"])

        total = await db.lecturas.count_documents(query)

        return {"total_records": total, "skip": skip, "limit": limit, "data": lecturas}

    @staticmethod
    async def get_lectura_by_id(id_str: str) -> Optional[Dict[str, Any]]:
        """Busca una lectura única por su ID de MongoDB."""
        db = db_client.db
        if db is None or not ObjectId.is_valid(id_str):
            return None

        lectura = await db.lecturas.find_one({"_id": ObjectId(id_str)})
        if lectura:
            lectura["_id"] = str(lectura["_id"])
        return lectura

    # --- LÓGICA DE PERSISTENCIA (CUD) ---

    @staticmethod
    async def create_single_lectura(data: LecturaCSV) -> Dict[str, Any]:
        """Crea un registro individual en la base de datos."""
        db = db_client.db
        if db is None:
            raise ConnectionError("DB fail")

        doc = data.model_dump()
        result = await db.lecturas.insert_one(doc)
        return {"id": str(result.inserted_id), **doc}

    @staticmethod
    async def update_lectura_partial(id_str: str, update_data: LecturaUpdate) -> bool:
        """Actualiza campos específicos de una lectura."""
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
        """Elimina un registro de la base de datos."""
        db = db_client.db
        if db is None or not ObjectId.is_valid(id_str):
            return False

        result = await db.lecturas.delete_one({"_id": ObjectId(id_str)})
        return result.deleted_count > 0

    # --- LÓGICA ANALÍTICA ---

    @staticmethod
    async def get_cups_stats(cups: str) -> Optional[Dict[str, Any]]:
        """Ejecuta el pipeline de agregación para métricas de un CUPS."""
        db = db_client.db
        if db is None:
            raise ConnectionError("DB fail")

        pipeline = [
            {"$match": {"cups": cups}},
            {
                "$group": {
                    "_id": "$cups",
                    "consumo_total": {"$sum": "$consumo"},
                    "consumo_medio": {"$avg": "$consumo"},
                    "total_lecturas": {"$sum": 1},
                }
            },
        ]

        cursor = db.lecturas.aggregate(pipeline)
        result = await cursor.to_list(length=1)
        return result[0] if result else None
