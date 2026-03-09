// src/hooks/useUpload.ts
import { useState } from 'react';
import api from '../api/axios';
import { type UploadResponse } from '../types/energy';

/**
 * Custom Hook: useUpload
 * * Centraliza la lógica de comunicación asíncrona para la carga de archivos.
 * Encapsula tres estados fundamentales en cualquier petición HTTP:
 * 1. loading: Controla el feedback visual (spinners/bloqueo de botones).
 * 2. result: Almacena la respuesta exitosa o parcial del servidor (registros vs errores).
 * 3. error: Captura fallos críticos de red o excepciones del servidor.
 */
export const useUpload = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<UploadResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Limpia el estado de la última operación.
     * Esencial para evitar que mensajes de error o resultados de archivos previos 
     * persistan al intentar una nueva carga.
     */
    const resetStates = () => {
        setResult(null);
        setError(null);
    };

    /**
     * Ejecuta la petición POST enviando el archivo mediante FormData.
     * * @param file Objeto File obtenido del input de tipo archivo.
     */
    const uploadFile = async (file: File) => {
        setLoading(true);
        setError(null); // Reset del error antes de empezar

        // Preparamos el cuerpo de la petición para envío de binarios
        const formData = new FormData();
        formData.append('file', file);

        try {
            /**
             * Comunicación con el endpoint de FastAPI.
             * Se especifica el tipo genérico <UploadResponse> para que TypeScript
             * proporcione autocompletado del resultado en el componente que use el hook.
             */
            const response = await api.post<UploadResponse>('/upload-lecturas/', formData, {
                headers: {
                    // Obligatorio para que el servidor reconozca el stream multi-parte
                    'Content-Type': 'multipart/form-data'
                },
            });

            // Persistimos la respuesta (que incluye el conteo de insertados y errores de fila)
            setResult(response.data);

        } catch (err: any) {
            /**
             * Gestión de errores refinada:
             * Intentamos extraer el mensaje detallado enviado por FastAPI (http_exception.detail).
             * Si no existe, caemos en un mensaje de error genérico.
             */
            const errorMsg = err.response?.data?.detail || 'Error al conectar con el servidor';
            setError(errorMsg);
        } finally {
            // Se garantiza que el estado 'loading' termine independientemente del resultado
            setLoading(false);
        }
    };

    return { uploadFile, loading, result, error, resetStates };
};