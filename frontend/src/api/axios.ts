/**
 * Configuración centralizada de Axios para la comunicación con la API.
 * * Este archivo centraliza la instancia del cliente HTTP para asegurar que:
 * 1. Todas las peticiones compartan la misma URL base (BaseURL).
 * 2. Se facilite la inyección de interceptores (auth, logs, etc.).
 * 3. Se respete la separación de entornos (Desarrollo, Staging, Producción).
 */

import axios, { type AxiosInstance } from 'axios';

/**
 * Instancia de Axios personalizada.
 */
const api: AxiosInstance = axios.create({
    // URL base recuperada dinámicamente según el entorno
    baseURL: import.meta.env.VITE_API_URL,

    // Tiempo de espera (10 segundos) para evitar peticiones colgadas
    timeout: 10000,

    // Cabeceras estándar para comunicación REST
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

/**
 * INTERCEPTOR DE RESPUESTA
 * Captura errores globales (como fallos de red o errores 500) antes de 
 * que lleguen a los componentes, permitiendo un log centralizado.
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Aquí podrías disparar notificaciones globales (Toasts/Alerts)
        console.error('[API Error]:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default api;