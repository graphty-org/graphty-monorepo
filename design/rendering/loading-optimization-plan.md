# Loading Optimization Plan for graphty-element

## Executive Summary

The graphty-element package currently produces a ~4.2MB JavaScript bundle (30MB with source maps). The primary contributor is Babylon.js, which is included due to non-optimal import patterns. This document outlines a comprehensive strategy to reduce bundle size by 50-70% through import path optimization, lazy loading patterns, and architectural improvements.

**Estimated Impact:**
| Strategy | Effort | Bundle Reduction | Priority |
|----------|--------|------------------|----------|
| Import Path Optimization | Medium | ~1.5-2MB (35-50%) | **P0** |
| Lazy Engine Initialization | High | Variable | P1 |
| Multiple Entry Points | Medium | N/A (consumer benefit) | P2 |
| Consumer-side Code Splitting | Low | Variable | P2 |

---

## Current State Analysis

### Bundle Metrics

```
Total dist/ size: 30MB (with source maps)
JavaScript only:  4.2MB
Main entry point: 4KB (re-exports only)
Largest chunks:   Babylon.js shaders and core modules
```

### Import Audit

**Files importing from `@babylonjs/core` (non-optimized):** 35 files

**Files using specific import paths (optimized):** 7 files

#### Non-Optimized Imports (Must Fix)

| File | Imports from `@babylonjs/core` |
|------|-------------------------------|
| `Graph.ts` | AbstractMesh, Animation, Camera, Color4, CubicEase, EasingFunction, Engine, PhotoDome, Quaternion, Scene, Vector3, WebGPUEngine, WebXRDefaultExperience |
| `Node.ts` | Color3, Material, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 |
| `Edge.ts` | Color3, InstancedMesh, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 |
| `NodeBehavior.ts` | AbstractMesh, Animation, Color3, CubicEase, EasingFunction, Mesh, Scene, TransformNode, Vector3 |
| `managers/RenderManager.ts` | Color4, Engine, Scene, Tools, Vector3, WebGPUEngine |
| `managers/StatsManager.ts` | Engine, PerfCounter, Scene |
| `managers/EventManager.ts` | Observable |
| `managers/UpdateManager.ts` | Mesh, Vector3 (type imports) |
| `managers/GraphContext.ts` | Scene (type import) |
| `managers/interfaces.ts` | Engine, Scene, WebGPUEngine (type imports) |
| `meshes/NodeMesh.ts` | Color3, InstancedMesh, Material, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 |
| `meshes/EdgeMesh.ts` | Color3, GreasedLineMesh, InstancedMesh, Material, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 |
| `meshes/MeshCache.ts` | InstancedMesh, Mesh |
| `meshes/MaterialHelper.ts` | Color3, Mesh, Scene, StandardMaterial |
| `meshes/RichTextLabel.ts` | AbstractMesh, Color3, DynamicTexture, Engine, Mesh, MeshBuilder, Scene, StandardMaterial, Texture, Vector3 |
| `meshes/RichTextAnimator.ts` | Color3, Mesh, Scene, StandardMaterial, Vector3 |
| `meshes/PatternedLineMesh.ts` | Mesh, Scene, ShaderMaterial, Vector3 |
| `meshes/PatternedLineRenderer.ts` | Color3, InstancedMesh, Material, Mesh, MeshBuilder, Scene, ShaderMaterial, StandardMaterial, Vector3, VertexBuffer, VertexData |
| `meshes/CustomLineRenderer.ts` | Color3, InstancedMesh, Material, Mesh, MeshBuilder, Scene, ShaderMaterial, StandardMaterial, Vector3, VertexBuffer, VertexData |
| `meshes/FilledArrowRenderer.ts` | Color3, Material, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3, VertexData |
| `meshes/Simple2DLineRenderer.ts` | Color3, Mesh, Scene, StandardMaterial, Vector3, VertexData |
| `cameras/CameraManager.ts` | Camera, Scene, Vector3 |
| `cameras/OrbitCameraController.ts` | Camera, Color4, Scalar, Scene, TransformNode, UniversalCamera, Vector3 |
| `cameras/TwoDCameraController.ts` | Camera, Engine, FreeCamera, Scene, TransformNode, Vector3, WebGPUEngine |
| `cameras/TwoDInputController.ts` | Observer, PointerEventTypes, PointerInfo, PointerInfoPre |
| `cameras/PivotController.ts` | Axis, Quaternion, Scene, Space, TransformNode, Vector3 |
| `cameras/XRPivotCameraController.ts` | Scene, TransformNode, WebXRDefaultExperience, WebXRState |
| `cameras/XRInputHandler.ts` | Quaternion, Ray, Scene, Vector3, WebXRDefaultExperience, WebXRInputSource |
| `camera/presets.ts` | ArcRotateCamera, Camera |
| `xr/XRSessionManager.ts` | Camera, Scene, WebXRDefaultExperience (type imports) |
| `xr-button.ts` | WebXRDefaultExperience, WebXREnterExitUIButton, WebXREnterExitUIOptions, WebXRState |
| `screenshot/ScreenshotCapture.ts` | Camera, Color4, CreateScreenshot, DumpTools, Engine, Scene, Vector3 |
| `screenshot/transparency.ts` | BaseTexture, Color4, Mesh, Scene |
| `video/CameraPathAnimator.ts` | Animation, ArcRotateCamera, Camera, Quaternion, Scene, Vector3 |
| `input/babylon-input-system.ts` | KeyboardEventTypes, PointerEventTypes, PointerInfo, Scene |

