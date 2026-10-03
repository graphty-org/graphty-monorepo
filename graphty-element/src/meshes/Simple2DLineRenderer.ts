import { Color3, Mesh, type Scene, StandardMaterial, VertexData } from "@babylonjs/core";

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
        vertexData.positions = [0, half, 0.5, 0, -half, 0.5, 0, -half, -0.5, 0, half, -0.5];
        vertexData.indices = [0, 1, 2, 0, 2, 3];
        vertexData.normals = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
        vertexData.applyToMesh(mesh);

        const material = new StandardMaterial("line-2d-material", scene);
        material.emissiveColor = Color3.FromHexString(color); // Self-illuminated (no lighting needed)
        material.alpha = opacity;
        material.disableLighting = true; // Disable lighting for consistent flat appearance
        material.backFaceCulling = false; // Visible from both sides
        mesh.material = material;

        mesh.metadata = { is2DLine: true, lineWidth: width };

        return mesh;
    }
}
