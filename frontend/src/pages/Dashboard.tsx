import React, { useState, useCallback } from 'react';
import { Container, Row, Col, Tab, Tabs } from 'react-bootstrap';
import { ImportadorCSV } from '../components/ImportadorCSV';
import { StatsSearch } from '../components/StatsSearch';
// Importaremos TablaLecturas en el siguiente paso
// import { TablaLecturas } from '../components/TablaLecturas';

export const Dashboard: React.FC = () => {
    // Estado para forzar el refresco de la tabla cuando se sube un CSV
    const [refreshKey, setRefreshKey] = useState(0);

    const handleUploadSuccess = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    return (
        <Container fluid className="py-4 bg-light min-vh-100">
            <Container>
                {/* Cabecera del Dashboard */}
                <Row className="mb-4">
                    <Col>
                        <h1 className="display-5 fw-bold text-dark">
                            <i className="bi bi-lightning-charge-fill text-warning me-2"></i>
                            Energy Monitor Pro
                        </h1>
                        <p className="text-muted">
                            Gestión y analítica de consumos energéticos en tiempo real.
                        </p>
                    </Col>
                </Row>

                <Row>
                    {/* Columna Izquierda: Herramientas de Carga y Analítica Rápida */}
                    <Col lg={4} className="mb-4">
                        <Stack gap={4}>
                            <ImportadorCSV onUploadSuccess={handleUploadSuccess} />
                            <StatsSearch />
                        </Stack>
                    </Col>

                    {/* Columna Derecha: Visualización de Datos */}
                    <Col lg={8}>
                        <Tabs
                            defaultActiveKey="listado"
                            id="dashboard-tabs"
                            className="mb-3 shadow-sm bg-white rounded"
                            justify
                        >
                            <Tab eventKey="listado" title={<span><i className="bi bi-table me-2"></i>Histórico</span>}>
                                <div className="p-3 bg-white border rounded shadow-sm">
                                    {/* Aquí irá nuestra TablaLecturas pasándole el refreshKey */}
                                    <div className="text-center py-5 text-muted">
                                        <i className="bi bi-arrow-left-circle me-2"></i>
                                        Utiliza el importador o busca por CUPS para ver datos.
                                        {/* <TablaLecturas key={refreshKey} /> */}
                                    </div>
                                </div>
                            </Tab>

                            <Tab eventKey="graficos" title={<span><i className="bi bi-graph-up me-2"></i>Tendencias</span>}>
                                <div className="p-5 text-center bg-white border rounded shadow-sm">
                                    <i className="bi bi-tools display-4 text-muted mb-3 d-block"></i>
                                    <h5>Módulo de Gráficos en Desarrollo</h5>
                                    <p className="text-muted">Próximamente visualización con Chart.js</p>
                                </div>
                            </Tab>
                        </Tabs>
                    </Col>
                </Row>
            </Container>
        </Container>
    );
};

// Helper interno para espaciado rápido si no usas Stack de React-Bootstrap directamente
const Stack = ({ children, gap }: { children: React.ReactNode, gap: number }) => (
    <div className={`d-grid gap-${gap}`}>
        {children}
    </div>
);