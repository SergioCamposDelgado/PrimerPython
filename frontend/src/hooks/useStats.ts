// src/hooks/useStats.ts
import { useState } from 'react';
import api from '../api/axios';
import { type StatsResponse } from '../types/energy';

/**
 * Custom Hook: useStats
 * * Especializado en la recuperación y tratamiento de métricas agregadas por CUPS.
 * Implementa una lógica de 'Manejo de Errores Granular' para que la interfaz 
 * pueda reaccionar de forma específica a cada estado del servidor.
 */
export const useStats = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<StatsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Consulta las estadísticas de consumo para un identificador específico.
     * @param cups El código de suministro a consultar.
     */
    const fetchStats = async (cups: string) => {
        setLoading(true);
        setError(null); // Limpiamos errores previos antes de la nueva consulta

        try {
            // Petición GET tipada para asegurar la integridad de los datos de analítica
            const response = await api.get<StatsResponse>(`/stats/${cups}`);
            console.log("Respuesta completa de la API:", response.data);
            setData(response.data);

        } catch (err: any) {
            // Reset de datos previos para evitar confusión visual si la búsqueda falla
            setData(null);

            // --- PROTOCOLO DE GESTIÓN DE ERRORES HTTP ---
            if (err.response) {
                /**
                 * CASO A: El servidor respondió, pero con un código de error (4xx, 5xx).
                 * Mapeamos códigos técnicos a mensajes de lenguaje natural.
                 */
                switch (err.response.status) {
                    case 404:
                        setError(`El CUPS ${cups} no existe en nuestra base de datos.`);
                        break;
                    case 422:
                        setError("El formato del CUPS es incorrecto. Debe tener 2 letras, 16 números y 2 letras.");
                        break;
                    case 503:
                        setError("El servicio de base de datos no está disponible. Inténtalo más tarde.");
                        break;
                    default:
                        // Captura el mensaje 'detail' de FastAPI si existe, o un genérico
                        setError(err.response.data?.detail || "Error inesperado en el servidor.");
                }
            } else if (err.request) {
                /**
                 * CASO B: La petición fue enviada pero no hubo respuesta.
                 * Típico de timeout, servidor apagado o problemas de CORS.
                 */
                setError("No se pudo conectar con el servidor. Revisa tu conexión a internet.");
            } else {
                /**
                 * CASO C: Error en la configuración de la petición antes de enviarse.
                 */
                setError("Error al configurar la consulta.");
            }
        } finally {
            // Garantiza que el spinner se detenga siempre
            setLoading(false);
        }
    };

    // Exponemos setError para que el componente pueda cerrar la alerta manualmente
    return { fetchStats, data, loading, error, setError };
};