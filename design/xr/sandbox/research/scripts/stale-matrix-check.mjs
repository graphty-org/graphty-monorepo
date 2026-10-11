// Does getAbsolutePosition() return last frame's value when a node's position is
// mutated in place (as Babylon's WebXR input update does) before scene.render()?
import { NullEngine, Scene, TransformNode, FreeCamera, Vector3 } from "@babylonjs/core";
const engine = new NullEngine();
const scene = new Scene(engine);
new FreeCamera("c", new Vector3(0, 0, -5), scene);
const pivot = new TransformNode("pivot", scene);
const grip = new TransformNode("grip", scene);
grip.parent = pivot;
scene.render(); // frame 1: matrices computed
grip.position.set(1, 0, 0); // what WebXRInputSource.updateFromXRFrame does
const inPlace = grip.getAbsolutePosition().clone();
grip.position.set(2, 0, 0);
const forced = grip.computeWorldMatrix(true).getTranslation();
pivot.position.set(10, 0, 0); // move the camera parent after the child was read
const afterParentMove = grip.getAbsolutePosition().clone();
console.log(
    JSON.stringify({
        inPlace: inPlace.x,
        expected1: 1,
        forced: forced.x,
        expected2: 2,
        afterParentMove: afterParentMove.x,
        expected3: 12,
    }),
);
