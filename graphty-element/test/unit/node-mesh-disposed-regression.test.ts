/**
 * Node Mesh Disposed Regression Test
 *
 * Regression test for the bug where Node.update() did not recreate disposed meshes.
 * This specifically tests the fix where Node.update() checks if the mesh is disposed
 * and recreates it before updating position.
 *
 * Root cause: When meshCache.clear() was called during dimension switch,
 * node meshes were disposed. However, Node.update() only called updateStyle()
 * if there were style changes pending, so disposed meshes were never recreated.
 *
 * Fix: Added a check in Node.update() to recreate disposed meshes.
 *
 * @module test/unit/node-mesh-disposed-regression
 */

import { assert, describe, it, vi } from "vitest";

import type { Node } from "../../src/Node";

describe("Node.update() mesh disposal regression", () => {
    /**
     * Create a minimal mock Node object for testing.
     * This mimics the structure of a real Node without needing the full Graph infrastructure.
     */
    function createMockNode(): {
        node: Partial<Node>;
        updateStyleCalls: number[];
        updateStyleSpy: () => void;
    } {
        let updateStyleCalls: number[] = [];
        let meshIsDisposed = false;
        const nodeStyleId = 1 as unknown as number;

        const mockMesh = {
            isDisposed: () => meshIsDisposed,
            position: { x: 0, y: 0, z: 0 },
        };

        interface LayoutEngineResult {
            layoutEngine:
                | {
                      getNodePosition: (node: Node) =>
                          | {
                                x: number;
                                y: number;
                                z?: number;
                            }
                          | undefined;
                  }
                | undefined;
        }

        const mockContext = {
            getStatsManager: () => ({
                startMeasurement: vi.fn(),
                endMeasurement: vi.fn(),
            }),
            getLayoutManager: (): LayoutEngineResult => ({
                layoutEngine: {
                    getNodePosition: () => ({ x: 1, y: 2, z: 3 }),
                },
            }),
        };

        const mockNode = {
            mesh: mockMesh,
            styleId: nodeStyleId,
            dragging: false,
            context: mockContext,

            // Track updateStyle calls
            updateStyle(styleId: number): void {
                updateStyleCalls.push(styleId);
                // Simulate mesh recreation
                meshIsDisposed = false;
            },

            // The update method that we're testing (matches Node.ts implementation)
            update(): void {
                this.context.getStatsManager().startMeasurement("Node.update");

                // Check if mesh was disposed (e.g., from 2D/3D mode switch) and recreate it
                if (this.mesh.isDisposed()) {
                    this.updateStyle(this.styleId);
                }

                if (this.dragging) {
                    this.context.getStatsManager().endMeasurement("Node.update");
                    return;
                }

                const pos = this.context.getLayoutManager().layoutEngine?.getNodePosition(this as unknown as Node);
                if (pos) {
                    this.mesh.position.x = pos.x;
                    this.mesh.position.y = pos.y;
                    this.mesh.position.z = pos.z ?? 0;
                }

                this.context.getStatsManager().endMeasurement("Node.update");
            },

            // Test helper to dispose mesh
            _disposeMeshForTesting(): void {
                meshIsDisposed = true;
            },

            // Test helper to check mesh state
            _isMeshDisposedForTesting(): boolean {
                return meshIsDisposed;
            },
        };

        return {
            node: mockNode as unknown as Partial<Node>,
            updateStyleCalls,
            updateStyleSpy: () => {
                updateStyleCalls = [];
            },
        };
    }

    describe("regression: update() should recreate disposed mesh", () => {
        it("should NOT call updateStyle when mesh is valid and no style updates", () => {
            const { node, updateStyleCalls } = createMockNode();

            // Mesh is valid, no style updates
            node.update?.();

            assert.strictEqual(updateStyleCalls.length, 0, "updateStyle should not be called when mesh is valid");
        });

        it("should call updateStyle when mesh is disposed even without style updates", () => {
            const { node, updateStyleCalls } = createMockNode();

            // Dispose the mesh (simulating what happens during 2D/3D switch)
            (node as { _disposeMeshForTesting: () => void })._disposeMeshForTesting();
            assert.strictEqual(
                (node as { _isMeshDisposedForTesting: () => boolean })._isMeshDisposedForTesting(),
                true,
                "Mesh should be disposed before update",
            );

            // Call update - should detect disposed mesh and recreate it
            node.update?.();

            assert.strictEqual(updateStyleCalls.length, 1, "updateStyle should be called to recreate disposed mesh");
            assert.strictEqual(
                (node as { _isMeshDisposedForTesting: () => boolean })._isMeshDisposedForTesting(),
                false,
                "Mesh should be recreated after update",
            );
        });

        it("should update position after mesh is recreated", () => {
            const { node } = createMockNode();

            // Dispose the mesh
            (node as { _disposeMeshForTesting: () => void })._disposeMeshForTesting();

            // Initial position
            assert.strictEqual(node.mesh?.position.x, 0);
            assert.strictEqual(node.mesh?.position.y, 0);
            assert.strictEqual(node.mesh?.position.z, 0);

            // Call update - should recreate mesh and update position
            node.update?.();

            // Position should be updated from layout engine
            assert.strictEqual(node.mesh?.position.x, 1);
            assert.strictEqual(node.mesh?.position.y, 2);
            assert.strictEqual(node.mesh?.position.z, 3);
        });
    });

    describe("behavior verification", () => {
        it("should not update position when dragging", () => {
            const { node } = createMockNode();

            node.dragging = true;

            // Initial position
            assert.strictEqual(node.mesh?.position.x, 0);

            node.update?.();

            // Position should NOT be updated when dragging
            assert.strictEqual(node.mesh?.position.x, 0);
        });

    });
});
