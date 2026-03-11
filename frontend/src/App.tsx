import { useState, useCallback, useEffect } from 'react';
import { Container, Row, Col, Navbar, Stack, Button } from 'react-bootstrap';
import { ImportadorCSV } from './components/ImportadorCSV';
import { StatsSearch } from './components/StatsSearch';
import { TablaLecturas } from './components/TablaLecturas';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Estado para el tema, persistido en localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.setAttribute('data-bs-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.setAttribute('data-bs-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleUploadSuccess = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    // Eliminamos 'bg-light' y 'bg-white' fijos para que Bootstrap use sus colores de tema
    <div className="min-vh-100 d-flex flex-column bg-body-tertiary">

      {/* Navegación Superior */}
      <Navbar bg="body" className="shadow-sm mb-4 border-bottom">
        <Container>
          <Navbar.Brand className="fw-bold text-primary d-flex align-items-center">
            <i className="bi bi-lightning-charge-fill text-warning me-2 fs-3"></i>
            <span className="text-body">
              Graficos de CUPS <small className="text-muted fw-light">v1.0</small>
            </span>
          </Navbar.Brand>

          {/* Switch de Tema */}
          <Button
            variant={darkMode ? "outline-warning" : "outline-primary"}
            onClick={() => setDarkMode(!darkMode)}
            className="d-flex align-items-center"
          >
            <i className={`bi ${darkMode ? 'bi-sun-fill' : 'bi-moon-stars-fill'} `}></i>
          </Button>
        </Container>
      </Navbar>

      {/* Cuerpo Principal */}
      <Container className="flex-grow-1 pb-5">
        <Row className="g-4">
          <Col lg={4}>
            <Stack gap={4}>
              <ImportadorCSV onUploadSuccess={handleUploadSuccess} />
              <StatsSearch />
            </Stack>
          </Col>

          <Col lg={8}>
            {/* Pasamos darkMode como prop si necesitas ajustar colores de Chart.js internamente */}
            <TablaLecturas key={refreshKey} />
          </Col>
        </Row>
      </Container>

      {/* Footer */}
      <footer className="bg-body border-top py-4 text-center text-muted mt-auto">
        <Container>
          <p className="mb-0 small">
            &copy; 2026 <strong>Sergio Campos Delgado</strong> —
            Hecho con MongoDB, FastAPI, React & Bootstrap
          </p>

          <a href="https://github.com/sergiocamposdelgado/" target="_blank" rel="noopener noreferrer" className="text-decoration-none text-muted me-2">
            <i className="bi bi-github fs-4"></i>
          </a>
          <a href="https://www.linkedin.com/in/sergio-campos-delgado-95a222281/" target="_blank" rel="noopener noreferrer" className="text-decoration-none text-primary">
            <i className="bi bi-linkedin fs-4"></i>
          </a>
        </Container>
      </footer>
    </div>
  );
}

export default App;