import asyncio
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient

# 1. Configuración de la conexión
MONGO_URL = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_URL)
db = client["test"]


async def crear_sistema_medicion():
    # --- PASO 1: Crear el Cliente (Documento con Subdocumentos) ---
    cliente_data = {
        "uid": "CTR-001",
        "nombre": "Energy Corp",
        "zona": "Norte",
        "contrato": {"tarifa": "2.0TD", "potencia_kw": 5.5, "cups": "ES000123456789"},
        "activo": True,
    }

    # Usamos upsert=True para que si ya existe, lo actualice en lugar de duplicar
    await db.clientes.update_one(
        {"uid": "CTR-001"}, {"$set": cliente_data}, upsert=True
    )
    print("Cliente creado o actualizado.")

    # --- PASO 2: Crear Lecturas (Documentos Referenciados) ---
    # Simulamos datos que vienen de un Medidor (Dataclass) o Pandas
    lecturas_batch = [
        {
            "cliente_id": "CTR-001",  # Referencia manual (FK)
            "timestamp": datetime(2024, 1, 1, 10, 0),
            "valor": 12.5,
            "unidad": "kWh",
        },
        {
            "cliente_id": "CTR-001",
            "timestamp": datetime(2024, 1, 1, 11, 0),
            "valor": 14.2,
            "unidad": "kWh",
        },
    ]

    # Inserción masiva (Mucho más rápido que uno a uno)
    result = await db.lecturas.insert_many(lecturas_batch)
    print(f"{len(result.inserted_ids)} lecturas insertadas.")

    # --- PASO 3: Consulta con Lookup ---
    pipeline = [
        {"$match": {"uid": "CTR-001"}},
        {
            "$lookup": {
                "from": "lecturas",
                "localField": "uid",
                "foreignField": "cliente_id",
                "as": "historial_lecturas",
            }
        },
    ]

    cursor = db.clientes.aggregate(pipeline)
    async for doc in cursor:
        print(
            f"\nCliente: {doc['nombre']} - Lecturas encontradas: {len(doc['historial_lecturas'])}"
        )


async def calcular_consumo_total(uid_cliente: str):
    pipeline = [
        # Paso 1: Filtrar
        {"$match": {"cliente_id": uid_cliente}},
        # Paso 2: Agrupar
        {
            "$group": {
                "_id": "$cliente_id",  # Por qué campo agrupamos
                "consumo_total": {
                    "$sum": "$valor"
                },  # Operación de suma sobre el campo 'valor'
                "lecturas_contadas": {"$sum": 1},  # Contador de registros
                "pico_maximo": {"$max": "$valor"},
            }
        },
        # Paso 3: Formatear
        {
            "$project": {
                "_id": 0,  # No mostrar el ID interno de Mongo
                "cliente": "$_id",
                "consumo_total": 1,
                "pico_maximo": 1,
                "promedio": {"$divide": ["$consumo_total", "$lecturas_contadas"]},
            }
        },
    ]

    cursor = db.lecturas.aggregate(pipeline)
    resultado = await cursor.to_list(length=1)

    if resultado:
        print("\nReporte de Consumo desde MongoDB:")
        print(resultado[0])


async def main():
    # Ejecutamos ambas tareas dentro del mismo bucle
    await crear_sistema_medicion()
    await calcular_consumo_total("CTR-001")

    # Es buena práctica cerrar la conexión al terminar scripts de prueba
    client.close()


if __name__ == "__main__":
    # Solo llamamos a asyncio.run una vez
    asyncio.run(main())
