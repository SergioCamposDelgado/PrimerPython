import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileImport,
    faTrash,
    faSpinner,
    faCheckCircle,
    faExclamationTriangle,
    faCircleXmark,
    faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { lecturaService } from '../api/services/lecturaService';

interface ErrorDetalle {
    fila: number;
    cups: string;
    detalles: string[];
}

interface Props {
    onUploadSuccess: () => void;
}

export const ImportadorCSV: React.FC<Props> = ({ onUploadSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [stats, setStats] = useState<{ insertados: number; erroresCount: number; listaErrores: ErrorDetalle[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        setFile(selectedFile || null);
        setStatus('idle');
        setStats(null);
        setMessage('');
    };

    const handleUpload = async () => {
        if (!file) return;
        setStatus('uploading');
        setStats(null);

        try {
            const data = await lecturaService.uploadCSV(file);
            const numInsertados = data.insertados || 0;
            const listaErrores = data.errores || [];

            setStats({
                insertados: numInsertados,
                erroresCount: listaErrores.length,
                listaErrores: listaErrores
            });

            setStatus('success');
            if (numInsertados > 0) onUploadSuccess();

        } catch (err: any) {
            setStatus('error');
            setMessage(err.response?.data?.detail || "Error de conexión o formato de archivo.");
        }
    };

    const handleClear = () => {
        setFile(null);
        setStatus('idle');
        setStats(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
            {/* Header */}
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                <h5 className="font-bold flex items-center gap-2">
                    <FontAwesomeIcon icon={faFileImport} />
                    Gestión de Carga
                </h5>
                {status !== 'idle' && (
                    <button
                        onClick={handleClear}
                        className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faTrash} /> Limpiar
                    </button>
                )}
            </div>

            <div className="p-6">
                <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
                        Archivo CSV
                    </label>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        ref={fileInputRef}
                        disabled={status === 'uploading'}
                        className="w-full text-sm text-slate-500 dark:text-slate-400
                            file:mr-4 file:py-2.5 file:px-4
                            file:rounded-xl file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            dark:file:bg-blue-900/30 dark:file:text-blue-400
                            hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50
                            cursor-pointer disabled:opacity-50 transition-all"
                    />
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!file || status === 'uploading'}
                    className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                        ${status === 'error' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' :
                            (stats && stats.insertados === 0 ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20')}
                        disabled:opacity-50 disabled:shadow-none`}
                >
                    {status === 'uploading' ? (
                        <><FontAwesomeIcon icon={faSpinner} spin /> PROCESANDO...</>
                    ) : (
                        status === 'success' ? 'VOLVER A CARGAR' : 'INICIAR CARGA'
                    )}
                </button>

                {/* FEEDBACK DE RESULTADOS */}
                <div className="mt-6 space-y-4">
                    {status === 'success' && stats && (
                        <div className={`p-4 rounded-2xl border-l-4 ${stats.insertados > 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-500'}`}>

                            <div className="flex items-center gap-2 mb-3">
                                <FontAwesomeIcon
                                    icon={stats.insertados > 0 ? faCheckCircle : faExclamationTriangle}
                                    className={stats.insertados > 0 ? 'text-emerald-500' : 'text-amber-500'}
                                />
                                <span className={`font-bold ${stats.insertados > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                    {stats.insertados > 0 ? 'Carga procesada correctamente' : 'No se pudo importar ningún dato'}
                                </span>
                            </div>

                            <div className="flex gap-2 mb-4">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${stats.insertados > 0 ? 'bg-emerald-200/50 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}>
                                    +{stats.insertados} Éxitos
                                </span>
                                {stats.erroresCount > 0 && (
                                    <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded-md text-xs font-bold">
                                        {stats.erroresCount} Errores
                                    </span>
                                )}
                            </div>

                            {/* LISTA DE ERRORES */}
                            {stats.erroresCount > 0 && (
                                <div className="mt-4">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Detalle de incidencias:</p>
                                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                        {stats.listaErrores.map((err, idx) => (
                                            <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm">
                                                <div className="flex justify-between items-center mb-2 border-b border-slate-50 dark:border-slate-700 pb-2">
                                                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm shadow-red-500/20">Fila {err.fila}</span>
                                                    <code className="text-xs text-slate-500 dark:text-slate-400 font-mono">{err.cups}</code>
                                                </div>
                                                <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-400 space-y-1">
                                                    {err.detalles.map((d, i) => <li key={i}>{d}</li>)}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 rounded-2xl flex gap-3">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 mt-1" />
                            <div>
                                <p className="text-red-700 dark:text-red-400 font-bold text-sm mb-1">Error Crítico</p>
                                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};