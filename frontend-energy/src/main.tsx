// src/main.tsx

/**
 * Punto de entrada principal (Entry Point) de la aplicación Frontend.
 * * Este archivo se encarga de:
 * 1. Importar los estilos globales y frameworks de UI.
 * 2. Seleccionar el nodo raíz del HTML.
 * 3. Montar la instancia de React mediante el nuevo API 'createRoot' de React 18.
 */

// --- IMPORTACIÓN DE ESTILOS ---
// Framework de diseño base (CSS de Bootstrap)
import 'bootstrap/dist/css/bootstrap.min.css';
// Librería de iconos vectoriales para botones y estados
import 'bootstrap-icons/font/bootstrap-icons.css';
// Estilos personalizados y variables de diseño propias
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

/**
 * Inicialización del Renderizado.
 * * El símbolo '!' tras getElementById asegura a TypeScript que el elemento 'root' 
 * existe en el index.html, evitando comprobaciones de nulidad innecesarias.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  /**
   * React.StrictMode:
   * Envoltorio que ayuda a identificar efectos secundarios y prácticas obsoletas 
   * durante el desarrollo. No afecta al rendimiento en producción.
   */
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);