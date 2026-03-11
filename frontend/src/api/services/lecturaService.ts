/**
 * Servicio adaptado a la estructura real de la API (Swagger).
 * La baseURL de Axios se asume como: http://dominio.com/api/v1
 */

import api from '../axios';

// --- INTERFACES (Se mantienen igual) ---

export interface LecturaFilters {
    skip?: number;
    limit?: number;
    cups?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
}

export interface Lectura {
    _id?: string;
    cups: string;
    fecha: string;
    consumo: number;
    id_contador?: string;
}

export interface LecturaUpdate {
    cups?: string;
    fecha?: string;
    consumo?: number;
    id_contador?: string;
}

export interface CupsStats {
    _id: string;
    consumo_total: number;
    consumo_medio: number;
    total_lecturas: number;
}

// --- LÓGICA DEL SERVICIO CORREGIDA ---

export const lecturaService = {
    /**
     * Listado paginado.
     * Swagger: GET /api/v1/
     */
    getLecturas: async (filters: LecturaFilters) => {
        const response = await api.get('/', {
            params: filters
        });
        return response.data;
    },

    /**
     * Carga masiva CSV.
     * Swagger: POST /api/v1/upload-lecturas/
     */
    uploadCSV: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/upload-lecturas/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Registro manual.
     * Swagger: POST /api/v1/
     */
    createLectura: async (lectura: Lectura) => {
        const response = await api.post('/', lectura);
        return response.data;
    },

    /**
     * Obtener por ID.
     * Swagger: GET /api/v1/{id}
     */
    getLecturaById: async (id: string) => {
        const response = await api.get(`/${id}`);
        return response.data;
    },

    /**
     * Actualización parcial.
     * Swagger: PATCH /api/v1/{id}
     */
    updateLectura: async (id: string, data: LecturaUpdate) => {
        const response = await api.patch(`/${id}`, data);
        return response.data;
    },

    /**
     * Eliminación.
     * Swagger: DELETE /api/v1/{id}
     */
    deleteLectura: async (id: string) => {
        const response = await api.delete(`/${id}`);
        return response.data;
    },

    /**
     * Estadísticas por CUPS.
     * Swagger: GET /api/v1/stats/{cups}
     */
    getStatsByCups: async (cups: string): Promise<CupsStats> => {
        const response = await api.get(`/stats/${cups}`);
        return response.data;
    }
};