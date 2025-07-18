import { describe, it, expect } from 'vitest';

// Test basic module import from built files
describe('Module Import Tests', () => {
  it('should import the module from dist without errors', async () => {
    const module = await import('../dist/src/index.js');
    expect(module).toBeDefined();
  });

  it('should export all layout functions from dist', async () => {
    const {
      springLayout,
      circularLayout,
      randomLayout,
      spectralLayout,
      shellLayout,
      bipartiteLayout,
      multipartiteLayout,
      kamadaKawaiLayout,
      forceatlas2Layout,
      arfLayout,
      spiralLayout,
      bfsLayout,
      planarLayout,
      rescaleLayout,
      rescaleLayoutDict
    } = await import('../dist/src/index.js');

    // Check that all functions are defined
    expect(springLayout).toBeDefined();
    expect(typeof springLayout).toBe('function');
    
    expect(circularLayout).toBeDefined();
    expect(typeof circularLayout).toBe('function');
    
    expect(randomLayout).toBeDefined();
    expect(typeof randomLayout).toBe('function');
    
    expect(spectralLayout).toBeDefined();
    expect(typeof spectralLayout).toBe('function');
    
    expect(shellLayout).toBeDefined();
    expect(typeof shellLayout).toBe('function');
    
    expect(bipartiteLayout).toBeDefined();
    expect(typeof bipartiteLayout).toBe('function');
    
    expect(multipartiteLayout).toBeDefined();
    expect(typeof multipartiteLayout).toBe('function');
    
    expect(kamadaKawaiLayout).toBeDefined();
    expect(typeof kamadaKawaiLayout).toBe('function');
    
    expect(forceatlas2Layout).toBeDefined();
    expect(typeof forceatlas2Layout).toBe('function');
    
    expect(arfLayout).toBeDefined();
    expect(typeof arfLayout).toBe('function');
    
    expect(spiralLayout).toBeDefined();
    expect(typeof spiralLayout).toBe('function');
    
    expect(bfsLayout).toBeDefined();
    expect(typeof bfsLayout).toBe('function');
    
    expect(planarLayout).toBeDefined();
    expect(typeof planarLayout).toBe('function');
    
    expect(rescaleLayout).toBeDefined();
    expect(typeof rescaleLayout).toBe('function');
    
    expect(rescaleLayoutDict).toBeDefined();
    expect(typeof rescaleLayoutDict).toBe('function');
  });

  it('should also export graph generator functions from dist', async () => {
    const {
      completeGraph,
      cycleGraph,
      starGraph,
      wheelGraph,
      gridGraph,
      randomGraph,
      bipartiteGraph,
      scaleFreeGraph
    } = await import('../dist/src/index.js');

    expect(completeGraph).toBeDefined();
    expect(typeof completeGraph).toBe('function');
    
    expect(cycleGraph).toBeDefined();
    expect(typeof cycleGraph).toBe('function');
    
    expect(starGraph).toBeDefined();
    expect(typeof starGraph).toBe('function');
    
    expect(wheelGraph).toBeDefined();
    expect(typeof wheelGraph).toBe('function');
    
    expect(gridGraph).toBeDefined();
    expect(typeof gridGraph).toBe('function');
    
    expect(randomGraph).toBeDefined();
    expect(typeof randomGraph).toBe('function');
    
    expect(bipartiteGraph).toBeDefined();
    expect(typeof bipartiteGraph).toBe('function');
    
    expect(scaleFreeGraph).toBeDefined();
    expect(typeof scaleFreeGraph).toBe('function');
  });

  it('should be able to use an imported layout function', async () => {
    const { circularLayout, completeGraph } = await import('../dist/src/index.js');
    
    // Create a simple graph
    const graph = completeGraph(5);
    
    // Apply layout
    const positions = circularLayout(graph);
    
    // Check results
    expect(positions).toBeDefined();
    expect(Object.keys(positions).length).toBe(5);
    
    // Check that each node has a position
    for (let i = 0; i < 5; i++) {
      expect(positions[i]).toBeDefined();
      expect(Array.isArray(positions[i])).toBe(true);
      expect(positions[i].length).toBe(2); // 2D by default
    }
  });
});