#### Already Optimized Imports (Reference)

| File | Import Path |
|------|-------------|
| `input/babylon-input-system.ts` | `@babylonjs/core/Maths/math.vector` (Vector2) |
| `input/babylon-input-system.ts` | `@babylonjs/core/Misc/observable` (Observable) |
| `input/mock-device-input-system.ts` | `@babylonjs/core/Maths/math.vector` (Vector2) |
| `input/mock-device-input-system.ts` | `@babylonjs/core/Misc/observable` (Observable) |
| `meshes/EdgeMesh.ts` | `@babylonjs/core/Meshes/Builders/greasedLineBuilder` (CreateGreasedLine) |
| `managers/InputManager.ts` | `@babylonjs/core/Maths/math.vector` (Vector2) |
| `managers/InputManager.ts` | `@babylonjs/core/Misc/observable` (Observable) |

---

## Strategy 1: Import Path Optimization (P0)

### Overview

Convert all imports from `@babylonjs/core` to specific module paths. According to Babylon.js documentation, this can reduce the Babylon.js portion of the bundle from ~2.3MB to ~700KB (70% reduction).

### Complete Import Path Mapping

#### Engines

| Class | Optimized Import Path |
|-------|----------------------|
| `Engine` | `@babylonjs/core/Engines/engine` |
| `WebGPUEngine` | `@babylonjs/core/Engines/webgpuEngine` |
| `NullEngine` | `@babylonjs/core/Engines/nullEngine` |

#### Scene

| Class | Optimized Import Path |
|-------|----------------------|
| `Scene` | `@babylonjs/core/scene` |

#### Math

| Class | Optimized Import Path |
|-------|----------------------|
| `Vector2` | `@babylonjs/core/Maths/math.vector` |
| `Vector3` | `@babylonjs/core/Maths/math.vector` |
| `Quaternion` | `@babylonjs/core/Maths/math.vector` |
| `Color3` | `@babylonjs/core/Maths/math.color` |
| `Color4` | `@babylonjs/core/Maths/math.color` |
| `Scalar` | `@babylonjs/core/Maths/math.scalar` |
| `Axis` | `@babylonjs/core/Maths/math.axis` |
| `Space` | `@babylonjs/core/Maths/math.axis` |
| `Ray` | `@babylonjs/core/Culling/ray` |

#### Cameras

| Class | Optimized Import Path |
|-------|----------------------|
| `Camera` | `@babylonjs/core/Cameras/camera` |
| `FreeCamera` | `@babylonjs/core/Cameras/freeCamera` |
| `UniversalCamera` | `@babylonjs/core/Cameras/universalCamera` |
| `ArcRotateCamera` | `@babylonjs/core/Cameras/arcRotateCamera` |
| `TargetCamera` | `@babylonjs/core/Cameras/targetCamera` |

#### Meshes

| Class | Optimized Import Path |
|-------|----------------------|
| `AbstractMesh` | `@babylonjs/core/Meshes/abstractMesh` |
| `Mesh` | `@babylonjs/core/Meshes/mesh` |
| `InstancedMesh` | `@babylonjs/core/Meshes/instancedMesh` |
| `TransformNode` | `@babylonjs/core/Meshes/transformNode` |
| `VertexData` | `@babylonjs/core/Meshes/mesh.vertexData` |
| `VertexBuffer` | `@babylonjs/core/Buffers/buffer` |
| `GreasedLineMesh` | `@babylonjs/core/Meshes/GreasedLine/greasedLineMesh` |

