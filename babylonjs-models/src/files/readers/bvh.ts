/**
 * @file Reading a BVH motion capture file far enough for its checks and summary: its joints (each
 * with its offset from its parent and its channels), and its motion's frame count and frame time.
 *
 * A BVH file holds a skeleton and its motion, and no shape: babylonjs-models draws it as a figure
 * of one thin box per bone (src/load/bvhFigure.ts). Babylon-free and DOM-free.
 */

import { ModelReadError } from "./geometry.js";

/** One joint, or an `End Site`. */
export interface BvhJoint {
    readonly name: string;
    /** Its offset from its parent joint. */
    readonly offset: readonly [number, number, number];
    /** The index of its parent in the list, or -1 for the root. */
    readonly parent: number;
    /** How many numbers each frame gives it (0 for an end site). */
    readonly channels: number;
}

/** A BVH file read. */
export interface BvhFile {
    /** The joints and end sites, parents first. */
    readonly joints: readonly BvhJoint[];
    readonly frames: number;
    /** Seconds per frame. */
    readonly frameTime: number;
}

/** The deepest joints may nest. */
const MAX_DEPTH = 256;

const fail = (): never => {
    throw new ModelReadError("bvh");
};

/** Reads the words of a BVH file in order. */
class Words {
    private at = 0;

    constructor(private readonly words: readonly string[]) {}

    next(): string {
        return this.at < this.words.length ? this.words[this.at++] : fail();
    }

    number(): number {
        const value = Number(this.next());
        return Number.isFinite(value) ? value : fail();
    }

    expect(word: string): void {
        if (this.next() !== word) {
            fail();
        }
    }
}

/**
 * Read one joint's block, after its name: its offset, its channels and its children.
 * @param words - The words.
 * @param name - The joint's name.
 * @param parent - Its parent's index.
 * @param joints - Where joints go, parents first.
 * @param depth - How deep it is.
 */
function readJoint(words: Words, name: string, parent: number, joints: BvhJoint[], depth: number): void {
    if (depth > MAX_DEPTH) {
        fail();
    }

    words.expect("{");
    words.expect("OFFSET");
    const offset: [number, number, number] = [words.number(), words.number(), words.number()];
    const index = joints.length;
    let channels = 0;
    const joint = (): BvhJoint => ({ name, offset, parent, channels });
    joints.push(joint());
    for (let word = words.next(); word !== "}"; word = words.next()) {
        if (word === "CHANNELS") {
            channels = words.number();
            if (!Number.isInteger(channels) || channels < 0 || channels > 6) {
                fail();
            }
            for (let c = 0; c < channels; c++) {
                words.next();
            }
            joints[index] = joint();
        } else if (word === "JOINT") {
            readJoint(words, words.next(), index, joints, depth + 1);
        } else if (word === "End") {
            words.expect("Site");
            readJoint(words, `${name}_end`, index, joints, depth + 1);
        } else {
            fail();
        }
    }
}

/**
 * Read a BVH file's hierarchy and motion header, checking that its frames hold the numbers its
 * channels need.
 * @param text - The file.
 * @returns The file.
 * @throws {ModelReadError} `"bvh"` for a damaged file.
 */
export function readBvh(text: string): BvhFile {
    const words = new Words(text.split(/\s+/).filter((w) => w !== ""));
    words.expect("HIERARCHY");
    const joints: BvhJoint[] = [];
    words.expect("ROOT");
    readJoint(words, words.next(), -1, joints, 0);
    words.expect("MOTION");
    words.expect("Frames:");
    const frames = words.number();
    words.expect("Frame");
    words.expect("Time:");
    const frameTime = words.number();
    if (!Number.isInteger(frames) || frames < 0 || frameTime < 0) {
        fail();
    }

    // Every frame gives every channel a number.
    const perFrame = joints.reduce((sum, j) => sum + j.channels, 0);
    for (let n = 0; n < frames * perFrame; n++) {
        words.number();
    }

    return { joints, frames, frameTime };
}

/** Triangles each bone of the drawn figure takes: a box of 12. */
export const TRIANGLES_PER_BONE = 12;

/** The name of a BVH file's one clip, as {@link readBvh}'s summary and the loaded figure call it. */
export const BVH_CLIP = "BVH Animation";
