// Installs Mesh.prototype.createInstance, which get() calls. This module loads it itself so any
// path that reaches get() -- including a consumer resolving the element from source -- has it.
// See test/packaging/babylon-side-effects.test.ts.
import "@babylonjs/core/Meshes/instancedMesh";

import { InstancedMesh, Mesh, type Scene } from "@babylonjs/core";

import { EdgeLineBatch } from "./EdgeLineBatch";

type MeshCreatorFn = () => Mesh;

/**
 * Cache for mesh instances to improve rendering performance
 *
 * Stores base meshes and creates instances on demand to avoid recreating
 * identical geometries. Tracks cache hits and misses for performance monitoring.
 */
export class MeshCache {
    meshCacheMap = new Map<string, Mesh>();

    /**
     * The thin-instance batches, by the same key the mesh cache uses.
     *
     * HELD HERE BECAUSE THEY DIE AT THE SAME MOMENT. A batch is the interned source mesh of one
     * edge appearance, exactly as a cached mesh is, and the 2D/3D switch and a dataset clear both
     * dispose the cache -- so anything drawn from a batch has to go with it, or an edge is left
     * holding a slot in a mesh that no longer exists.
     */
    batchCacheMap = new Map<string, EdgeLineBatch>();
    hits = 0;
    misses = 0;

    /**
     * Get or create a cached mesh instance
     * @param name - Cache key for the mesh
     * @param creator - Function to create the mesh if not cached
     * @returns Instanced mesh from cache or newly created
     */
    get(name: string, creator: MeshCreatorFn): InstancedMesh {
        let mesh = this.meshCacheMap.get(name);
        if (mesh) {
            this.hits++;
            return mesh.createInstance(name);
        }

        this.misses++;
        mesh = creator();
        // Hide the original mesh - instances will still be visible
        mesh.isVisible = false;
        mesh.position.set(0, -10000, 0);

        // CRITICAL: InstancedMesh inherits isPickable from source mesh
        // Must set pickable on source for instances to be pickable
        mesh.isPickable = true;

        mesh.freezeWorldMatrix();
        this.meshCacheMap.set(name, mesh);
        return mesh.createInstance(name);
    }

    /**
     * Get or create the thin-instance batch that draws one edge appearance.
     * @param name - Cache key for the batch, which is also the name its mesh carries.
     * @param creator - Function to build the batch's line mesh if there is no batch yet.
     * @param scene - The scene that renders it.
     * @returns The batch to take a slot in.
     */
    getBatch(name: string, creator: MeshCreatorFn, scene: Scene): EdgeLineBatch {
        const existing = this.batchCacheMap.get(name);

        if (existing) {
            this.hits++;
            return existing;
        }

        this.misses++;
        const mesh = creator();
        mesh.name = name;
        const batch: EdgeLineBatch = new EdgeLineBatch(mesh, scene, () => {
            if (this.batchCacheMap.get(name) === batch) {
                this.batchCacheMap.delete(name);
            }
        });

        this.batchCacheMap.set(name, batch);

        return batch;
    }

    /**
     * Reset cache statistics (hits and misses)
     */
    reset(): void {
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Clear all cached meshes and reset statistics
     */
    clear(): void {
        for (const mesh of this.meshCacheMap.values()) {
            MeshCache.disposeSource(mesh);
        }
        this.meshCacheMap.clear();

        for (const batch of this.batchCacheMap.values()) {
            batch.dispose();
        }

        this.batchCacheMap.clear();
        this.reset();
    }

    /**
     * Dispose and forget every cached mesh that nothing is drawn from any more.
     *
     * Every source mesh is handed out only as instances, so one with no instances is a look no
     * element has: a size a layer used to paint, a halo nobody is selected for. Without this the
     * cache holds one mesh per look ever drawn, which grows with every edit to a size or a shape
     * until the next dataset boundary. A name that is asked for again is simply built again.
     */
    prune(): void {
        for (const [name, mesh] of this.meshCacheMap) {
            if (mesh.instances.length === 0) {
                MeshCache.disposeSource(mesh);
                this.meshCacheMap.delete(name);
            }
        }
    }

    /**
     * Dispose a source mesh and the material it was built with.
     *
     * Every creator handed to get() builds a fresh material for its mesh, so the material dies
     * with it; `mesh.dispose()` alone would leave it in `scene.materials` for good. Textures are
     * kept: node gradient textures are shared across materials per scene.
     * @param mesh - The cached source mesh
     */
    private static disposeSource(mesh: Mesh): void {
        const {material} = mesh;
        mesh.dispose();
        material?.dispose(false, false);
    }

    /**
     * Get the number of cached meshes
     * @returns Count of cached meshes
     */
    size(): number {
        return this.meshCacheMap.size;
    }
}