#### Mesh Builders (Side-Effect Imports)

| Function | Optimized Import Path |
|----------|----------------------|
| `MeshBuilder` | Requires side-effect imports (see below) |
| `CreateSphere` | `@babylonjs/core/Meshes/Builders/sphereBuilder` |
| `CreateBox` | `@babylonjs/core/Meshes/Builders/boxBuilder` |
| `CreateCylinder` | `@babylonjs/core/Meshes/Builders/cylinderBuilder` |
| `CreatePlane` | `@babylonjs/core/Meshes/Builders/planeBuilder` |
| `CreateLines` | `@babylonjs/core/Meshes/Builders/linesBuilder` |
| `CreateGreasedLine` | `@babylonjs/core/Meshes/Builders/greasedLineBuilder` |

**Important:** To use `MeshBuilder.CreateX()` syntax, you must import the builder as a side effect:
```typescript
// Side-effect import to enable MeshBuilder.CreateSphere
import "@babylonjs/core/Meshes/Builders/sphereBuilder";
import {MeshBuilder} from "@babylonjs/core/Meshes/meshBuilder";

// Or use direct function import (preferred)
import {CreateSphere} from "@babylonjs/core/Meshes/Builders/sphereBuilder";
```

#### Materials

| Class | Optimized Import Path |
|-------|----------------------|
| `Material` | `@babylonjs/core/Materials/material` |
| `StandardMaterial` | `@babylonjs/core/Materials/standardMaterial` |
| `ShaderMaterial` | `@babylonjs/core/Materials/shaderMaterial` |

#### Textures

| Class | Optimized Import Path |
|-------|----------------------|
| `Texture` | `@babylonjs/core/Materials/Textures/texture` |
| `DynamicTexture` | `@babylonjs/core/Materials/Textures/dynamicTexture` |
| `BaseTexture` | `@babylonjs/core/Materials/Textures/baseTexture` |

#### Animations

| Class | Optimized Import Path |
|-------|----------------------|
| `Animation` | `@babylonjs/core/Animations/animation` |
| `EasingFunction` | `@babylonjs/core/Animations/easing` |
| `CubicEase` | `@babylonjs/core/Animations/easing` |

#### Misc/Utilities

| Class | Optimized Import Path |
|-------|----------------------|
| `Observable` | `@babylonjs/core/Misc/observable` |
| `Observer` | `@babylonjs/core/Misc/observable` |
| `Tools` | `@babylonjs/core/Misc/tools` |
| `DumpTools` | `@babylonjs/core/Misc/dumpTools` |
| `PerfCounter` | `@babylonjs/core/Misc/perfCounter` |

#### Events/Input

| Class | Optimized Import Path |
|-------|----------------------|
| `PointerEventTypes` | `@babylonjs/core/Events/pointerEvents` |
| `PointerInfo` | `@babylonjs/core/Events/pointerEvents` |
| `PointerInfoPre` | `@babylonjs/core/Events/pointerEvents` |
| `KeyboardEventTypes` | `@babylonjs/core/Events/keyboardEvents` |

#### XR (WebXR)

| Class | Optimized Import Path |
|-------|----------------------|
| `WebXRDefaultExperience` | `@babylonjs/core/XR/webXRDefaultExperience` |
| `WebXRState` | `@babylonjs/core/XR/webXRTypes` |
| `WebXRInputSource` | `@babylonjs/core/XR/webXRInputSource` |
| `WebXREnterExitUIButton` | `@babylonjs/core/XR/webXREnterExitUI` |
| `WebXREnterExitUIOptions` | `@babylonjs/core/XR/webXREnterExitUI` |

#### Screenshot

| Function | Optimized Import Path |
|----------|----------------------|
| `CreateScreenshot` | `@babylonjs/core/Misc/screenshotTools` |

#### Special Classes

| Class | Optimized Import Path |
|-------|----------------------|
| `PhotoDome` | `@babylonjs/core/Helpers/photoDome` |

### Implementation Plan

#### Phase 1: Create Centralized Re-export Module (Optional)

To simplify migration and maintain consistency, consider creating an internal barrel file:

```typescript
// src/babylon-imports.ts
// Centralized Babylon.js imports with optimized paths

// Engines
export {Engine} from "@babylonjs/core/Engines/engine";
export {WebGPUEngine} from "@babylonjs/core/Engines/webgpuEngine";

// Scene
export {Scene} from "@babylonjs/core/scene";

// Math
export {Vector2, Vector3, Quaternion} from "@babylonjs/core/Maths/math.vector";
export {Color3, Color4} from "@babylonjs/core/Maths/math.color";
export {Scalar} from "@babylonjs/core/Maths/math.scalar";
export {Axis, Space} from "@babylonjs/core/Maths/math.axis";

// ... etc
```

