import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, Pagination, Form, Row, Col, Button,
    Badge, Spinner, Card, Modal
} from 'react-bootstrap';
import { lecturaService } from '../api/services/lecturaService';
import type { Lectura, LecturaFilters } from '../api/services/lecturaService';

export const TablaLecturas: React.FC = () => {
    // ESTADOS DE DATOS
    const [lecturas, setLecturas] = useState<Lectura[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(false);

    // ESTADOS DE PAGINACIÓN Y FILTROS
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    const [filtros, setFiltros] = useState<LecturaFilters>({
        cups: '',
        fecha_inicio: '',
        fecha_fin: ''
    });

    // ESTADOS DE MODALES
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedLectura, setSelectedLectura] = useState<Partial<Lectura>>({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // --- LÓGICA DE CARGA ---
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const skip = (currentPage - 1) * limit;
            const params: LecturaFilters = {
                ...filtros,
                skip,
                limit,
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

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // --- MANEJADORES DE ACCIONES ---
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
        // Formateamos la fecha para el input datetime-local (YYYY-MM-DDTHH:mm)
        const fechaFormateada = new Date(lectura.fecha).toISOString().slice(0, 16);
        setSelectedLectura({ ...lectura, fecha: fechaFormateada });
        setShowModal(true);
    };

    const handleOpenDelete = (lectura: Lectura) => {
        setSelectedLectura(lectura);
        setShowDeleteModal(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setErrors({}); // Limpiamos errores previos

        try {
            if (modalMode === 'create') {
                await lecturaService.createLectura(selectedLectura as Lectura);
            } else {
                await lecturaService.updateLectura(selectedLectura._id!, selectedLectura as Lectura);
            }
            setShowModal(false);
            cargarDatos();
        } catch (error: any) {
            if (error.response && error.response.status === 422) {
                const validationErrors = error.response.data.detail;
                const newErrors: Record<string, string> = {};

                validationErrors.forEach((err: any) => {
                    // Pydantic pone el nombre del campo en err.loc[1]
                    const fieldName = err.loc[1] || 'general';
                    newErrors[fieldName] = err.msg;
                });
                setErrors(newErrors);
            } else {
                alert("Error inesperado al guardar los datos");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedLectura._id) return;
        try {
            await lecturaService.deleteLectura(selectedLectura._id);
            setShowDeleteModal(false);
            cargarDatos();
        } catch (error) {
            alert("Error al eliminar");
        }
    };

    const totalPages = Math.ceil(totalRecords / limit);

    return (
        <Card className="shadow-sm border-0">
            <Card.Header className="py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold "><i className="bi bi-list me-2"></i> Listado de Consumos</h5>
                <Button variant="primary" onClick={handleOpenCreate}>
                    <i className="bi bi-plus-lg me-2"></i>Nueva Lectura
                </Button>
            </Card.Header>
            <Card.Body>

                {/* PAGINACIÓN */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="text-muted small">
                        Total de registros: <strong>{totalRecords}</strong>
                    </div>
                    {totalPages > 1 && (

                        <Pagination>
                            <Pagination.First disabled={currentPage === 1} onClick={() => setCurrentPage(1)} />
                            <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} />
                            {/* Generamos un array de números alrededor de la página actual */}
                            {[currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
                                .filter(page => page > 0 && page <= totalPages) // Solo páginas que existen
                                .map(page => (
                                    <Pagination.Item
                                        key={page}
                                        active={page === currentPage}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </Pagination.Item>
                                ))
                            }
                            <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} />
                            <Pagination.Last disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} />
                        </Pagination>

                    )}
                </div>

                {/* FILTROS */}
                <Form className="mb-4 p-3 bg-body-tertiary rounded border-0" onSubmit={(e) => { e.preventDefault(); setCurrentPage(1); }} action="#">
                    <Row className="g-3 align-items-end">
                        <Col md={4}>
                            <Form.Label className="small fw-bold">CUPS</Form.Label>
                            <Form.Control
                                name="cups"
                                value={filtros.cups}
                                onChange={handleInputChange}
                                placeholder="Buscar por CUPS..."
                            />
                        </Col>
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Desde</Form.Label>
                            <Form.Control
                                type="datetime-local"
                                name="fecha_inicio"
                                value={filtros.fecha_inicio}
                                onChange={handleInputChange}
                            />
                        </Col>
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Hasta</Form.Label>
                            <Form.Control
                                type="datetime-local"
                                name="fecha_fin"
                                value={filtros.fecha_fin}
                                onChange={handleInputChange}
                            />
                        </Col>
                    </Row>
                </Form>


                {/* TABLA */}
                <div className="table-responsive">
                    <Table striped hover className="align-middle">
                        <thead>
                            <tr>
                                <th>CUPS</th>
                                <th>Fecha</th>
                                <th>Consumo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="table-group-divider">
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-5"><Spinner animation="border" /></td></tr>
                            ) : lecturas.map((item) => (
                                <tr key={item._id}>
                                    <td><code className="fw-bold">{item.cups}</code></td>
                                    <td>{new Date(item.fecha).toLocaleString()}</td>
                                    <td>
                                        <Badge bg={item.consumo > 10 ? 'success' : (item.consumo > 5 ? 'warning' : 'danger')}>
                                            {item.consumo.toFixed(3)} MWh
                                        </Badge>
                                    </td>
                                    <td>
                                        <Button variant="outline-warning" size="sm" className="me-2" onClick={() => handleOpenEdit(item)}>
                                            <i className="bi bi-pencil"></i>
                                        </Button>
                                        <Button variant="outline-danger" size="sm" onClick={() => handleOpenDelete(item)}>
                                            <i className="bi bi-trash"></i>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>


            </Card.Body>

            {/* MODAL CREAR / EDITAR */}
            <Modal show={showModal} onHide={() => { setShowModal(false); setErrors({}); }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{modalMode === 'create' ? 'Nueva Lectura' : 'Editar Lectura'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        {/* CUPS */}
                        <Form.Group className="mb-3">
                            <Form.Label>CUPS</Form.Label>
                            <Form.Control
                                value={selectedLectura.cups}
                                isInvalid={!!errors.cups}
                                onChange={(e) => setSelectedLectura({ ...selectedLectura, cups: e.target.value.toUpperCase() })}
                                disabled={modalMode === 'edit'}
                                placeholder="Ej: ES1234..."
                            />
                            <Form.Control.Feedback type="invalid">{errors.cups}</Form.Control.Feedback>
                        </Form.Group>

                        {/* FECHA */}
                        <Form.Group className="mb-3">
                            <Form.Label>Fecha y Hora</Form.Label>
                            <Form.Control
                                type="datetime-local"
                                value={selectedLectura.fecha}
                                isInvalid={!!errors.fecha}
                                onChange={(e) => setSelectedLectura({ ...selectedLectura, fecha: e.target.value })}
                            />
                            <Form.Control.Feedback type="invalid">{errors.fecha}</Form.Control.Feedback>
                        </Form.Group>

                        {/* CONSUMO */}
                        <Form.Group className="mb-3">
                            <Form.Label>Consumo (MWh)</Form.Label>
                            <Form.Control
                                type="number"
                                step="0.001"
                                min="0"
                                value={selectedLectura.consumo}
                                isInvalid={!!errors.consumo}
                                onChange={(e) => setSelectedLectura({ ...selectedLectura, consumo: parseFloat(e.target.value) })}
                            />
                            <Form.Control.Feedback type="invalid">{errors.consumo}</Form.Control.Feedback>
                        </Form.Group>

                        {/* ID CONTADOR */}
                        <Form.Group className="mb-3">
                            <Form.Label>ID Contador</Form.Label>
                            <Form.Control
                                value={selectedLectura.id_contador || ''}
                                isInvalid={!!errors.id_contador}
                                onChange={(e) => setSelectedLectura({
                                    ...selectedLectura,
                                    id_contador: e.target.value
                                })}
                                disabled={modalMode === 'edit'}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.id_contador}
                            </Form.Control.Feedback>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Spinner size="sm" /> : 'Guardar Cambios'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* MODAL ELIMINAR */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar Eliminación</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center py-4">
                    <i className="bi bi-exclamation-triangle text-danger fs-1"></i>
                    <p className="mt-3">¿Estás seguro de eliminar esta lectura?</p>
                    <div className="d-flex justify-content-center gap-2">
                        <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>No</Button>
                        <Button variant="danger" onClick={handleDelete}>Sí, eliminar</Button>
                    </div>
                </Modal.Body>
            </Modal>
        </Card>
    );
};