import { type Camera, Frustum, Matrix, type Plane } from "@babylonjs/core";

/**
 * The camera's frustum planes for a batch's per-frame on-screen test, kept in one array and
 * refreshed only when the camera or the batch's own transform changed: a batch that asks every
 * frame allocates nothing and, while neither moved, learns it need not walk its slots again.
 */
export class ViewWatch {
    /** The planes, as of the last {@link ViewWatch.moved} that answered true. */
    readonly planes: Plane[] = Frustum.GetPlanes(Matrix.Identity());
    private camera = -1;
    private view = -1;
    private projection = -1;
    private world = -1;

    /**
     * Whether the camera or the batch's world matrix changed since the last call; the planes are
     * refreshed when they did.
     * @param camera - The active camera.
     * @param world - The batch mesh's world matrix.
     * @returns True when the planes or the world matrix are new.
     */
    moved(camera: Camera, world: Matrix): boolean {
        const view = camera.getViewMatrix().updateFlag;
        const projection = camera.getProjectionMatrix().updateFlag;
        if (
            camera.uniqueId === this.camera &&
            view === this.view &&
            projection === this.projection &&
            world.updateFlag === this.world
        ) {
            return false;
        }

        this.camera = camera.uniqueId;
        this.view = view;
        this.projection = projection;
        this.world = world.updateFlag;
        Frustum.GetPlanesToRef(camera.getTransformationMatrix(), this.planes);
        return true;
    }
}
