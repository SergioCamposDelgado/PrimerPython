# backend/models/lectura.py
"""Módulo de esquemas de datos para las lecturas energéticas.

Define los modelos de validación (DTOs) utilizando Pydantic para asegurar
la integridad de los datos de entrada, tanto en cargas masivas (CSV) como
en actualizaciones puntuales.
"""

import re
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LecturaCSV(BaseModel):
    """Modelo de Validación (DTO) para registros energéticos.

    Esta clase actúa como el primer filtro de seguridad y calidad de datos.
    Transforma errores de casting técnicos en mensajes comprensibles para el usuario,
    asegurando que solo información coherente sea procesada por el servicio.

    Attributes:
        cups (str): Código Unificado de Punto de Suministro (Estándar Español).
        consumo (float): Valor de energía activa consumida en kWh (debe ser > 0).
        id_contador (int): Identificador numérico único del hardware de medida.
        fecha (datetime): Marca temporal de la lectura en formato ISO 8601.
    """

    cups: str = Field(
        ..., description="Identificador único del punto de suministro eléctrico."
    )
    consumo: float = Field(
        ..., description="Valor de energía activa consumida en el periodo.", gt=0
    )
    id_contador: int = Field(
        ..., description="ID numérico asociado al contador físico."
    )
    fecha: datetime = Field(
        ..., description="Fecha y hora exacta de la lectura (formato ISO 8601)."
    )

    @field_validator("cups")
    @classmethod
    def validate_cups_format(cls, v: str) -> str:
        """Valida y normaliza el formato del CUPS.

        Args:
            v: El string del CUPS a validar.

        Returns:
            El CUPS normalizado en mayúsculas.

        Raises:
            ValueError: Si el formato no cumple con el estándar español (2 letras, 16 números, 2 letras).
        """
        v = v.upper()
        pattern = r"^[A-Z]{2}\d{16}[A-Z]{2}$"
        if not re.match(pattern, v):
            raise ValueError(
                "CUPS inválido. Debe tener 2 letras, 16 números y 2 letras finales (ej: ES...AA)."
            )
        return v

    @field_validator("consumo")
    @classmethod
    def validate_consumo_positivo(cls, v: float) -> float:
        """Garantiza que el valor de consumo sea físicamente posible.

        Args:
            v: Valor numérico del consumo.

        Returns:
            El valor validado si es superior a cero.

        Raises:
            ValueError: Si el consumo es menor o igual a 0.
        """
        if v <= 0:
            raise ValueError("El consumo debe ser un valor positivo superior a 0 kWh.")
        return v

    @field_validator("id_contador")
    @classmethod
    def validate_id_contador(cls, v: int) -> int:
        """Valida que el ID del hardware sea un entero positivo.

        Args:
            v: El identificador del contador.

        Returns:
            El ID validado.

        Raises:
            ValueError: Si el ID es menor a 1.
        """
        if v < 1:
            raise ValueError(
                "El ID del contador debe ser un número entero válido (mínimo 1)."
            )
        return v

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
    """Modelo para actualizaciones parciales (PATCH).

    Permite modificar campos individuales sin necesidad de enviar el objeto completo.
    Todos los campos son opcionales para permitir la flexibilidad del método PATCH.

    Attributes:
        consumo (Optional[float]): Nuevo valor de consumo (opcional).
        id_contador (Optional[int]): Nuevo ID de contador (opcional).
        fecha (Optional[datetime]): Nueva fecha de registro (opcional).
    """

    consumo: Optional[float] = Field(None, gt=0)
    id_contador: Optional[int] = Field(None, gt=0)
    fecha: Optional[datetime] = Field(None)

    @field_validator("consumo", "id_contador", mode="before")
    @classmethod
    def prevent_nulls(cls, v: Any, info: Any) -> Any:
        """Evita el envío de nulos explícitos en campos obligatorios.

        Args:
            v: Valor recibido.
            info: Metadatos del campo que se está validando.

        Returns:
            El valor original si no es None.

        Raises:
            ValueError: Si se intenta asignar un valor nulo.
        """
        if v is None:
            raise ValueError(f"El campo {info.field_name} no puede ser nulo")
        return v
