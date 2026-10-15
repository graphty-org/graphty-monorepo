import { Camera, Color3, Mesh, type Scene, StandardMaterial, VertexData } from "@babylonjs/core";

/**
 * The four corners of a line's rectangle, half a width either side of its axis.
 * @param half - Half the width, in world units.
 * @returns The corner positions.
 */
function rectangle(half: number): number[] {
    return [0, half, 0.5, 0, -half, 0.5, 0, -half, -0.5, 0, half, -0.5];
}

/**
 * Renderer for simple 2D solid lines in world-space
 *
 * A 2D line is a flat rectangle in the XY plane, drawn with a StandardMaterial so it scales with
 * the orthographic camera's zoom the way the nodes do.
 *
 * ONE MESH PER APPEARANCE, NOT PER EDGE (issue #444). This builds the mesh an `EdgeLineBatch`
 * draws every 2D line of one colour, width and opacity from: each edge is a thin-instance slot
 * placed by `segmentMatrixToRef`, the same matrix a 3D line's slot takes. It used to build a mesh
 * and a material per edge (the material even named with `Date.now()`, so no two were shared).
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Simple2DLineRenderer {
    /**
     * Build the mesh a batch of 2D lines is drawn from.
     *
     * THE RECTANGLE LIES ALONG LOCAL Z AND ACROSS LOCAL Y, which is what lets a 2D line share the
     * 3D line's slot matrix. `segmentMatrixToRef` points local Z along the line and scales it to
     * the line's length; for any line in the XY plane its turn keeps local X on world Z, so local
     * Y is the in-plane perpendicular. A rectangle spanning local Y and Z therefore lands in the
     * XY plane with its long side on the line -- the same four corners the old per-edge mesh put
     * there by scaling (length, width) and turning about Z.
     *
     * A LINE THINNER THAN ONE PIXEL IS DRAWN ONE PIXEL WIDE AND FAINTER. Rasterized at its own
     * width, a rectangle a fraction of a pixel wide covers a pixel centre only here and there, so
     * a zoomed-out file graph's thin edges broke into dots. Canvas and SVG renderers (Cytoscape.js,
     * Graphviz) draw the same stroke as a continuous faint line, its antialiased coverage the
     * fraction of each pixel it crosses. So before each frame, while the camera shows this width
     * under one pixel, the rectangle is one pixel wide and the material's alpha is the opacity
     * times the width in pixels. At one pixel or more the line is exactly the rectangle and the
     * opacity it was given, and a width of 0 is never widened.
     * @param width - Width of the line in world units
     * @param color - Hex color string (e.g., "#ff0000")
     * @param opacity - Opacity value 0-1
     * @param scene - Babylon.js scene
     * @returns The unplaced rectangle, with its material
     */
    static createBatchMesh(width: number, color: string, opacity: number, scene: Scene): Mesh {
        const mesh = new Mesh("line-2d", scene);
        const half = width / 2;

        const vertexData = new VertexData();
        vertexData.positions = rectangle(half);
        vertexData.indices = [0, 1, 2, 0, 2, 3];
        vertexData.normals = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
        vertexData.applyToMesh(mesh);

        const material = new StandardMaterial("line-2d-material", scene);
        material.emissiveColor = Color3.FromHexString(color); // Self-illuminated (no lighting needed)
        material.alpha = opacity;
        material.disableLighting = true; // Disable lighting for consistent flat appearance
        material.backFaceCulling = false; // Visible from both sides
        mesh.material = material;

        // The width and opacity the style asked for. The material's alpha is the opacity drawn,
        // which a sub-pixel line lowers to keep its weight (below).
        mesh.metadata = { is2DLine: true, lineWidth: width, lineOpacity: opacity };

        const engine = scene.getEngine();
        let drawnHalf = half;
        const fitToPixel = scene.onBeforeRenderObservable.add(() => {
            const camera = scene.activeCamera;
            if (
                width <= 0 ||
                camera?.mode !== Camera.ORTHOGRAPHIC_CAMERA ||
                camera.orthoTop === null ||
                camera.orthoBottom === null
            ) {
                return;
            }

            const worldPerPx = (camera.orthoTop - camera.orthoBottom) / engine.getRenderHeight();
            const px = width / worldPerPx;
            const nextHalf = px < 1 ? worldPerPx / 2 : half;
            material.alpha = opacity * Math.min(1, px);
            if (nextHalf !== drawnHalf) {
                drawnHalf = nextHalf;
                mesh.setVerticesData("position", rectangle(nextHalf));
            }
        });
        mesh.onDisposeObservable.addOnce(() => {
            scene.onBeforeRenderObservable.remove(fitToPixel);
        });

        return mesh;
    }
}
