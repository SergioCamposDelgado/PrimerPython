// src/components/FileUpload.tsx
import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, Card, Table } from 'react-bootstrap';
import { useUpload } from '../hooks/useUpload';

/**
 * Componente FileUpload: Interfaz de usuario para la carga masiva de datos.
 * * Este componente gestiona el ciclo de vida visual de una subida de archivos:
 * 1. Selección y validación local del archivo.
 * 2. Feedback de carga mediante Spinners.
 * 3. Renderizado de resultados (éxitos y errores de validación por fila).
 */
const FileUpload: React.FC = () => {
    // Estado local para el archivo binario seleccionado por el usuario
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Hook personalizado que centraliza la lógica de API y gestión de estados globales de carga
    const { uploadFile, loading, result, error, resetStates } = useUpload();

    // Estado para controlar la visibilidad de los resultados (evita mostrar datos viejos en nuevas cargas)
    const [showResults, setShowResults] = useState(true);

    /**
     * Gestiona el cambio en el input de archivos.
     * Al seleccionar un archivo nuevo, se limpia la UI de resultados previos.
     */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);

            // LIMPIEZA PROACTIVA: Borramos rastro de errores o resultados de la sesión anterior
            if (typeof resetStates === 'function') resetStates();
            setShowResults(false);
        }
    };

    /**
     * Procesa el envío del formulario.
     * Envía el archivo al servicio y activa la visualización de resultados.
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (selectedFile) {
            // Aseguramos que la UI esté lista para recibir los nuevos datos
            if (typeof resetStates === 'function') resetStates();
            setShowResults(true);

            // Llamada asíncrona al servicio de subida
            await uploadFile(selectedFile);
        }
    };

    /**
     * Resetea completamente el componente a su estado inicial.
     */
    const handleClear = () => {
        if (typeof resetStates === 'function') resetStates();
        setShowResults(false);
        setSelectedFile(null);

        // Reset manual del input del DOM (necesario para permitir re-seleccionar el mismo archivo)
        const fileInput = document.getElementById('formFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    return (
        <Card className="shadow-sm mt-4 border-0">
            <Card.Body>
                {/* Cabecera del Componente */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <Card.Title className="mb-0 fw-bold">
                        <i className="bi bi-file-earmark-arrow-up me-2"></i>
                        Carga de Lecturas Energéticas
                    </Card.Title>

                    {/* Botón de limpieza: Solo visible si hay algo que limpiar */}
                    {(result || error) && showResults && (
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={handleClear}
                            className="border-0"
                        >
                            <i className="bi bi-trash3 me-1"></i> Limpiar vista
                        </Button>
                    )}
                </div>

                {/* Formulario de Selección de Archivo */}
                <Form onSubmit={handleSubmit}>
                    <Form.Group controlId="formFile" className="mb-3">
                        <Form.Label className="text-muted small">Selecciona un archivo CSV para procesar</Form.Label>
                        <Form.Control
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            disabled={loading} // Bloqueo durante la subida
                            className="py-2"
                        />
                    </Form.Group>

                    <Button
                        variant="primary"
                        type="submit"
                        disabled={!selectedFile || loading}
                        className="w-100 py-2 fw-bold shadow-sm"
                    >
                        {loading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Procesando archivo...
                            </>
                        ) : (
                            <><i className="bi bi-cloud-arrow-up-fill me-2"></i>Subir y Validar CSV</>
                        )}
                    </Button>
                </Form>

                {/* SECCIÓN DE FEEDBACK: Errores Globales (Red/Servidor) */}
                {error && showResults && (
                    <Alert variant="danger" className="mt-3 d-flex justify-content-between align-items-center animate__animated animate__fadeIn">
                        <div>
                            <i className="bi bi-exclamation-octagon-fill me-2"></i>
                            <strong>Error:</strong> {error}
                        </div>
                    </Alert>
                )}

                {/* SECCIÓN DE RESULTADOS: Procesamiento del CSV */}
                {result && showResults && !loading && (
                    <div className="mt-4 animate__animated animate__fadeIn">

                        {/* Alerta de Éxito: Registros insertados */}
                        {result.insertados > 0 && (
                            <Alert variant="success" className="d-flex align-items-center border-0 shadow-sm mb-3">
                                <i className="bi bi-check-circle-fill me-3 fs-4"></i>
                                <div>
                                    <h6 className="mb-0 fw-bold">Carga finalizada con éxito</h6>
                                    <small>Se han guardado <strong>{result.insertados}</strong> registros correctamente.</small>
                                </div>
                            </Alert>
                        )}

                        {/* Reporte de Errores por Fila: Filas descartadas */}
                        {result.errores && result.errores.length > 0 && (
                            <Card border="warning" className="mt-3 shadow-sm overflow-hidden">
                                <Card.Header className="bg-warning text-dark py-2 d-flex justify-content-between align-items-center border-0">
                                    <span className="fw-bold small text-uppercase">
                                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                        Filas descartadas por validación ({result.errores.length})
                                    </span>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        <Table hover responsive className="mb-0 align-middle small">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="text-center" style={{ width: '70px' }}>Fila</th>
                                                    <th>CUPS Detectado</th>
                                                    <th>Inconsistencias encontradas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.errores.map((err, idx) => (
                                                    <tr key={idx}>
                                                        <td className="text-center fw-bold text-muted">{err.fila}</td>
                                                        <td>
                                                            <code className="text-primary bg-light px-2 py-1 rounded">
                                                                {err.cups || 'N/A'}
                                                            </code>
                                                        </td>
                                                        <td>
                                                            {err.detalles.map((detalle, i) => (
                                                                <div key={i} className="text-danger py-1">
                                                                    <i className="bi bi-x-circle me-1"></i>{detalle}
                                                                </div>
                                                            ))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Card.Body>
                                <Card.Footer className="bg-light text-muted py-2 text-center small">
                                    Revisa el formato de estas filas e intenta subirlas de nuevo.
                                </Card.Footer>
                            </Card>
                        )}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default FileUpload;