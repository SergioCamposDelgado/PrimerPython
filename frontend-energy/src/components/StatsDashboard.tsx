// src/components/StatsDashboard.tsx
import React, { useState } from 'react';
import { Form, Button, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStats } from '../hooks/useStats';

/**
 * Componente StatsDashboard: Motor de visualización analítica.
 * * Permite al usuario consultar métricas agregadas de un CUPS específico.
 * Utiliza Recharts para el renderizado de gráficos y un Custom Hook para
 * la comunicación con el motor de agregación de MongoDB.
 */
const StatsDashboard: React.FC = () => {
    // Estado local para capturar la entrada del usuario (CUPS)
    const [cupsInput, setCupsInput] = useState('');

    // Extracción de lógica de negocio desde el Hook personalizado
    const { fetchStats, data, loading, error, setError } = useStats();

    /**
     * Controlador del envío del formulario.
     * Implementa un enfoque preventivo para evitar recargas de página y 
     * sanitiza el input antes de realizar la petición asíncrona.
     */
    const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Normalización: Eliminamos espacios accidentales
        const cleanCups = cupsInput.trim();

        if (cleanCups) {
            await fetchStats(cleanCups);
        }
    };

    /**
     * Adaptador de Datos para Recharts.
     * Transforma el objeto de respuesta de la API (StatsResponse) 
     * al formato de array de objetos requerido por el componente BarChart.
     */
    const chartData = data ? [
        { name: 'Consumo Total', valor: data.consumo_total },
        { name: 'Consumo Medio', valor: data.consumo_medio }
    ] : [];

    return (
        <div className="mt-5">
            <Card className="shadow-sm border-0">
                <Card.Body>
                    <Card.Title className="mb-4 fw-bold">
                        <i className="bi bi-graph-up-arrow me-2"></i>
                        Análisis por CUPS
                    </Card.Title>

                    {/* Formulario de Búsqueda: Interfaz minimalista y funcional */}
                    <Form onSubmit={handleSearch} className="mb-4">
                        <Row className="g-2">
                            <Col md={9}>
                                <Form.Control
                                    type="text"
                                    placeholder="Introduce el CUPS (ej: ES123...)"
                                    value={cupsInput}
                                    // Forzamos mayúsculas en tiempo real para mejorar la UX y coincidir con la DB
                                    onChange={(e) => setCupsInput(e.target.value.toUpperCase())}
                                    className="py-2"
                                    required
                                />
                            </Col>
                            <Col md={3}>
                                <Button variant="dark" type="submit" className="w-100 py-2" disabled={loading}>
                                    {loading ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        <><i className="bi bi-search me-2"></i>Buscar</>
                                    )}
                                </Button>
                            </Col>
                        </Row>
                    </Form>

                    {/* Gestión de Alertas: Errores 404 o fallos de red */}
                    {error && (
                        <Alert variant="warning" className="mt-3 d-flex justify-content-between align-items-center">
                            <div>
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                <strong>Atención:</strong> {error}
                            </div>
                            <Button
                                variant="close"
                                onClick={() => setError(null)}
                                size="sm"
                            />
                        </Alert>
                    )}

                    {/* Visualización de Resultados: Se activa solo cuando hay datos y la carga terminó */}
                    {data && !loading && (
                        <Row className="mt-4 animate__animated animate__fadeIn">
                            {/* Panel de KPIs (Indicadores Clave de Desempeño) */}
                            <Col md={4}>
                                <div className="p-3 bg-light rounded mb-3 border-start border-4 border-secondary">
                                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>
                                        Total Lecturas Procesadas
                                    </small>
                                    <h4 className="fw-bold mb-0">{data.total_lecturas}</h4>
                                </div>
                                <div className="p-3 bg-primary text-white rounded mb-3 border-start border-4 border-dark shadow-sm">
                                    <small className="d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                                        Consumo Acumulado
                                    </small>
                                    <h4 className="fw-bold mb-0">{data.consumo_total.toFixed(2)} kWh</h4>
                                </div>
                            </Col>

                            {/* Panel Gráfico: Representación comparativa */}
                            <Col md={8} style={{ minHeight: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        {/* Guías visuales sutiles para mejorar la legibilidad */}
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: '#f8f9fa' }}
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: 'none',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Bar
                                            dataKey="valor"
                                            fill="#0d6efd"
                                            radius={[6, 6, 0, 0]} // Barras redondeadas para un look moderno
                                            barSize={60}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Col>
                        </Row>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
};

export default StatsDashboard;