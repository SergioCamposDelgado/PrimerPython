import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faList, faPlus, faPencil, faTrash, faSpinner,
    faTriangleExclamation, faChevronLeft, faChevronRight,
    faAnglesLeft, faAnglesRight
} from '@fortawesome/free-solid-svg-icons';
import { lecturaService } from '../api/services/lecturaService';
import type { Lectura, LecturaFilters } from '../api/services/lecturaService';

export const TablaLecturas: React.FC = () => {
    // --- ESTADOS ---
    const [lecturas, setLecturas] = useState<Lectura[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    const [filtros, setFiltros] = useState<LecturaFilters>({ cups: '', fecha_inicio: '', fecha_fin: '' });

    // Modales
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedLectura, setSelectedLectura] = useState<Partial<Lectura>>({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // --- CARGA DE DATOS ---
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const skip = (currentPage - 1) * limit;
            const params: LecturaFilters = {
                ...filtros, skip, limit,
                cups: filtros.cups || undefined,
                fecha_inicio: filtros.fecha_inicio || undefined,
                fecha_fin: filtros.fecha_fin || undefined
            };
            const response = await lecturaService.getLecturas(params);
            setLecturas(response.data);
            setTotalRecords(response.total_records);
        } catch (error) {
            console.error("Error al cargar lecturas:", error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit, filtros]);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    // --- HANDLERS ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFiltros({ ...filtros, [e.target.name]: e.target.value });
    };

    const handleOpenCreate = () => {
        setModalMode('create');
        setSelectedLectura({ cups: '', fecha: '', consumo: 0, id_contador: '' });
        setShowModal(true);
    };

    const handleOpenEdit = (lectura: Lectura) => {
        setModalMode('edit');
        const fechaFormateada = new Date(lectura.fecha).toISOString().slice(0, 16);
        setSelectedLectura({ ...lectura, fecha: fechaFormateada });
        setShowModal(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setErrors({});
        try {
            if (modalMode === 'create') {
                await lecturaService.createLectura(selectedLectura as Lectura);
            } else {
                await lecturaService.updateLectura(selectedLectura._id!, selectedLectura as Lectura);
            }
            setShowModal(false);
            cargarDatos();
        } catch (error: any) {
            if (error.response?.status === 422) {
                const newErrors: Record<string, string> = {};
                error.response.data.detail.forEach((err: any) => {
                    newErrors[err.loc[1] || 'general'] = err.msg;
                });
                setErrors(newErrors);
            }
        } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!selectedLectura._id) return;
        try {
            await lecturaService.deleteLectura(selectedLectura._id);
            setShowDeleteModal(false);
            cargarDatos();
        } catch (error) { alert("Error al eliminar"); }
    };

    const totalPages = Math.ceil(totalRecords / limit);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden text-slate-900 dark:text-slate-100">

            {/* Header de la Tabla */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                <h5 className="font-bold flex items-center gap-2">
                    <FontAwesomeIcon icon={faList} className="text-blue-500" />
                    Listado de Consumos
                </h5>
                <button
                    onClick={handleOpenCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                    <FontAwesomeIcon icon={faPlus} /> Nueva Lectura
                </button>
            </div>

            <div className="p-6">
                {/* Info y Paginación */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="text-sm text-slate-500">
                        Total: <span className="font-bold text-slate-800 dark:text-slate-200">{totalRecords}</span> registros
                    </div>

                    {totalPages > 1 && (
                        <nav className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><FontAwesomeIcon icon={faAnglesLeft} /></button>
                            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><FontAwesomeIcon icon={faChevronLeft} /></button>

                            {[currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
                                .filter(page => page > 0 && page <= totalPages)
                                .map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === currentPage ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        {page}
                                    </button>
                                ))
                            }

                            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><FontAwesomeIcon icon={faChevronRight} /></button>
                            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-2 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><FontAwesomeIcon icon={faAnglesRight} /></button>
                        </nav>
                    )}
                </div>

                {/* Filtros */}
                <form className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1 ml-1">CUPS</label>
                        <input name="cups" value={filtros.cups} onChange={handleInputChange} placeholder="Buscar CUPS..." className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1 ml-1">Desde</label>
                        <input type="datetime-local" name="fecha_inicio" value={filtros.fecha_inicio} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1 ml-1">Hasta</label>
                        <input type="datetime-local" name="fecha_fin" value={filtros.fecha_fin} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                </form>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-sm">
                                <th className="py-3 px-4 font-semibold uppercase tracking-wider">CUPS</th>
                                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Fecha</th>
                                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Consumo</th>
                                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr><td colSpan={4} className="py-20 text-center"><FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500" /></td></tr>
                            ) : lecturas.map((item) => (
                                <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="py-3 px-4"><code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-blue-600 dark:text-blue-400 font-bold">{item.cups}</code></td>
                                    <td className="py-3 px-4 text-sm">{new Date(item.fecha).toLocaleString()}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.consumo > 10 ? 'bg-green-100 text-green-700' : (item.consumo > 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')
                                            }`}>
                                            {item.consumo.toFixed(3)} MWh
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right space-x-2">
                                        <button onClick={() => handleOpenEdit(item)} className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"><FontAwesomeIcon icon={faPencil} /></button>
                                        <button onClick={() => { setSelectedLectura(item); setShowDeleteModal(true); }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><FontAwesomeIcon icon={faTrash} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL CREAR / EDITAR (Simulado con overlay de Tailwind) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-bold">{modalMode === 'create' ? 'Nueva Lectura' : 'Editar Lectura'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">CUPS</label>
                                <input disabled={modalMode === 'edit'} value={selectedLectura.cups} onChange={(e) => setSelectedLectura({ ...selectedLectura, cups: e.target.value.toUpperCase() })} className={`w-full bg-white dark:bg-slate-900 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 ${errors.cups ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`} />
                                {errors.cups && <p className="text-red-500 text-xs mt-1">{errors.cups}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Fecha y Hora</label>
                                    <input type="datetime-local" value={selectedLectura.fecha} onChange={(e) => setSelectedLectura({ ...selectedLectura, fecha: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Consumo (MWh)</label>
                                    <input type="number" step="0.001" value={selectedLectura.consumo} onChange={(e) => setSelectedLectura({ ...selectedLectura, consumo: parseFloat(e.target.value) })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">ID Contador</label>
                                <input disabled={modalMode === 'edit'} value={selectedLectura.id_contador || ''} onChange={(e) => setSelectedLectura({ ...selectedLectura, id_contador: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none" />
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:underline">Cancelar</button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all flex items-center gap-2">
                                {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-8 shadow-2xl text-center border border-slate-200 dark:border-slate-700">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FontAwesomeIcon icon={faTriangleExclamation} size="2x" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">Confirmar Eliminación</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8">¿Estás seguro de que quieres eliminar esta lectura? Esta acción es irreversible.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 text-slate-500 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg shadow-red-500/30 transition-all">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};