from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LecturaCSV(BaseModel):
    """
    Modelo de Validación (Data Transfer Object) para registros energéticos.

    Esta clase actúa como el primer filtro de seguridad y calidad de datos.
    Transforma errores de casting técnicos en mensajes comprensibles para el usuario,
    asegurando que solo información coherente sea procesada por el servicio.
    """

    # cups: Código Unificado de Punto de Suministro.
    cups: str = Field(
        ..., description="Identificador único del punto de suministro eléctrico."
    )

    # consumo: Magnitud física en kilovatios hora (kWh).
    consumo: float = Field(
        ..., description="Valor de energía activa consumida en el periodo.", gt=0
    )

    # id_contador: Serial único del dispositivo físico de medida.
    id_contador: int = Field(
        ..., description="ID numérico asociado al contador físico."
    )

    # fecha: Marca temporal de la lectura.
    # Fundamental para series temporales y cálculos analíticos por periodos.
    fecha: datetime = Field(
        ..., description="Fecha y hora exacta de la lectura (formato ISO 8601)."
    )

    # --- VALIDACIONES DE REGLAS DE NEGOCIO (LÓGICA SEMÁNTICA) ---

    @field_validator("cups")
    @classmethod
    def validate_cups_format(cls, v: str):
        """
        Valida que el CUPS siga el estándar de formato español y lo normaliza a mayúsculas.
        """
        import re

        # Normalizamos a mayúsculas para evitar errores por diferencia de caja
        v = v.upper()
        pattern = r"^[A-Z]{2}\d{16}[A-Z]{2}$"
        if not re.match(pattern, v):
            raise ValueError(
                "CUPS inválido. Debe tener 2 letras, 16 números y 2 letras finales (ej: ES...AA)."
            )
        return v

    @field_validator("consumo")
    @classmethod
    def validate_consumo_positivo(cls, v: float):
        """
        Garantiza que el valor de consumo sea físicamente posible (> 0).
        """
        if v <= 0:
            raise ValueError("El consumo debe ser un valor positivo superior a 0 kWh.")
        return v

    @field_validator("id_contador")
    @classmethod
    def validate_id_contador(cls, v: int):
        """
        Valida que el ID del hardware sea un entero positivo.
        """
        if v < 1:
            raise ValueError(
                "El ID del contador debe ser un número entero válido (mínimo 1)."
            )
        return v

    # --- CONFIGURACIÓN DEL MODELO Y DOCUMENTACIÓN ---

    # En Pydantic v2 se recomienda usar ConfigDict o la nueva estructura de model_config
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "cups": "ES1234567890123456AA",
                "consumo": 150.55,
                "id_contador": 101,
                "fecha": "2024-03-20T10:00:00",
            }
        }
    )


class LecturaUpdate(BaseModel):
    """
    Modelo para actualizaciones parciales (PATCH).

    Permite modificar campos individuales sin necesidad de enviar el objeto completo.
    La fecha también es opcional aquí por si se requiere corregir un error de registro.
    """

    consumo: Optional[float] = Field(None, gt=0)
    id_contador: Optional[int] = Field(None, gt=0)
    fecha: Optional[datetime] = Field(None)

    @field_validator("consumo", "id_contador", mode="before")
    @classmethod
    def prevent_nulls(cls, v, info):
        if v is None:
            # Si el campo viene explícitamente como null, lanzamos error
            raise ValueError(f"El campo {info.field_name} no puede ser nulo")
        return v
