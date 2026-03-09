# app/services/energy.py

import io
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from pydantic import ValidationError

from app.models.lectura import LecturaCSV


class EnergyService:
    """
    Servicio de orquestación para el procesamiento y validación de datos energéticos.

    Esta clase centraliza la lógica de ETL (Extract, Transform, Load) a nivel de aplicación.
    Implementa una estrategia de 'Validación Tolerante a Fallos' que permite procesar
    archivos parcialmente correctos, informando al usuario de los errores fila por fila
    sin detener la ejecución total.
    """

    @staticmethod
    async def process_csv(
        contents: bytes,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Transforma contenido binario CSV en colecciones de objetos validados y errores.

        Flujo de trabajo:
        1. Parsing: Carga binaria mediante Pandas.
        2. Normalización: Limpieza de tipos y manejo de valores nulos (NaN).
        3. Validación Semántica: Cruce de cada fila contra el modelo Pydantic.
        4. Sanitización de Mensajes: Refactorización de errores técnicos a lenguaje de negocio.

        Args:
            contents (bytes): Contenido crudo del archivo subido.

        Returns:
            Tuple[List[Dict], List[Dict]]:
                - Primera lista: Registros listos para insertar en MongoDB.
                - Segunda lista: Reporte detallado de filas descartadas y sus motivos.
        """

        # --- PASO 1: PARSING (EXTRACCIÓN) ---
        try:
            # Se utiliza io.BytesIO para tratar los bytes en memoria como un flujo de archivos.
            # Pandas gestiona de forma eficiente la carga y detección de columnas.
            df = pd.read_csv(io.BytesIO(contents))
        except Exception as e:
            # Captura errores de estructura (ej: archivo mal formado o codificación errónea)
            raise ValueError(
                "El archivo no tiene un formato CSV válido o está corrupto."
            ) from e

        # Salida temprana si el archivo no contiene datos
        if df.empty:
            return [], []

        # --- PASO 2: NORMALIZACIÓN (TRANSFORMACIÓN INICIAL) ---
        # Limpieza de espacios en blanco en strings para evitar errores de validación por "spaces"
        df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)

        # Sustitución de valores NaN (Not a Number) de Numpy por None (null en Python/JSON)
        # Esto es vital para que Pydantic pueda procesar campos opcionales o faltantes.
        df = df.replace({np.nan: None})

        validos = []
        errores = []

        # --- PASO 3: VALIDACIÓN Y LIMPIEZA DE MENSAJES (CALIDAD DE DATOS) ---
        # Convertimos el DataFrame a una lista de diccionarios para iteración fila a fila
        for i, row in enumerate(df.to_dict(orient="records")):
            try:
                # Aseguramos que las claves sean strings y disparamos la validación del modelo
                clean_row = {str(k): v for k, v in row.items()}
                lectura_obj = LecturaCSV(**clean_row)

                # Si pasa la validación, se añade a la lista de inserción masiva
                validos.append(lectura_obj.model_dump())

            except ValidationError as e:
                # Gestión de errores de validación de Pydantic
                detalles_limpios = []
                for err in e.errors():
                    # PASO 4: SANITIZACIÓN UX
                    # Pydantic v2 prefija los errores personalizados con 'Value error, '.
                    # Limpiamos el string para que el usuario reciba un mensaje directo y limpio.
                    msg_original = err["msg"]
                    msg_final = msg_original.replace("Value error, ", "")

                    # Identificamos el campo exacto que falló (ej: 'cups' o 'consumo')
                    campo = err["loc"][0]
                    detalles_limpios.append(f"Campo '{campo}': {msg_final}")

                # Construcción del reporte de error para la tabla del Frontend
                errores.append(
                    {
                        # Calculamos la línea real del archivo (Índice + Header + Base 1)
                        "fila": i + 2,
                        "cups": row.get("cups", "N/A"),
                        "detalles": detalles_limpios,
                    }
                )

        return validos, errores
