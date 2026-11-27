/**
 * How far in front of the plane the edges lie on a 2D arrowhead is drawn, in scene units (issue
 * #10126): about seven times the depth buffer's resolution at the 2D camera's range, and still
 * behind the front of a node of the default size (`NodeMesh`'s `drawOrder` step, 0.00625), so a
 * node lying over an arrowhead still covers it.
 *
 * The selection halo this lift once cleared is gone on this branch; only the constant is left,
 * because EdgeMesh.ts and FilledArrowRenderer.ts read it. Move it beside them, and delete this file,
 * once EdgeMesh.ts is free to edit.
 */
export const FLAT_CAP_LIFT = 0.0045;
