import React, { useState, useMemo, useEffect } from 'react';
import {
    Card, Form, Button, InputGroup, Alert, Spinner, Modal
} from 'react-bootstrap';
import { useStats } from '../hooks/useStats';
import type { Lectura } from '../types/energy';

// Imports de Chart.js
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

// Registro obligatorio de componentes
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

export const StatsSearch: React.FC = () => {
    const [cupsInput, setCupsInput] = useState('');
    const [showModal, setShowModal] = useState(false);
    const { fetchStats, data, loading, error, setError } = useStats();

    const handleSearch = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (cupsInput.trim()) {
            fetchStats(cupsInput.toUpperCase().trim());
        }
    };

    useEffect(() => {
        if (data && !error && !loading) {
            setShowModal(true);
        }
    }, [data, error, loading]); // Se dispara cada vez que uno de estos tres cambie

    /**
     * PROCESAMIENTO DE DATOS
     */
    const chartData: ChartData<'line'> = useMemo(() => {
        // Si no hay datos, devolvemos una estructura vacía pero válida
        if (!data?.lecturas || data.lecturas.length === 0) {
            return { labels: [], datasets: [] };
        }

        const groups = data.lecturas.reduce((acc: Record<string, any>, lectura: Lectura) => {
            const date = new Date(lectura.fecha);
            if (isNaN(date.getTime())) return acc;
            const horaStr = date.getHours().toString().padStart(2, '0') + ':00';

            if (!acc[horaStr]) {
                acc[horaStr] = { total: 0, cuenta: 0 };
            }
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
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    tension: 0.3,
                    borderWidth: 2,
                    pointBackgroundColor: '#198754',
                    pointRadius: 3,
                },
            ],
        };
    }, [data]);

    /**
     * CONFIGURACIÓN DEL GRÁFICO
     */
    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Consumo (kWh)', font: { size: 10 } },
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            x: {
                title: { display: true, text: 'Hora del día', font: { size: 10 } },
                grid: { display: false }
            }
        }
    };

    return (
        <>
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-success text-white py-3">
                    <h5 className="mb-0"><i className="bi bi-bar-chart-line"></i> Analítica por CUPS</h5>
                </Card.Header>
                <Card.Body className="p-4">
                    <Form onSubmit={handleSearch}>
                        <Form.Group className="mb-3">
                            <InputGroup size="lg">
                                <Form.Control
                                    placeholder="Ingrese CUPS..."
                                    value={cupsInput}
                                    onChange={(e) => setCupsInput(e.target.value)}
                                    disabled={loading}
                                />
                                <Button variant="success" type="submit" disabled={loading || !cupsInput}>
                                    {loading ? <Spinner animation="border" size="sm" /> : 'Consultar'}
                                </Button>
                            </InputGroup>
                        </Form.Group>
                    </Form>

                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                </Card.Body>
            </Card>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h6 fw-bold">Curva de Carga Horaria (Promedio)</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{ height: '400px', width: '100%' }}>
                        {/* Truco: Solo renderizamos el gráfico si hay labels. 
                            Esto evita que Chart.js intente dibujar ejes vacíos.
                        */}
                        {chartData.labels && chartData.labels.length > 0 ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : (
                            <div className="text-center py-5">No hay datos suficientes para graficar.</div>
                        )}
                    </div>
                    <p className="text-center mt-3 small text-muted">
                        Análisis basado en {data?.total_lecturas} registros para el CUPS {data?._id}.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};