// src/types/energy.ts

/**
 * Definiciones de Tipos de Datos (Interfaces) para el Dominio de Energía.
 * Este archivo centraliza los modelos de datos que fluyen entre la API y la UI.
 */

/**
 * Representa un registro individual de lectura energética.
 */
export interface Lectura {
    _id?: string;        // ID único de MongoDB (opcional porque en el CSV no viene)
    cups: string;        // Código Unificado de Punto de Suministro
    fecha: string;       // ISO 8601 string (Ej: 2024-01-01T00:00:00)
    consumo: number;     // Valor en MWh
    id_contador: number; // Identificador del dispositivo físico
}

/**
 * Estructura de respuesta para los endpoints de analítica (Aggregation).
 * Incluye los campos calculados y el array de lecturas para visualización.
 */
export interface StatsResponse {
    _id: string;            // El CUPS actúa como identificador del grupo
    consumo_total: number;  // Suma acumulada de energía
    consumo_medio: number;  // Promedio aritmético del consumo
    total_lecturas: number; // Conteo total de registros procesados
    lecturas: Lectura[];    // <--- IMPORTANTE: Necesario para que el gráfico use datos reales
}

/**
 * Detalle de error localizado en una fila específica del CSV.
 */
export interface ErrorFila {
    fila: number;       // Número de línea en el archivo (1-based)
    cups: string;       // CUPS de referencia (si se pudo parsear)
    detalles: string[]; // Lista de motivos por los cuales la fila fue rechazada
}

/**
 * Respuesta global tras el proceso de carga masiva (Upload).
 */
export interface UploadResponse {
    status: string;
    insertados: number;
    errores: ErrorFila[];
}