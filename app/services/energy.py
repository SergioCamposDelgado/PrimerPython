# app/services/energy.py
import io
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from pydantic import ValidationError

from app.models.lectura import LecturaCSV


class EnergyService:
    """
    Servicio especializado en el procesamiento y validación de datos energéticos.

    Encapsula la lógica de transformación (ETL ligero) utilizando Pandas para
    operaciones vectorizadas y Pydantic para el cumplimiento de reglas de negocio.
    """

    @staticmethod
    async def process_csv(
        contents: bytes,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Orquesta el flujo de ingesta: Parsing -> Limpieza -> Validación.

        Args:
            contents (bytes): Contenido binario del archivo CSV.

        Returns:
            Tuple: Contiene dos listas; la primera con registros listos para BSON (MongoDB)
                    y la segunda con el reporte de errores por fila.

        Raises:
            ValueError: Si el archivo no cumple con una estructura CSV legible.
        """

        # --- PASO 1: INGESTIÓN Y PARSING ---
        try:
            # Se utiliza io.BytesIO para procesar el archivo en memoria (RAM)
            # evitando latencias de escritura/lectura en disco físico.
            df = pd.read_csv(io.BytesIO(contents))
        except Exception as e:
            # Abortamos si el motor de Pandas no puede identificar una estructura tabular.
            raise ValueError("Estructura de archivo ilegible o corrupta.") from e

        # Early return si el set de datos no contiene registros para optimizar recursos.
        if df.empty:
            return [], []

        # --- PASO 2: NORMALIZACIÓN VECTORIZADA (Pandas) ---

        # Limpieza de ruido: Se eliminan espacios en blanco laterales en campos de texto (Trim).
        df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)

        # Compatibilidad MongoDB: Convertimos NaNs (Not a Number) a None.
        # Esto asegura que los valores nulos se guarden como 'null' en BSON y no rompan el driver.
        df = df.astype(object).replace({np.nan: None})

        validos = []
        errores = []

        # --- PASO 3: VALIDACIÓN SEMÁNTICA Y MAPEADO ---

        # Convertimos el DataFrame a una lista de diccionarios para validación individual.
        for i, row in enumerate(df.to_dict(orient="records")):
            try:
                # Sanitización de claves: Aseguramos que todas las llaves sean strings.
                clean_row = {str(k): v for k, v in row.items()}

                # Validación atómica: Si falla una fila, capturamos el error y seguimos.
                # Esto permite procesamientos parciales de archivos grandes.
                lectura_obj = LecturaCSV(**clean_row)

                # Almacenamos el diccionario validado listo para la capa de persistencia.
                validos.append(lectura_obj.model_dump())

            except ValidationError as e:
                # Reporte de errores: i+2 compensa el índice 0 y la fila de cabecera del CSV.
                errores.append({"fila": i + 2, "error": e.errors()})

        return validos, errores
