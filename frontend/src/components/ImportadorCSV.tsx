import React, { useState, useRef } from 'react';
import { Card, Form, Button, Spinner, Stack, Badge } from 'react-bootstrap';
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

    // Resetear todo al seleccionar un archivo nuevo
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
        setStats(null); // Limpiamos stats anteriores al empezar

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
        <Card className="shadow-sm mb-4 border-0">
            <Card.Header className="bg-primary text-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 font-weight-bold">
                    <i className="bi bi-file-earmark-arrow-up-fill me-2"></i>
                    Gestión de Carga
                </h5>
                {status !== 'idle' && (
                    <Button variant="outline-light" size="sm" onClick={handleClear}>
                        <i className='bi bi-trash'></i> Limpiar
                    </Button>
                )}
            </Card.Header>
            <Card.Body>
                <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-muted">ARCHIVO CSV</Form.Label>
                    <Form.Control
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        ref={fileInputRef}
                        disabled={status === 'uploading'}
                        className="form-control-lg"
                    />
                </Form.Group>

                <Button
                    variant={status === 'error' ? "danger" : (stats && stats.insertados === 0 ? "warning" : "primary")}
                    className="w-100 py-2 fw-bold"
                    onClick={handleUpload}
                    disabled={!file || status === 'uploading'}
                >
                    {status === 'uploading' ? (
                        <><Spinner animation="border" size="sm" className="me-2" />PROCESANDO...</>
                    ) : (
                        status === 'success' ? 'VOLVER A CARGAR' : 'INICIAR CARGA'
                    )}
                </Button>

                <div className="mt-3">
                    {status === 'success' && stats && (
                        <div className={`p-3 border-start border-4 rounded ${stats.insertados > 0 ? 'bg-light border-success' : 'bg-warning bg-opacity-10 border-warning'}`}>

                            <div className={stats.insertados > 0 ? "text-success fw-bold" : "text-warning fw-bold"}>
                                {stats.insertados > 0 ? <><i className="bi bi-check-circle-fill"></i> Carga procesada </> : <><i className="bi bi-exclamation-triangle-fill"></i> No se pudo importar ningún dato </>}
                            </div>

                            <Stack direction="horizontal" gap={2} className="my-2">
                                <Badge bg={stats.insertados > 0 ? "success" : "secondary"}>
                                    +{stats.insertados} Éxitos
                                </Badge>
                                {stats.erroresCount > 0 && (
                                    <Badge bg="danger">{stats.erroresCount} Errores</Badge>
                                )}
                            </Stack>

                            {stats.erroresCount > 0 && (
                                <div className="mt-3">
                                    <p className="small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '0.7rem' }}>Detalle de incidencias:</p>
                                    <div style={{ maxHeight: '250px', overflowY: 'auto', fontSize: '0.82rem' }}>
                                        {stats.listaErrores.map((err, idx) => (
                                            <div key={idx} className="mb-2 p-2 bg-white border rounded shadow-sm border-danger border-opacity-25">
                                                <div className="d-flex justify-content-between align-items-center border-bottom pb-1 mb-1">
                                                    <span className="badge bg-danger">Fila {err.fila}</span>
                                                    <span className="text-muted font-monospace small">{err.cups}</span>
                                                </div>
                                                <ul className="mb-0 ps-3 text-danger">
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
                        <div className="p-3 bg-light border-start border-danger border-4 rounded">
                            <div className="text-danger fw-bold mb-1"><i className="bi bi-exclamation-triangle-fill"></i> Error Crítico</div>
                            <small className="text-muted d-block">{message}</small>
                        </div>
                    )}
                </div>
            </Card.Body>
        </Card>
    );
};