**Pros:** Single place to manage imports, easier migration
**Cons:** Slightly more indirection, potential for over-importing

**Recommendation:** Do NOT use a barrel file. Import directly in each file for maximum tree-shaking effectiveness.

#### Phase 2: Migrate Files in Dependency Order

Migrate files from leaves to roots to minimize breakage:

1. **Wave 1: Utility/Type-only files**
   - `managers/interfaces.ts`
   - `managers/GraphContext.ts`
   - `managers/UpdateManager.ts`
   - `xr/XRSessionManager.ts`
   - `screenshot/transparency.ts`

2. **Wave 2: Standalone modules**
   - `managers/EventManager.ts`
   - `input/babylon-input-system.ts`
   - `camera/presets.ts`
   - `meshes/MeshCache.ts`
   - `meshes/MaterialHelper.ts`

3. **Wave 3: Mesh renderers**
   - `meshes/Simple2DLineRenderer.ts`
   - `meshes/RichTextAnimator.ts`
   - `meshes/RichTextLabel.ts`
   - `meshes/PatternedLineMesh.ts`
   - `meshes/PatternedLineRenderer.ts`
   - `meshes/CustomLineRenderer.ts`
   - `meshes/FilledArrowRenderer.ts`

4. **Wave 4: Core mesh classes**
   - `meshes/NodeMesh.ts`
   - `meshes/EdgeMesh.ts`

5. **Wave 5: Camera system**
   - `cameras/PivotController.ts`
   - `cameras/TwoDInputController.ts`
   - `cameras/CameraManager.ts`
   - `cameras/OrbitCameraController.ts`
   - `cameras/TwoDCameraController.ts`
   - `cameras/XRInputHandler.ts`
   - `cameras/XRPivotCameraController.ts`

6. **Wave 6: Managers**
   - `managers/StatsManager.ts`
   - `managers/RenderManager.ts`

7. **Wave 7: XR and Screenshot**
   - `xr-button.ts`
   - `screenshot/ScreenshotCapture.ts`
   - `video/CameraPathAnimator.ts`

8. **Wave 8: Core entity classes**
   - `NodeBehavior.ts`
   - `Node.ts`
   - `Edge.ts`
   - `Graph.ts`

#### Phase 3: Update package.json sideEffects

After migration, update `sideEffects` in `package.json` to ensure bundlers can tree-shake effectively:

```json
{
  "sideEffects": [
    "./dist/graphty.js",
    "./dist/graphty.umd.cjs",
    "./src/layout/index.ts",
    "./src/data/index.ts",
    "./src/algorithms/index.ts"
  ]
}
```

#### Phase 4: Verify and Measure

1. Build the package: `npm run build`
2. Measure new bundle size
3. Run all tests to ensure no regressions
4. Test in consumer applications (graphty React app)

### Example Migration

**Before (Node.ts):**
```typescript
import {
    Color3,
    Material,
    Mesh,
    MeshBuilder,
    Scene,
    StandardMaterial,
    TransformNode,
    Vector3,
} from "@babylonjs/core";
```

**After (Node.ts):**
```typescript
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Color3} from "@babylonjs/core/Maths/math.color";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {TransformNode} from "@babylonjs/core/Meshes/transformNode";
import {Material} from "@babylonjs/core/Materials/material";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {Scene} from "@babylonjs/core/scene";

// Side-effect imports for MeshBuilder methods used
import "@babylonjs/core/Meshes/Builders/sphereBuilder";
import "@babylonjs/core/Meshes/Builders/boxBuilder";
import {MeshBuilder} from "@babylonjs/core/Meshes/meshBuilder";
```

**Or using direct builder functions (preferred):**
```typescript
import {CreateSphere} from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import {CreateBox} from "@babylonjs/core/Meshes/Builders/boxBuilder";

// Usage: CreateSphere("name", options, scene) instead of MeshBuilder.CreateSphere(...)
```

---

## Strategy 2: Lazy Engine Initialization (P1)

### Overview

