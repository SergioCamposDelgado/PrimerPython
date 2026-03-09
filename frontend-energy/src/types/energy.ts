// src/types/energy.ts

/**
 * Definiciones de Tipos de Datos (Interfaces) para el Dominio de Energía.
 * * Este archivo centraliza los modelos de datos que fluyen entre la API y la UI,
 * garantizando la integridad de tipos en toda la aplicación.
 */

/**
 * Representa un registro individual de lectura energética.
 */
export interface Lectura {
    cups: string;        // Código Unificado de Punto de Suministro
    consumo: number;     // Valor en kWh
    id_contador: number; // Identificador del dispositivo físico
}

/**
 * Estructura de respuesta para los endpoints de analítica (Aggregation).
 * Los nombres de los campos coinciden con la salida del pipeline de MongoDB.
 */
export interface StatsResponse {
    _id: string;           // El CUPS actúa como identificador del grupo
    consumo_total: number; // Suma acumulada de energía
    consumo_medio: number; // Promedio aritmético del consumo
    total_lecturas: number; // Conteo total de registros procesados
}

/**
 * Detalle de error localizado en una fila específica del CSV.
 * Ayuda al usuario a identificar qué corregir en su archivo original.
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
    status: string;       // Estado del proceso (ej: "finalizado")
    insertados: number;   // Cantidad de registros guardados con éxito
    errores: ErrorFila[]; // Colección de errores detectados durante la validación
}