// Installs Mesh.prototype.createInstance, which get() calls. This module loads it itself so any
// path that reaches get() -- including a consumer resolving the element from source -- has it.
// See test/packaging/babylon-side-effects.test.ts.
import "@babylonjs/core/Meshes/instancedMesh.js";

import type { InstancedMesh } from "@babylonjs/core";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { EdgeLineBatch } from "./EdgeLineBatch";
import { NodeBatch } from "./NodeBatch";
import type { PulledLineBatch } from "./PulledLineBatch";

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

    /** Pulled line batches by look, cleared with the rest so a 2D switch rebuilds their edges. */
    pulledBatchMap = new Map<string, PulledLineBatch>();

    /** The node batches, by the source mesh they share a material with, which they die with. */
    nodeBatchMap = new Map<Mesh, NodeBatch>();

    /**
     * Sources whose rows a batch draws. A batch is built from one source of its shape and draws the
     * other sizes scaled, so those sources have no instance and no batch of their own; this keeps
     * a prune from taking them while their rows are drawn.
     */
    readonly batchedSources = new Set<Mesh>();
    hits = 0;
    misses = 0;

    /**
     * Get or create a cached mesh instance
     * @param name - Cache key for the mesh
     * @param creator - Function to create the mesh if not cached
     * @returns Instanced mesh from cache or newly created
     */
    get(name: string, creator: MeshCreatorFn): InstancedMesh {
        return this.sourceFor(name, creator).createInstance(name);
    }

    /**
     * Get or create a source mesh, with no instance of it: what a row with no mesh of its own is
     * drawn and picked from.
     * @param name - Cache key for the mesh
     * @param creator - Function to create the mesh if not cached
     * @returns The source mesh
     */
    sourceFor(name: string, creator: MeshCreatorFn): Mesh {
        let mesh = this.meshCacheMap.get(name);
        if (mesh) {
            this.hits++;
            return mesh;
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
        return mesh;
    }

    /**
     * Get or create the thin-instance batch that draws one edge appearance.
     * @param name - Cache key for the batch, which is also the name its mesh carries.
     * @param creator - Function to build the batch's line mesh if there is no batch yet.
     * @param scene - The scene that renders it.
     * @param make - Builds the batch on the mesh, for a batch that draws more than a line (a
     *     shader); defaults to a plain {@link EdgeLineBatch}.
     * @returns The batch to take a slot in.
     */
    getBatch(
        name: string,
        creator: MeshCreatorFn,
        scene: Scene,
        make: (mesh: Mesh, scene: Scene, retire: () => void) => EdgeLineBatch = (mesh, at, retire) =>
            new EdgeLineBatch(mesh, at, retire),
    ): EdgeLineBatch {
        const existing = this.batchCacheMap.get(name);

        if (existing) {
            this.hits++;
            return existing;
        }

        this.misses++;
        const mesh = creator();
        mesh.name = name;
        const batch: EdgeLineBatch = make(mesh, scene, () => {
            if (this.batchCacheMap.get(name) === batch) {
                this.batchCacheMap.delete(name);
            }
        });

        this.batchCacheMap.set(name, batch);

        return batch;
    }

    /**
     * Get or create the pulled line batch of one look.
     * @param name - The look's key, which also names the batch's mesh.
     * @param creator - Builds the batch the first time.
     * @returns The batch.
     */
    getPulledBatch(name: string, creator: () => PulledLineBatch): PulledLineBatch {
        let batch = this.pulledBatchMap.get(name);
        if (batch === undefined) {
            batch = creator();
            batch.mesh.name = name;
            this.pulledBatchMap.set(name, batch);
        }

        return batch;
    }

    /**
     * Get or create the batch drawing a source mesh's rows.
     * @param source - The source mesh.
     * @param places - The table that places the rows.
     * @param root - What the rows are drawn inside.
     * @returns The batch.
     */
    batchFor(source: Mesh, places: ConstructorParameters<typeof NodeBatch>[1], root: TransformNode | null): NodeBatch {
        let batch = this.nodeBatchMap.get(source);
        if (batch === undefined) {
            batch = new NodeBatch(source, places, root);
            this.nodeBatchMap.set(source, batch);
        }

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
            this.disposeSource(mesh);
        }
        this.meshCacheMap.clear();

        for (const batch of this.batchCacheMap.values()) {
            batch.dispose();
        }

        this.batchCacheMap.clear();

        for (const batch of this.pulledBatchMap.values()) {
            batch.dispose();
        }

        this.pulledBatchMap.clear();
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
            if (
                mesh.instances.length === 0 &&
                !this.nodeBatchMap.get(mesh)?.liveSlots &&
                !this.batchedSources.has(mesh)
            ) {
                this.disposeSource(mesh);
                this.meshCacheMap.delete(name);
            }
        }
    }

    /**
     * Dispose and forget the cached meshes that match, with every instance drawn from them, so the
     * next `get` of their name builds them again: a look whose drawing went stale (a glyph drawn in
     * the fallback while its web font loaded). Whoever held an instance finds it disposed.
     * @param match - Whether a cached source mesh is stale.
     * @returns True when any was forgotten.
     */
    forget(match: (mesh: Mesh) => boolean): boolean {
        let forgot = false;
        for (const [name, mesh] of this.meshCacheMap) {
            if (match(mesh)) {
                this.disposeSource(mesh);
                this.meshCacheMap.delete(name);
                forgot = true;
            }
        }

        return forgot;
    }

    /**
     * Dispose a source mesh and the material it was built with.
     *
     * Every creator handed to get() builds a fresh material for its mesh, so the material dies
     * with it; `mesh.dispose()` alone would leave it in `scene.materials` for good. Textures are
     * kept: node gradient textures are shared across materials per scene, and NodeMesh disposes
     * one when the last material drawing it is disposed. A batch of the mesh goes
     * first, as it draws with that material.
     * @param mesh - The cached source mesh
     */
    private disposeSource(mesh: Mesh): void {
        this.nodeBatchMap.get(mesh)?.dispose();
        this.nodeBatchMap.delete(mesh);
        this.batchedSources.delete(mesh);
        const { material } = mesh;
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
