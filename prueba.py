import numpy as np
import pandas as pd

# Creamos 2 días de datos cada 15 min (96 intervalos por día, total 192)
index = pd.date_range("2024-01-01", periods=192, freq="15min")
df = pd.DataFrame({"consumo_kw": np.random.uniform(1, 10, size=192)}, index=index)

# 1. Pasar de 15 min a 1 hora (Suma)
consumo_horario = df.resample("h").sum()

# 2. Obtener el máximo consumo de cada día
pico_diario = df.resample("D").max()

# 3. Operación vectorizada: Supongamos un precio fijo (sin bucles)
precio_kwh = 0.15
df["coste_estimado"] = df["consumo_kw"] * precio_kwh

# 4. Filtrar datos: Consumos mayores a 5 kW
consumo_alto = df[df["consumo_kw"] > 5]
print("Consumo horario (suma):")
print(consumo_horario.head())
print("\nPico diario (máximo):")
print(pico_diario.head())
print("\nConsumo alto (>5 kW):")
print(consumo_alto.head())
