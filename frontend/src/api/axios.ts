// src/api/axios.ts

/**
 * Configuración centralizada de Axios para la comunicación con la API.
 * * Este archivo centraliza la instancia de HTTP client para asegurar que:
 * 1. Todas las peticiones compartan la misma URL base (BaseURL).
 * 2. Se facilite la inyección de interceptores (auth, logs, etc.) en el futuro.
 * 3. Se respete la separación de entornos (Desarrollo, Staging, Producción).
 */

import axios, { type AxiosInstance } from 'axios';

/**
 * Instancia de Axios personalizada.
 * * Se utiliza 'import.meta.env' de Vite para acceder a las variables de entorno.
 * Es fundamental definir 'VITE_API_URL' en tu archivo .env para que la
 * comunicación con el Backend (FastAPI) sea exitosa.
 */
const api: AxiosInstance = axios.create({
    // URL base recuperada dinámicamente según el entorno
    baseURL: import.meta.env.VITE_API_URL,

    // Tiempo de espera opcional para evitar peticiones colgadas (ej: 10 segundos)
    timeout: 10000,

    // Cabeceras por defecto para asegurar el envío/recepción de JSON
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

export default api;