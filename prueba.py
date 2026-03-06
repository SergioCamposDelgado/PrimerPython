import numpy as np
import pandas as pd

data = [10.5, -2.0, 15.8, None, 22.1, -5.0, 18.0]
df = pd.DataFrame(data, columns=["Valores"])

# 1. Calculamos la media de los valores que NO son nulos
media_valida = df["Valores"].mean()

# 2. Aplicamos la limpieza en cadena (Method Chaining)
# Primero quitamos negativos con clip, luego llenamos nulos con la media calculada
df["lectura_limpia"] = df["Valores"].clip(lower=0).fillna(media_valida)

print(f"Media utilizada para nulos: {media_valida:.2f}")
print(df)
