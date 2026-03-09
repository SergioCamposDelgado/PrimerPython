from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

# 1. Inicialización
app = FastAPI(title="API de Gestión Energética")
MONGO_URL = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_URL)
db = client["test"]


# 2. Modelo de Datos (Pydantic) - Valida lo que responde la API
class ReporteConsumo(BaseModel):
    cliente: str
    consumo_total: float
    pico_maximo: float
    promedio: float


# 3. El Endpoint (La URL que consultará el Frontend)
@app.get("/consumo/{uid_cliente}", response_model=ReporteConsumo)
async def get_consumo_reporte(uid_cliente: str):
    pipeline = [
        {"$match": {"cliente_id": uid_cliente}},
        {
            "$group": {
                "_id": "$cliente_id",
                "consumo_total": {"$sum": "$valor"},
                "lecturas_contadas": {"$sum": 1},
                "pico_maximo": {"$max": "$valor"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "cliente": "$_id",
                "consumo_total": 1,
                "pico_maximo": 1,
                "promedio": {"$divide": ["$consumo_total", "$lecturas_contadas"]},
            }
        },
    ]

    cursor = db.lecturas.aggregate(pipeline)
    resultado = await cursor.to_list(length=1)

    if not resultado:
        raise HTTPException(
            status_code=404, detail="Cliente no encontrado o sin lecturas"
        )

    return resultado[0]
