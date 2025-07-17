// Helper file to make functions available globally for button onclick handlers
import { randomLayout, circularLayout, shellLayout, springLayout, fruchtermanReingoldLayout, 
         spectralLayout, spiralLayout, bipartiteLayout, multipartiteLayout, bfsLayout, 
         planarLayout, kamadaKawaiLayout, forceatlas2Layout, arfLayout, rescaleLayout, 
         rescaleLayoutDict } from './layout.js';

// Make layout functions available globally
window.randomLayout = randomLayout;
window.circularLayout = circularLayout;
window.shellLayout = shellLayout;
window.springLayout = springLayout;
window.fruchtermanReingoldLayout = fruchtermanReingoldLayout;
window.spectralLayout = spectralLayout;
window.spiralLayout = spiralLayout;
window.bipartiteLayout = bipartiteLayout;
window.multipartiteLayout = multipartiteLayout;
window.bfsLayout = bfsLayout;
window.planarLayout = planarLayout;
window.kamadaKawaiLayout = kamadaKawaiLayout;
window.forceatlas2Layout = forceatlas2Layout;
window.arfLayout = arfLayout;
window.rescaleLayout = rescaleLayout;
window.rescaleLayoutDict = rescaleLayoutDict;