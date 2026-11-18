/**
 * A BVH figure plays in place: its hips stay over the rest place across the floor however far the
 * capture travels, so a dancer never drifts off its node or out of its preview (pirouette.bvh),
 * while a rise or a crouch still shows.
 */

import type { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { loadModel } from "babylonjs-models";
import { assert, describe, it } from "vitest";

import { mount } from "./helpers";

/** Two joints; the hips walk 3 units along X and 2 along Z while rising 0.5. */
const WALK = `HIERARCHY
ROOT Hips
{
  OFFSET 0 0 0
  CHANNELS 6 Xposition Yposition Zposition Zrotation Yrotation Xrotation
  JOINT Chest
  {
    OFFSET 0 1 0
    CHANNELS 3 Zrotation Yrotation Xrotation
    End Site
    {
      OFFSET 0 0.5 0
    }
  }
}
MOTION
Frames: 3
Frame Time: 0.5
5 1 7 0 0 0 0 0 0
6.5 1.25 8 0 0 0 0 0 0
8 1.5 9 0 0 0 0 0 0
`;

describe("a BVH figure", () => {
    it("keeps its hips over the rest place across the floor, and keeps their rise", async () => {
        const element = await mount();
        const { container } = await loadModel(element.graph.scene, new File([WALK], "walk.bvh"));
        const [skeleton] = container.skeletons;
        const hips = skeleton.bones.find((bone) => bone.getParent() === null);
        const motion = hips?.animations.find((animation) => animation.targetProperty === "position");
        assert.isDefined(motion);
        const keys = (motion?.getKeys() ?? []).map((key) => key.value as Vector3);
        assert.lengthOf(keys, 3);
        const rest = keys[0];
        for (const at of keys) {
            assert.closeTo(at.x, rest.x, 1e-6, "no travel along X");
            assert.closeTo(at.z, rest.z, 1e-6, "no travel along Z");
        }
        assert.closeTo(keys[2].y - keys[0].y, 0.5, 1e-6, "the rise is kept");
    });
});