Defer loading of Babylon.js until the component actually needs to render. This doesn't reduce total bundle size but dramatically improves initial page load time.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    <graphty-element>                         │
│                                                              │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │  Loading UI  │───▶│  Heavy Babylon.js Engine Module  │   │
│  │   (inline)   │    │         (lazy loaded)            │   │
│  └──────────────┘    └──────────────────────────────────┘   │
│         │                          │                         │
│         ▼                          ▼                         │
│    Immediate                  On First Render                │
│    (~10KB)                      (~2MB+)                      │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Approach

#### Option A: Dynamic Import in connectedCallback

```typescript
// graphty-element.ts
@customElement("graphty-element")
export class Graphty extends LitElement {
    private engineModule?: typeof import("./engine-module");
    private initPromise?: Promise<void>;

    connectedCallback(): void {
        super.connectedCallback();
        this.initPromise = this.initializeEngine();
    }

    private async initializeEngine(): Promise<void> {
        // Show loading state
        this.requestUpdate();

        // Dynamically import heavy module
        this.engineModule = await import("./engine-module");

        // Initialize engine
        await this.engineModule.createEngine(this.canvas);

        // Update to render actual content
        this.requestUpdate();
    }

    render(): TemplateResult {
        if (!this.engineModule) {
            return html`<div class="loading">Loading 3D engine...</div>`;
        }
        return html`<canvas></canvas>`;
    }
}
```

#### Option B: Separate "Lite" Entry Point

Create a lightweight entry that registers the custom element but defers engine loading:

```typescript
// graphty-lite.ts - ~10KB entry point
@customElement("graphty-element")
export class GraphtyLite extends LitElement {
    // Lightweight shell that loads full implementation on demand
}

// graphty-full.ts - Full implementation (~2MB+)
export class GraphtyFull {
    // All Babylon.js functionality
}
```

### Considerations

- **Pros:** Faster initial page load, better perceived performance
- **Cons:** Complexity, potential flash of loading state, harder to test
- **Recommendation:** Implement after Strategy 1 is complete

---

## Strategy 3: Multiple Entry Points (P2)

### Overview

Publish multiple entry points for different use cases:

```json
{
  "exports": {
    ".": {
      "import": "./dist/graphty.js",
      "require": "./dist/graphty.umd.cjs"
    },
    "./lite": {
      "import": "./dist/graphty-lite.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts"
    }
  }
}
```

### Entry Points

| Entry Point | Contents | Size Target |
|-------------|----------|-------------|
| `@graphty/graphty-element` | Full package | ~700KB-1MB |
| `@graphty/graphty-element/lite` | No XR, minimal features | ~400KB |
| `@graphty/graphty-element/types` | TypeScript types only | 0KB (types) |

### Implementation

Would require:
1. Conditional compilation or separate builds
2. Feature flags in the codebase
3. Documentation for consumers on which entry point to use

---

## Strategy 4: Consumer-Side Code Splitting (P2)

### Overview

Document patterns for consumers (like the graphty React app) to lazy-load graphty-element.

### React Example

```tsx
// GraphtyLazy.tsx
import {lazy, Suspense} from "react";

const GraphtyElement = lazy(() => import("@graphty/graphty-element").then(() => {
    // Custom element is now registered
    return {default: () => <graphty-element />};
}));

export function GraphtyLazy(props) {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <GraphtyElement {...props} />
        </Suspense>
    );
}
```

### Vite Configuration for Consumers

```typescript
// vite.config.ts in consumer app
build: {
    rollupOptions: {
        output: {
            manualChunks: {
                'babylon': ['@babylonjs/core'],
                'graphty': ['@graphty/graphty-element'],
            }
        }
    }
}
```

---

## Implementation Timeline

### Phase 1: Import Path Optimization (P0)
- **Scope:** 35 files
- **Estimated LOC Changes:** ~200-300 lines
- **Risk:** Low (pure refactoring, no behavior change)
- **Verification:** All existing tests must pass, bundle size must decrease

### Phase 2: Measure and Document
- Measure actual bundle size reduction
- Update README with bundle size badges
- Document import patterns for contributors

### Phase 3: Lazy Loading (P1)
- Implement after validating Strategy 1 results
- Requires significant architectural changes

### Phase 4: Entry Points (P2)
- Only if there's clear demand from consumers
- Requires build system changes

---

## Success Metrics

| Metric | Current | Target (Strategy 1) | Target (All Strategies) |
|--------|---------|---------------------|------------------------|
| JavaScript Bundle | 4.2MB | ~1.5-2MB | ~1-1.5MB |
| Initial Load Time | Baseline | -30% | -50% |
| Time to Interactive | Baseline | -20% | -40% |

---

