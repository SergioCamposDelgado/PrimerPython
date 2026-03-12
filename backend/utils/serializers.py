# backend/utils/serializers.py
"""Módulo de utilidades para la serialización de datos.

Proporciona herramientas para transformar tipos de datos específicos de MongoDB
en formatos compatibles con el estándar JSON, asegurando la interoperabilidad
con el frontend.
"""

from typing import Any


def decode_mongo(data: Any) -> Any:
    """Convierte recursivamente objetos de MongoDB a tipos serializables por JSON.

    Esta función procesa diccionarios y listas buscando objetos tipo `ObjectId`
    (específicamente la clave `_id`) para transformarlos en strings. Es esencial
    para evitar errores de serialización en los endpoints de FastAPI.

    Args:
        data: El objeto o estructura de datos proveniente de MongoDB que se
            desea convertir. Puede ser un `dict`, una `list` o un valor primitivo.

    Returns:
        Una copia de la estructura de datos original donde todos los `ObjectId`
        han sido convertidos a cadenas de texto.

    Example:
        >>> doc = {"_id": ObjectId("65f..."), "valor": 10}
        >>> decode_mongo(doc)
        {"_id": "65f...", "valor": 10}

    Note:
        La función realiza una copia profunda de los diccionarios para evitar
        efectos secundarios por modificación de referencias originales.
    """
    if isinstance(data, list):
        return [decode_mongo(item) for item in data]

    if isinstance(data, dict):
        # Clonamos el dict para no modificar el original por referencia
        new_dict = {}
        for k, v in data.items():
            if k == "_id":
                # Conversión explícita del identificador de MongoDB a string
                new_dict[k] = str(v)
            else:
                # Llamada recursiva para procesar diccionarios o listas anidadas
                new_dict[k] = decode_mongo(v)
        return new_dict

    return data
