# app/models/lectura.py

from pydantic import BaseModel, Field, field_validator


class LecturaCSV(BaseModel):
    """
    Modelo de Validación (Data Transfer Object) para registros energéticos.

    Esta clase actúa como el primer filtro de seguridad y calidad de datos.
    Transforma errores de casting técnicos en mensajes comprensibles para el usuario,
    asegurando que solo información coherente sea procesada por el servicio.
    """

    # cups: Código Unificado de Punto de Suministro (Identificador único de contrato).
    # Se utiliza Field(...) para marcarlo como obligatorio.
    cups: str = Field(
        ..., description="Identificador único del punto de suministro eléctrico."
    )

    # consumo: Magnitud física en kilovatios hora (kWh).
    consumo: float = Field(
        ..., description="Valor de energía activa consumida en el periodo."
    )

    # id_contador: Serial único del dispositivo físico de medida.
    id_contador: int = Field(
        ..., description="ID numérico asociado al contador físico."
    )

    # --- VALIDACIONES DE REGLAS DE NEGOCIO (LOGICA SEMÁNTICA) ---

    @field_validator("cups")
    @classmethod
    def validate_cups_format(cls, v: str):
        """
        Valida que el CUPS siga el estándar de formato español.

        Regla: 2 caracteres iniciales (ISO país), 16 dígitos numéricos
        y 2 caracteres finales de control.
        """
        import re

        # Regex específica para el formato español: ES + 16 dígitos + 2 letras
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
        Garantiza que el valor de consumo sea físicamente posible.

        Regla: No se permiten consumos negativos o iguales a cero
        para evitar datos ruidosos o lecturas erróneas.
        """
        if v <= 0:
            raise ValueError("El consumo debe ser un valor positivo superior a 0 kWh.")
        return v

    @field_validator("id_contador")
    @classmethod
    def validate_id_contador(cls, v: int):
        """
        Valida la integridad del identificador del hardware.

        Regla: El ID debe ser un entero positivo (ID > 0).
        """
        if v < 1:
            raise ValueError(
                "El ID del contador debe ser un número entero válido (mínimo 1)."
            )
        return v

    # --- CONFIGURACIÓN DEL MODELO Y DOCUMENTACIÓN ---

    model_config = {
        # Configuración para la generación automática de la documentación interactiva (Swagger/OpenAPI)
        "json_schema_extra": {
            "example": {
                "cups": "ES1234567890123456AA",
                "consumo": 150.55,
                "id_contador": 101,
            }
        }
    }
