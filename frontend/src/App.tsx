// src/App.tsx
import { Container, Row, Col, Navbar } from 'react-bootstrap';
import FileUpload from './components/FileUpload';
import StatsDashboard from './components/StatsDashboard';

/**
 * Componente Raíz: App
 * * Actúa como el orquestador visual de la aplicación. Su responsabilidad es:
 * 1. Definir la estructura global (Layout).
 * 2. Proporcionar un contexto visual consistente (Navbar y fondos).
 * 3. Gestionar la responsividad mediante el sistema de rejilla (Grid System).
 */
function App() {
  return (
    // bg-light y min-vh-100 aseguran un fondo gris tenue que cubre toda la pantalla
    <div className="bg-light min-vh-100">

      {/* Navegación Superior: Aporta identidad visual y sensación de App profesional */}
      <Navbar bg="white" className="shadow-sm mb-4 border-bottom">
        <Container>
          <Navbar.Brand className="fw-bold text-primary">
            {/* Uso de iconos de Bootstrap (bi) para mejorar la jerarquía visual */}
            <i className="bi bi-lightning-fill text-warning me-2"></i>
            React - Lectura CUPS
          </Navbar.Brand>
        </Container>
      </Navbar>

      {/* Cuerpo Principal: Limitamos el ancho para mejorar la legibilidad en monitores grandes */}
      <Container className="py-4">
        <Row className="justify-content-center">
          {/* Utilizamos Col lg={8} para que el contenido no se estire demasiado, 
            manteniendo un "aire" elegante a los lados en pantallas de escritorio.
          */}
          <Col lg={8} md={10} sm={12}>

            {/* Módulo 1: Ingesta y validación de archivos CSV */}
            <FileUpload />

            {/* Módulo 2: Visualización de métricas y analítica por CUPS */}
            <StatsDashboard />

          </Col>
        </Row>
      </Container>

      {/* Footer simple (Opcional) */}
      <footer className="text-center py-4 text-muted small">
        &copy; {new Date().getFullYear()} Energy Analytics Dashboard - Stack FARM
      </footer>
    </div>
  );
}

export default App;