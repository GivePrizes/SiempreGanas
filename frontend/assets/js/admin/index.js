import { cargarComprobantes } from './comprobantes.js';
import { cargarStats } from './stats.js';
import { cargarGraficos } from './graficos.js';

// Inicializar comprobantes
cargarComprobantes();
setInterval(cargarComprobantes, 10000);

// Inicializar estadísticas
cargarStats();
setInterval(cargarStats, 15000);

// Inicializar gráficos
cargarGraficos();