import React, { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBoltLightning,
    faTable,
    faChartLine,
    faCircleArrowLeft,
    faTools
} from '@fortawesome/free-solid-svg-icons';
import { ImportadorCSV } from '../components/ImportadorCSV';
import { StatsSearch } from '../components/StatsSearch';
// import { TablaLecturas } from '../components/TablaLecturas';

export const Dashboard: React.FC = () => {
    const [, setRefreshKey] = useState(0);
    const [activeTab, setActiveTab] = useState<'listado' | 'graficos'>('listado');

    const handleUploadSuccess = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 transition-colors duration-300">
            <div className="container mx-auto px-4">

                {/* Cabecera del Dashboard */}
                <header className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <FontAwesomeIcon
                            icon={faBoltLightning}
                            className="text-yellow-500 text-4xl"
                        />
                        <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                            Energy Monitor <span className="text-blue-600">Pro</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">
                        Gestión y analítica de consumos energéticos en tiempo real.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Columna Izquierda: Herramientas */}
                    <aside className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <ImportadorCSV onUploadSuccess={handleUploadSuccess} />
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <StatsSearch />
                        </div>
                    </aside>

                    {/* Columna Derecha: Visualización (Tabs) */}
                    <section className="lg:col-span-8">
                        {/* Navegación de Pestañas */}
                        <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl mb-6 max-w-md">
                            <button
                                onClick={() => setActiveTab('listado')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'listado'
                                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    }`}
                            >
                                <FontAwesomeIcon icon={faTable} />
                                Histórico
                            </button>
                            <button
                                onClick={() => setActiveTab('graficos')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'graficos'
                                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    }`}
                            >
                                <FontAwesomeIcon icon={faChartLine} />
                                Tendencias
                            </button>
                        </div>

                        {/* Contenido de las Pestañas */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden min-h-100">
                            {activeTab === 'listado' ? (
                                <div className="p-8">
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                                        <FontAwesomeIcon icon={faCircleArrowLeft} size="3x" className="mb-4 opacity-20" />
                                        <p className="text-lg font-medium">Utiliza el importador o busca por CUPS para ver datos.</p>
                                        {/* <TablaLecturas key={refreshKey} /> */}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-slate-800/50">
                                    <FontAwesomeIcon icon={faTools} size="4x" className="text-slate-300 dark:text-slate-600 mb-6" />
                                    <h5 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Módulo de Gráficos en Desarrollo</h5>
                                    <p className="text-slate-500 dark:text-slate-400">Próximamente visualización avanzada con Chart.js</p>
                                </div>
                            )}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};