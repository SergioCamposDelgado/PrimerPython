import io
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from bson import ObjectId
from pydantic import ValidationError

from backend.db.mongodb import db_client
from backend.models.lectura import LecturaCSV, LecturaUpdate
from backend.utils.serializers import decode_mongo


class EnergyService:
    """
    Servicio de orquestación para el procesamiento, validación y persistencia
    de datos energéticos (FARM Stack).
    """

    # --- LÓGICA DE PROCESAMIENTO (ETL) ---

    @staticmethod
    async def process_csv(
        contents: bytes,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        try:
            df = pd.read_csv(io.BytesIO(contents))
        except Exception as e:
            raise ValueError("El archivo no tiene un formato CSV válido.") from e

        if df.empty:
            return [], []

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

    # --- LÓGICA DE CONSULTA (READ) ---

    @staticmethod
    async def get_paginated_lecturas(
        skip: int,
        limit: int,
        cups: Optional[str] = None,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None,
    ) -> Dict[str, Any]:
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

        # Aplicamos decode_mongo a la lista de resultados
        return {
            "total_records": total,
            "skip": skip,
            "limit": limit,
            "data": decode_mongo(lecturas),
        }

    @staticmethod
    async def get_lectura_by_id(id_str: str) -> Optional[Dict[str, Any]]:
        db = db_client.db
        if db is None or not ObjectId.is_valid(id_str):
            return None

        lectura = await db.lecturas.find_one({"_id": ObjectId(id_str)})
        # El serializador se encarga de convertir el _id
        return decode_mongo(lectura) if lectura else None

    # --- LÓGICA DE PERSISTENCIA (CUD) ---

    @staticmethod
    async def create_single_lectura(data: LecturaCSV) -> Dict[str, Any]:
        db = db_client.db
        if db is None:
            raise ConnectionError("Fallo de conexión con la base de datos")

        doc = data.model_dump()
        result = await db.lecturas.insert_one(doc)

        # Seteamos el ID generado y limpiamos para JSON
        doc["_id"] = result.inserted_id
        return decode_mongo(doc)

    @staticmethod
    async def update_lectura_partial(id_str: str, update_data: LecturaUpdate) -> bool:
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
        db = db_client.db
        if db is None or not ObjectId.is_valid(id_str):
            return False

        result = await db.lecturas.delete_one({"_id": ObjectId(id_str)})
        return result.deleted_count > 0

    # --- LÓGICA ANALÍTICA ---

    @staticmethod
    async def get_cups_stats(cups: str) -> Optional[Dict[str, Any]]:
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
    
        # decode_mongo se encargará de serializar los datetime de las lecturas
        return decode_mongo(result[0]) if result else None
