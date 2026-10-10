// Reading the hand joints, and the recorder: the owner holds a pose, and both hands' 25 joints are
// saved as a template in handy-work's .handpose layout. It replaces the chosen template for this
// session, and its bytes go to the log as base64, so it can be saved into poses/handy-work.json and
// the owner's own hand becomes the template (design section 9.1). handy-work's own recorder,
// dumpHands, downloads a file instead, which a headset browser cannot hand back to us.

import { encode, JOINTS, makeTemplate, normalize } from "./recognizer";

/** The joint spaces of each XRHand, in hand order, kept so a frame allocates nothing. */
const spaces = new WeakMap<XRHand, XRSpace[]>();

/**
 * Fill `out` with one hand's 25 joint matrices in `space`, the way handy-work does (fillPoses, or
 * getJointPose where the browser lacks it).
 * @param frame - the current XR frame
 * @param hand - the input source's hand
 * @param space - the reference space
 * @param out - 400 floats
 * @returns false when the hand is not fully tracked this frame
 */
export function readJoints(frame: XRFrame, hand: XRHand, space: XRReferenceSpace, out: Float32Array): boolean {
    let list = spaces.get(hand);
    if (!list) {
        list = Array.from(hand.values());
        spaces.set(hand, list);
    }
    if (list.length !== JOINTS) {
        return false;
    }
    if (frame.fillPoses) {
        return frame.fillPoses(list, space, out);
    }
    for (let j = 0; j < JOINTS; j++) {
        const pose = frame.getJointPose?.(list[j] as XRJointSpace, space);
        if (!pose) {
            return false;
        }
        out.set(pose.transform.matrix, j * 16);
    }
    return true;
}

/** A recording, as logged. */
export interface Recording {
    name: string;
    hands: ("left" | "right")[];
    joints: number;
    floats: number;
    /** The template's bytes, base64: a .handpose file. */
    handpose: string;
}

/**
 * Make a template from raw joints of the hands tracked now (a missing hand is mirrored).
 * @param name - the template it is recorded into
 * @param left - the left hand's raw joints, or null
 * @param right - the right hand's raw joints, or null
 * @returns the template, and the entry for the log
 */
export function record(
    name: string,
    left: Float32Array | null,
    right: Float32Array | null,
): { template: Float32Array; entry: Recording } {
    const l = left ? normalize(Float32Array.from(left)) : null;
    const r = right ? normalize(Float32Array.from(right)) : null;
    const template = makeTemplate(l, r);
    const hands: ("left" | "right")[] = [];
    if (l) {
        hands.push("left");
    }
    if (r) {
        hands.push("right");
    }
    return {
        template,
        entry: { name, hands, joints: template[0], floats: template.length, handpose: encode(template) },
    };
}
