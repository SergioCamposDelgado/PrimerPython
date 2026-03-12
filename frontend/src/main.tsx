// src/main.tsx

/**
 * Punto de entrada principal (Entry Point) de la aplicación Frontend.
 * Adaptado para Tailwind CSS y Font Awesome.
 */

// --- IMPORTACIÓN DE ESTILOS ---
// Tailwind CSS se inyecta a través de este archivo index.css
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

/**
 * Nota: No es necesario importar Font Awesome aquí si usas la librería de React,
 * ya que se importarán los iconos específicamente en cada componente para 
 * optimizar el tamaño del haz (bundle).
 */

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);