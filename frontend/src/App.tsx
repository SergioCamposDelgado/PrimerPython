import { useState, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoltLightning,
  faSun,
  faMoon,
} from '@fortawesome/free-solid-svg-icons';
import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons';

import { ImportadorCSV } from './components/ImportadorCSV';
import { StatsSearch } from './components/StatsSearch';
import { TablaLecturas } from './components/TablaLecturas';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  // 1. Estado para el tema, persistido en localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // 2. Efecto para aplicar la clase 'dark' al <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleUploadSuccess = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300 text-slate-900 dark:text-slate-100">

      {/* Navegación Superior */}
      <nav className="bg-white dark:bg-slate-800 shadow-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faBoltLightning}
              className="text-yellow-500 text-2xl"
            />
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">
              Gráficos de CUPS <small className="text-slate-400 font-light text-sm ml-1">v1.0</small>
            </h1>
          </div>

          {/* Botón de cambio de tema */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 px-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all shadow-sm"
          >
            <FontAwesomeIcon
              icon={darkMode ? faSun : faMoon}
              className={darkMode ? "text-yellow-400" : "text-blue-400"}
            />
          </button>
        </div>
      </nav>

      {/* Cuerpo Principal */}
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Columna Izquierda (Acciones) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <ImportadorCSV onUploadSuccess={handleUploadSuccess} />
            <StatsSearch />
          </div>

          {/* Columna Derecha (Tabla) */}
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <TablaLecturas key={refreshKey} />
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            &copy; 2026 <strong className="text-slate-700 dark:text-slate-200">Sergio Campos Delgado</strong> —
            Hecho con MongoDB, FastAPI, React & Tailwind v4
          </p>

          <div className="flex justify-center gap-6">
            <a
              href="https://github.com/sergiocamposdelgado/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <FontAwesomeIcon icon={faGithub} size="2x" />
            </a>
            <a
              href="https://www.linkedin.com/in/sergio-campos-delgado-95a222281/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-600 transition-colors"
            >
              <FontAwesomeIcon icon={faLinkedin} size="2x" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App; 