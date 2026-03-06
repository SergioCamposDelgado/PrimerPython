from dataclasses import dataclass
from datetime import datetime


@dataclass
class Medidor:
    uid: str  # Identificador único
    valor: float  # El dato numérico
    timestamp: datetime  # Fecha y hora
    es_valido: bool = True

    def __repr__(self):
        return f"UID:'{self.uid}', Valor: {self.valor}, Timestamp: '{self.timestamp}', Es_valido: {self.es_valido}"


# Creación de una instancia
mi_medidor = Medidor(uid="CTR-001", valor=120.5, timestamp=datetime.now())

# Prueba esto: intenta escribir 'mi_medidor.' y verás cómo
# VS Code te sugiere exactamente las propiedades disponibles.

mi_medidor.valor = float("150.75")  # Actualizando el valor

print(mi_medidor)  # Imprime la instancia con sus propiedades actualizadas