## Risks and Mitigations

### Risk 1: Missing Side-Effect Imports

**Risk:** Some Babylon.js features require side-effect imports that may be missed during migration.

**Mitigation:**
- Comprehensive testing after each wave of changes
- Visual regression tests in Storybook
- Test all MeshBuilder usage explicitly

### Risk 2: Type-Only Imports Breaking at Runtime

**Risk:** `import type` may need to become regular imports for runtime usage.

**Mitigation:**
- Review each `import type` usage carefully
- Ensure values needed at runtime are not type-only imports

### Risk 3: WebGPU Engine Loading Issues

**Risk:** WebGPU engine has different module structure than WebGL engine.

**Mitigation:**
- Test both engine types explicitly
- May need conditional imports

### Risk 4: Breaking Changes for Consumers

**Risk:** If we change exports, consumers may break.

**Mitigation:**
- Maintain backward compatibility in exports
- Internal changes only (import paths within the package)
- No changes to public API

---

## References

- [Babylon.js ES6 Support with Tree Shaking](https://doc.babylonjs.com/setup/frameworkPackages/es6Support)
- [Babylon.js GitHub - ES6 Readme](https://github.com/BabylonJS/Babylon.js/blob/master/readme-es6.md)
- [Vite Code Splitting Documentation](https://vitejs.dev/guide/build.html#chunking-strategy)
- [Mantine Bundle Size Management](https://mantine.dev/guides/bundler/)

---

## Appendix A: Full File-by-File Migration Checklist

### Wave 1: Type-only Files

- [ ] `managers/interfaces.ts`
  - [ ] `Engine` → `@babylonjs/core/Engines/engine`
  - [ ] `Scene` → `@babylonjs/core/scene`
  - [ ] `WebGPUEngine` → `@babylonjs/core/Engines/webgpuEngine`

- [ ] `managers/GraphContext.ts`
  - [ ] `Scene` → `@babylonjs/core/scene`

- [ ] `managers/UpdateManager.ts`
  - [ ] `Mesh` → `@babylonjs/core/Meshes/mesh`
  - [ ] `Vector3` → `@babylonjs/core/Maths/math.vector`

- [ ] `xr/XRSessionManager.ts`
  - [ ] `Camera` → `@babylonjs/core/Cameras/camera`
  - [ ] `Scene` → `@babylonjs/core/scene`
  - [ ] `WebXRDefaultExperience` → `@babylonjs/core/XR/webXRDefaultExperience`

- [ ] `screenshot/transparency.ts`
  - [ ] `BaseTexture` → `@babylonjs/core/Materials/Textures/baseTexture`
  - [ ] `Color4` → `@babylonjs/core/Maths/math.color`
  - [ ] `Mesh` → `@babylonjs/core/Meshes/mesh`
  - [ ] `Scene` → `@babylonjs/core/scene`

### Wave 2: Standalone Modules

- [ ] `managers/EventManager.ts`
  - [ ] `Observable` → `@babylonjs/core/Misc/observable`

- [ ] `camera/presets.ts`
  - [ ] `ArcRotateCamera` → `@babylonjs/core/Cameras/arcRotateCamera`
  - [ ] `Camera` → `@babylonjs/core/Cameras/camera`

- [ ] `meshes/MeshCache.ts`
  - [ ] `InstancedMesh` → `@babylonjs/core/Meshes/instancedMesh`
  - [ ] `Mesh` → `@babylonjs/core/Meshes/mesh`

- [ ] `meshes/MaterialHelper.ts`
  - [ ] `Color3` → `@babylonjs/core/Maths/math.color`
  - [ ] `Mesh` → `@babylonjs/core/Meshes/mesh`
  - [ ] `Scene` → `@babylonjs/core/scene`
  - [ ] `StandardMaterial` → `@babylonjs/core/Materials/standardMaterial`

### Wave 3-8: See Implementation Plan Above

---

## Appendix B: Automated Migration Script (Optional)

A codemod script could be created to automate the migration:

```typescript
// scripts/migrate-babylon-imports.ts
// Usage: npx ts-node scripts/migrate-babylon-imports.ts

const IMPORT_MAP = {
    'Engine': '@babylonjs/core/Engines/engine',
    'Scene': '@babylonjs/core/scene',
    'Vector3': '@babylonjs/core/Maths/math.vector',
    // ... complete mapping
};

// Implementation would use ts-morph or jscodeshift
```

**Recommendation:** Manual migration is safer for this scope. Automated migration introduces risk of missed edge cases.
