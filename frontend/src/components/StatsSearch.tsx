import React, { useState, useMemo, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartLine,
    faMagnifyingGlass,
    faSpinner,
    faCircleExclamation,
    faXmark
} from '@fortawesome/free-solid-svg-icons';
import { useStats } from '../hooks/useStats';
import type { Lectura } from '../types/energy';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
    type ChartOptions,
    type ChartData
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Filler, Legend
);

export const StatsSearch: React.FC = () => {
    const [cupsInput, setCupsInput] = useState('');
    const [showModal, setShowModal] = useState(false);
    const { fetchStats, data, loading, error, setError } = useStats();

    // Detectar si el sistema o la app están en modo oscuro para el gráfico
    const isDarkMode = document.documentElement.classList.contains('dark');

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (cupsInput.trim()) {
            fetchStats(cupsInput.toUpperCase().trim());
        }
    };

    useEffect(() => {
        if (data && !error && !loading) {
            setShowModal(true);
        }
    }, [data, error, loading]);

    const chartData: ChartData<'line'> = useMemo(() => {
        if (!data?.lecturas || data.lecturas.length === 0) {
            return { labels: [], datasets: [] };
        }

        const groups = data.lecturas.reduce((acc: Record<string, any>, lectura: Lectura) => {
            const date = new Date(lectura.fecha);
            if (isNaN(date.getTime())) return acc;
            const horaStr = date.getHours().toString().padStart(2, '0') + ':00';

            if (!acc[horaStr]) acc[horaStr] = { total: 0, cuenta: 0 };
            acc[horaStr].total += lectura.consumo;
            acc[horaStr].cuenta += 1;
            return acc;
        }, {});

        const sortedHours = Object.keys(groups).sort();
        const consumos = sortedHours.map(h => Number((groups[h].total / groups[h].cuenta).toFixed(4)));

        return {
            labels: sortedHours,
            datasets: [
                {
                    fill: true,
                    label: 'Consumo Promedio',
                    data: consumos,
                    borderColor: '#3b82f6', // blue-500
                    backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#3b82f6',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
            ],
        };
    }, [data, isDarkMode]);

    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                titleColor: isDarkMode ? '#f8fafc' : '#1e293b',
                bodyColor: isDarkMode ? '#cbd5e1' : '#64748b',
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { color: isDarkMode ? '#94a3b8' : '#64748b' },
                grid: { color: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0,0,0,0.05)' }
            },
            x: {
                ticks: { color: isDarkMode ? '#94a3b8' : '#64748b' },
                grid: { display: false }
            }
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-emerald-600 px-6 py-4 flex items-center gap-3">
                    <FontAwesomeIcon icon={faChartLine} className="text-white text-xl" />
                    <h5 className="text-white font-bold m-0">Analítica por CUPS</h5>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSearch} className="relative">
                        <div className="flex gap-2">
                            <div className="relative flex-grow">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                                </span>
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800 dark:text-white"
                                    placeholder="Ej: ES0021..."
                                    value={cupsInput}
                                    onChange={(e) => setCupsInput(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !cupsInput}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Consultar'}
                            </button>
                        </div>
                    </form>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faCircleExclamation} />
                                {error}
                            </div>
                            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DE GRÁFICO */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Curva de Carga Horaria</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Análisis promedio de consumos</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <FontAwesomeIcon icon={faXmark} className="text-xl text-slate-400" />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="h-[400px] w-full">
                                {chartData.labels && chartData.labels.length > 0 ? (
                                    <Line data={chartData} options={chartOptions} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <FontAwesomeIcon icon={faCircleExclamation} size="3x" className="mb-4 opacity-20" />
                                        <p>No hay datos suficientes para generar tendencias.</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                                    <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">CUPS Analizado</span>
                                    <p className="text-lg font-mono font-bold text-blue-900 dark:text-blue-200">{data?._id}</p>
                                </div>
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                    <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">Muestra de Datos</span>
                                    <p className="text-lg font-bold text-emerald-900 dark:text-emerald-200">{data?.total_lecturas} registros</p>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-8 py-2.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};