# app/models/lectura.py
from pydantic import BaseModel, Field


class LecturaCSV(BaseModel):
    """
    Esquema de validación de datos (DTO) para la ingesta de registros energéticos.

    Este modelo actúa como el primer filtro de integridad semántica tras el
    procesamiento del CSV, asegurando que cada fila cumpla con los estándares
    técnicos del sector eléctrico antes de su persistencia en MongoDB.
    """

    # cups: Identificador único de punto de suministro.
    # Formato estándar español: 2 letras + 16 números + 2 letras.
    cups: str = Field(
        ...,
        pattern=r"^[A-Z]{2}\d{16}[A-Z]{2}$",
        description="Código Universal del Punto de Suministro (Formato normalizado)",
    )

    # consumo: Valor de energía activa.
    # gt=0: Regla de negocio que impide registros negativos o nulos (lecturas erróneas).
    consumo: float = Field(
        ..., gt=0, description="Consumo energético en kWh (Debe ser un valor positivo)"
    )

    # id_contador: Identificador numérico del hardware de medida.
    # ge=1: Asegura que el ID sea un entero positivo válido.
    id_contador: int = Field(
        ..., ge=1, description="Identificador único del contador físico asociado"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "cups": "ES1234567890123456AA",
                "consumo": 150.55,
                "id_contador": 101,
            }
        }
    }
