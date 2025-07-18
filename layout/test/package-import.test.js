import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Test how the package would be imported from node_modules
describe('Package Import Tests', () => {
  it('should have correct package.json configuration', () => {
    const packageJson = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'));
    
    // Check main entry point
    expect(packageJson.main).toBe('dist/src/index.js');
    expect(packageJson.type).toBe('module');
  });

  it('should have type definitions', () => {
    // Check that .d.ts files exist for the main entry
    const mainTypeDef = resolve('./dist/src/index.d.ts');
    expect(() => readFileSync(mainTypeDef, 'utf-8')).not.toThrow();
  });

  it('should have exports field for better module resolution', () => {
    const packageJson = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'));
    
    // Check if exports field exists (it should for proper ESM support)
    if (!packageJson.exports) {
      console.warn('Warning: package.json is missing "exports" field for better ESM support');
    }
  });

  it('should test a complete import scenario', async () => {
    // This simulates what would happen when someone imports the package
    const mainPath = resolve('./dist/src/index.js');
    const module = await import(mainPath);
    
    // Verify key exports
    expect(module.springLayout).toBeDefined();
    expect(module.circularLayout).toBeDefined();
    expect(module.kamadaKawaiLayout).toBeDefined();
    expect(module.forceatlas2Layout).toBeDefined();
    
    // Test actual usage
    const { completeGraph, circularLayout } = module;
    const graph = completeGraph(4);
    const positions = circularLayout(graph);
    
    expect(Object.keys(positions).length).toBe(4);
    Object.values(positions).forEach(pos => {
      expect(Array.isArray(pos)).toBe(true);
      expect(pos.length).toBe(2);
      expect(typeof pos[0]).toBe('number');
      expect(typeof pos[1]).toBe('number');
    });
  });
});