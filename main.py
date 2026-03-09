import re

from fastapi import FastAPI, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, field_validator

app = FastAPI(title="Gestor de Puntos de Suministro")

# Configuración de MongoDB
MONGO_URL = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_URL)
db = client["gestion_energia"]


# --- MODELO DE DATOS CON VALIDACIÓN ---
class ClienteCUPS(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=100)
    # 1. Validación por Regex: ES + 16 números + 2 letras
    cups: str = Field(..., pattern=r"^[A-Z]{2}\d{16}[A-Z]{2}$")
    potencia_contratada: float = Field(..., gt=0, le=15.0)  # Potencia normal en hogares

    @field_validator("cups")
    @classmethod
    def cups_debe_ser_español(cls, v: str) -> str:
        # Forzamos mayúsculas y limpiamos espacios
        v = v.upper().strip()

        # 2. Validación lógica extra
        if not v.startswith("ES"):
            raise ValueError("El CUPS debe comenzar con el prefijo de España (ES)")

        # Aquí podrías añadir lógica de dígitos de control si fuera necesario
        return v


# --- ENDPOINTS ---


@app.post("/clientes/", status_code=status.HTTP_201_CREATED)
async def registrar_cliente(cliente: ClienteCUPS):
    # Comprobar si el CUPS ya existe en la DB (Integridad)
    existe = await db.clientes.find_one({"cups": cliente.cups})
    if existe:
        raise HTTPException(
            status_code=400, detail="Este CUPS ya está registrado en el sistema"
        )

    # Insertar en MongoDB
    nuevo_cliente = cliente.model_dump()
    result = await db.clientes.insert_one(nuevo_cliente)

    return {"id": str(result.inserted_id), "message": "Cliente dado de alta"}


@app.get("/clientes/{cups}")
async def obtener_cliente(cups: str):
    # Validamos el cups también en el GET mediante lógica simple
    cliente = await db.clientes.find_one({"cups": cups.upper()})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Mongo devuelve _id como ObjectId, hay que convertirlo a string para JSON
    cliente["_id"] = str(cliente["_id"])
    return cliente
