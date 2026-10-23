import type { Mesh, Scene } from "@babylonjs/core";

import { CustomLineRenderer } from "./CustomLineRenderer";

/**
 * Renderer for simple 2D solid lines in world-space
 *
 * A 2D line's width is in world units, so it scales with the orthographic camera's zoom the way
 * the nodes do.
 *
 * ONE MESH PER APPEARANCE, NOT PER EDGE (issue #444). This builds the mesh an `EdgeLineBatch`
 * draws every 2D line of one colour, width and opacity from, one instance per straight piece. It
 * is the joined line the 3D line is drawn with too (`CustomLineRenderer.createJoinedLineMesh`),
 * taking its width in world units: the pieces of a bent or curved edge meet at their corners with
 * a miter or a bevel, and a straight edge is the same rectangle it always was.
 *
 * A LINE THINNER THAN ONE PIXEL IS DRAWN ONE PIXEL WIDE AND FAINTER, as Canvas and SVG renderers
 * (Cytoscape.js, Graphviz) draw the same stroke: its alpha is the opacity times its width in
 * pixels. The shader does it per vertex, so a zoomed-out file graph's thin edges do not break
 * into dots.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Simple2DLineRenderer {
    /**
     * Build the mesh a batch of 2D lines is drawn from.
     * @param width - Width of the line in world units
     * @param color - Hex color string (e.g., "#ff0000")
     * @param opacity - Opacity value 0-1
     * @param scene - Babylon.js scene
     * @param minScreenWidth - The fewest screen pixels wide the line is drawn (`line.minScreenWidth`)
     * @returns The template mesh, with its material
     */
    static createBatchMesh(width: number, color: string, opacity: number, scene: Scene, minScreenWidth = 0): Mesh {
        const mesh = CustomLineRenderer.createJoinedLineMesh(
            { width, color, opacity, worldWidth: true, minScreenWidth },
            scene,
        );
        mesh.name = "line-2d";

        // The width and opacity the style asked for, which the drawn scene is read back against.
        mesh.metadata = { ...(mesh.metadata as object), is2DLine: true, lineWidth: width, lineOpacity: opacity };

        return mesh;
    }
}
