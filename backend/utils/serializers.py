# backend/utils/serializers.py
from typing import Any


def decode_mongo(data: Any) -> Any:
    """
    Convierte de forma recursiva objetos de MongoDB (como ObjectId)
    en tipos serializables por JSON (strings).
    """
    if isinstance(data, list):
        return [decode_mongo(item) for item in data]

    if isinstance(data, dict):
        # Clonamos el dict para no modificar el original por referencia
        new_dict = {}
        for k, v in data.items():
            if k == "_id":
                new_dict[k] = str(v)
            else:
                new_dict[k] = decode_mongo(v)
        return new_dict

    return data
