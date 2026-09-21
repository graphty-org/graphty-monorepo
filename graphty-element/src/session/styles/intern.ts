/**
 * @file Style identity: the small number a renderer keys a source mesh on, and the structural
 * hash that mints one without looking at the styles that came before it.
 *
 * INTERNING BY SCANNING IS THE DEFECT THIS REPLACES. `Styles.getNodeIdForStyle` walks every style
 * ever minted and compares it with a deep equality check until one matches, so minting the Sth
 * distinct style costs S comparisons and minting S of them costs S squared. Measured on this
 * machine: 515 ms for 500 distinct styles, 2.1 s for 1,000. A continuous colour encoding makes S
 * the element count, which is how one layer edit came to cost seconds.
 *
 * A HASH IS NOT A SCAN. The values of a style are folded into one 32-bit number as they are
 * pushed, that number picks a bucket, and only the styles already in that bucket are compared.
 * Minting is one map lookup and, in the ordinary case, one comparison of a handful of numbers --
 * whatever S is.
 *
 * NOTHING IS ALLOCATED PER ELEMENT. The pushed values go into a scratch array reused for every
 * element and copied only when a style turns out to be genuinely new, and the style object itself
 * is built by a factory that {@link StyleInterner.end} calls ONLY on a mint. That is the design's
 * columnar rule meeting its structural-hash rule: the 23-key object is materialised once per
 * DISTINCT style instead of once per element.
 *
 * COLOUR AND OPACITY ARE NOT PART OF A MESH'S IDENTITY. They are per-instance GPU state -- one
 * buffer write against an instance that already exists -- so a graph whose nodes are all spheres
 * of one size needs ONE source mesh however many colours it is painted in. Folding colour into
 * the key is what turns a viridis ramp into fifty thousand meshes, and it is what the element
 * does today. {@link channelRole} is where that split is written down, and
 * {@link meshChannelsFor} is the list a repaint pushes.
 *
 * A KEY IS OPAQUE AND SESSION-LOCAL. It is the order a style was first seen in, so it is stable
 * for the life of the session and meaningless outside it. Nothing may persist one, compare two
 * from different sessions, or read anything back out of the number.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Channel } from "../../catalog/types";
import { channelsFor } from "./channels";

// ---------------------------------------------------------------------------------------------
// What a channel is to the renderer
// ---------------------------------------------------------------------------------------------

/**
 * What a channel costs to change on an element that is already drawn.
 *
 * Three answers, and the difference between them is the difference between one buffer write and
 * one more mesh:
 *
 * - `"mesh"` is geometry or material state: changing it means the element is drawn from a
 *   different source mesh, so it is part of that mesh's identity.
 * - `"instance"` is per-instance GPU state: changing it is a write into a buffer the instance
 *   already has, so it must NOT be part of a mesh's identity.
 * - `"content"` is neither -- a label, a tooltip, a label's typography. It is drawn by something
 *   beside the element's own mesh, and it is per element by nature, so keying a mesh on it would
 *   mint one mesh per element with nothing gained.
 */
export type StyleRole = "mesh" | "instance" | "content";

/**
 * What each channel is to the renderer.
 *
 * Keyed by channel, so a channel added to the union without an entry here is a compile error
 * rather than a channel that silently falls into whichever default was written last.
 *
 * This table lives here rather than in `./channels` on purpose: it is not a fact about what a
 * channel MEANS, which is what that file states, but a fact about how the renderer instances it,
 * and this module is the only thing that reads it.
 */
const CHANNEL_ROLES: Readonly<Record<Channel, StyleRole>> = Object.freeze({
    // Geometry and material: a different value is a different source mesh.
    "node.size": "mesh",
    "node.shape": "mesh",
    "node.wireframe": "mesh",
    "node.flat": "mesh",
    "edge.width": "mesh",
    "edge.style": "mesh",
    "edge.curvature": "mesh",
    "edge.arrowHead": "mesh",
    "edge.arrowTail": "mesh",
    "edge.animationSpeed": "mesh",

    // Per-instance state: one buffer write, and never a reason to build a second mesh.
    "node.color": "instance",
    "node.opacity": "instance",
    "node.outline": "instance",
    "node.glow": "instance",
    "edge.color": "instance",
    "edge.opacity": "instance",

    // Drawn beside the mesh, and per element by nature.
    "node.label": "content",
    "node.labelStyle": "content",
    "node.tooltip": "content",
    "node.marker": "content",
    "edge.label": "content",
    "edge.labelStyle": "content",
    "edge.tooltip": "content",
});

/**
 * Every channel that keys a source mesh, for one kind of element, in the channel table's order.
 *
 * The order is fixed and shared by every element of that kind, which is what lets the interner
 * compare two styles as two flat sequences of numbers rather than as two objects.
 * @param target - Nodes or edges.
 * @returns The channels, in table order.
 */
function meshChannels(target: "node" | "edge"): readonly Channel[] {
    return Object.freeze(
        channelsFor(target)
            .map((descriptor) => descriptor.channel)
            .filter((channel) => CHANNEL_ROLES[channel] === "mesh"),
    );
}

/** The mesh-keying channels of each target, worked out once. */
const MESH_CHANNELS: Readonly<Record<"node" | "edge", readonly Channel[]>> = Object.freeze({
    node: meshChannels("node"),
    edge: meshChannels("edge"),
});

/**
 * What a channel is to the renderer.
 * @param channel - The channel.
 * @returns Whether it keys a source mesh, is per-instance state, or is drawn beside the mesh.
 */
export function channelRole(channel: Channel): StyleRole {
    return CHANNEL_ROLES[channel];
}

/**
 * The channels a source mesh's identity is built from, for one kind of element.
 *
 * A repaint pushes exactly these, in exactly this order, for every element it interns.
 * @param target - Nodes or edges.
 * @returns The channels, in the channel table's order. The same frozen array every call.
 */
export function meshChannelsFor(target: "node" | "edge"): readonly Channel[] {
    return MESH_CHANNELS[target];
}

// ---------------------------------------------------------------------------------------------
// The hash
// ---------------------------------------------------------------------------------------------

/** The 32-bit FNV-1a offset basis, which is where every sequence's fold starts. */
const HASH_SEED = 0x811c_9dc5;

/** The 32-bit FNV-1a prime, which is what each pushed value is folded in with. */
const HASH_PRIME = 0x0100_0193;

/** The value an absent channel contributes. */
const ABSENT_TOKEN = 0;

/** The value a `false` contributes. Distinct from absent: not painted is not the same as off. */
const FALSE_TOKEN = 1;

/** The value a `true` contributes. */
const TRUE_TOKEN = 2;

/**
 * The value that announces a number, ahead of the two whole numbers its bits are pushed as.
 *
 * WHY A NUMBER IS ANNOUNCED AND NOTHING ELSE IS. Every other kind of value contributes ONE
 * token, and a number contributes two, so without a tag the later channels of a sequence slide
 * to a different position depending on which earlier channels carried numbers -- and two genuine
 * styles can land on the same token sequence. An edge painted `{width: 0, arrowHead: "normal"}`
 * and an edge painted `{animationSpeed: 0, arrowTail: "normal"}` both folded to
 * `[0, 0, 0, 0, arrow, 0, 0]` before this tag existed, so the second was drawn from the first's
 * source mesh with its arrow on the wrong end.
 *
 * The tag makes each value self-delimiting: the token that starts a value says how many follow
 * it, the four kinds draw their first token from disjoint sets, and a sequence therefore decodes
 * one way only. That is what makes two distinct styles two distinct sequences.
 */
const NUMBER_TOKEN = 3;

/** How many values a sequence holds before the scratch array is grown. */
const SCRATCH_CAPACITY = 16;

/** The bytes a float is read through, so reading one allocates nothing. */
const FLOAT_BITS = new ArrayBuffer(8);

/** Writes the float. */
const FLOAT_VIEW = new Float64Array(FLOAT_BITS);

/** Reads the same eight bytes as two whole numbers. */
const INT_VIEW = new Int32Array(FLOAT_BITS);

/**
 * Scramble a folded hash so that sequences differing only in their last value land in different
 * buckets.
 *
 * FNV-1a's avalanche is weak in the low bits, and a bucket map keyed on the low bits of a weak
 * hash degenerates into the linear scan this file exists to remove.
 * @param hash - The folded hash.
 * @returns The finished hash.
 */
function finish(hash: number): number {
    let mixed = hash ^ (hash >>> 16);
    mixed = Math.imul(mixed, 0x85eb_ca6b);
    mixed ^= mixed >>> 13;

    return mixed | 0;
}

// ---------------------------------------------------------------------------------------------
// The interner
// ---------------------------------------------------------------------------------------------

/**
 * Turns a style into a number, and back.
 *
 * ONE ELEMENT AT A TIME, IN THREE STEPS. {@link begin} starts a sequence, the push verbs add the
 * value of each channel in a fixed order, and {@link end} answers with the key. The pushes must
 * be the same channels in the same order for every element of a kind, because what is compared
 * is the sequence and not a set of named fields.
 *
 * THE FACTORY RUNS ONLY ON A MINT. {@link end} takes a function that builds the style object and
 * calls it only when the sequence has not been seen before, so the cost of materialising a style
 * is paid once per distinct style rather than once per element. The factory must not call back
 * into the interner.
 */
export interface StyleInterner<T> {
    /** How many distinct styles have been minted. Keys run from 0 to this less one. */
    readonly size: number;
    /** Start a new sequence, discarding anything pushed and not ended. */
    begin(): void;
    /**
     * Add a channel that this element carries no value for.
     * @remarks Absent is its own value: a channel nothing painted is not a channel painted false.
     */
    pushAbsent(): void;
    /**
     * Add a number.
     * @param value - The number. `NaN` and `-0` are normalised, so two styles that differ only in
     *     which `NaN` or which zero they carry are one style.
     */
    pushNumber(value: number): void;
    /**
     * Add a switch.
     * @param value - Whether it is on.
     */
    pushFlag(value: boolean): void;
    /**
     * Add a word from a closed list, such as a node shape or a line pattern.
     * @param value - The word. Every distinct word costs one entry in a table that is never
     *     emptied, so this is for enumerated values and never for free text such as a label.
     */
    pushText(value: string): void;
    /**
     * Finish the sequence and answer with the key the style it describes is known by.
     * @param mint - Builds the style object, called ONLY when the sequence is new.
     * @returns The key: the order the style was first seen in.
     */
    end(mint: () => T): number;
    /**
     * The style one key stands for.
     * @param key - The key, as {@link end} answered with.
     * @returns The style, or undefined when no style has that key.
     */
    get(key: number): T | undefined;
}

/**
 * Build an interner.
 *
 * One per kind of element: node keys and edge keys are different spaces, and a session that
 * shared one would hand a renderer an edge's key for a node.
 * @returns The interner, holding nothing.
 */
export function createStyleInterner<T>(): StyleInterner<T> {
    /** The sequence being built, reused for every element. */
    let scratch = new Int32Array(SCRATCH_CAPACITY);

    /** How many values the sequence being built holds. */
    let length = 0;

    /** The fold of those values so far. */
    let hash = HASH_SEED;

    /** Which keys each hash has minted, which is the only thing a lookup compares against. */
    const buckets = new Map<number, number[]>();

    /**
     * Every minted sequence, end to end in ONE array.
     *
     * One array per style would be one allocation per distinct style, which a continuous
     * encoding makes one allocation per element: measured at fifty thousand styles, that is
     * several milliseconds of collector pressure inside a sixteen millisecond budget, and it
     * varies from run to run. Here a mint is a copy into space that is already there.
     */
    let minted = new Int32Array(SCRATCH_CAPACITY * 8);

    /** How much of {@link minted} is in use. */
    let used = 0;

    /** Where each key's sequence starts in {@link minted}. */
    const offsets: number[] = [];

    /** How long each key's sequence is. */
    const lengths: number[] = [];

    /** The style behind each key. */
    const styles: T[] = [];

    /** The number each enumerated word is folded in as. */
    const words = new Map<string, number>();

    /**
     * Add one value to the sequence being built.
     * @param token - The value, already reduced to a whole number.
     */
    const push = (token: number): void => {
        if (length === scratch.length) {
            const grown = new Int32Array(scratch.length * 2);
            grown.set(scratch);
            scratch = grown;
        }

        scratch[length] = token;
        length++;
        hash = Math.imul(hash ^ token, HASH_PRIME);
    };

    /** Throw the sequence being built away. */
    const reset = (): void => {
        length = 0;
        hash = HASH_SEED;
    };

    /**
     * Whether the sequence behind a key is the one being built.
     * @param key - The key to compare against.
     * @returns True when they hold the same values in the same order.
     */
    const matches = (key: number): boolean => {
        if (lengths[key] !== length) {
            return false;
        }

        const offset = offsets[key];

        for (let at = 0; at < length; at++) {
            if (minted[offset + at] !== scratch[at]) {
                return false;
            }
        }

        return true;
    };

    /** Copy the sequence being built into the minted store, and say where it landed. */
    const keep = (): void => {
        if (used + length > minted.length) {
            let capacity = minted.length * 2;

            while (used + length > capacity) {
                capacity *= 2;
            }

            const grown = new Int32Array(capacity);
            grown.set(minted.subarray(0, used));
            minted = grown;
        }

        offsets.push(used);
        lengths.push(length);

        for (let at = 0; at < length; at++) {
            minted[used + at] = scratch[at];
        }

        used += length;
    };

    return {
        get size(): number {
            return styles.length;
        },

        begin(): void {
            reset();
        },

        pushAbsent(): void {
            push(ABSENT_TOKEN);
        },

        pushNumber(value: number): void {
            // Both normalisations are about identity rather than arithmetic: every NaN is the
            // same "not a number" to a reader, and -0 and 0 draw the same element, so a style
            // that differs only in one of those is not a second style.
            FLOAT_VIEW[0] = Number.isNaN(value) ? Number.NaN : value + 0;
            push(NUMBER_TOKEN);
            push(INT_VIEW[0]);
            push(INT_VIEW[1]);
        },

        pushFlag(value: boolean): void {
            push(value ? TRUE_TOKEN : FALSE_TOKEN);
        },

        pushText(value: string): void {
            let token = words.get(value);

            if (token === undefined) {
                // Words start above the four reserved values, and that gap is load-bearing: it is
                // what keeps the token that starts a word distinct from the token that starts a
                // number, an absent channel or a flag, which is what makes a sequence decode one
                // way only. See NUMBER_TOKEN.
                token = words.size + NUMBER_TOKEN + 1;
                words.set(value, token);
            }

            push(token);
        },

        end(mint: () => T): number {
            const finished = finish(hash);
            const bucket = buckets.get(finished);

            if (bucket !== undefined) {
                for (const key of bucket) {
                    if (matches(key)) {
                        reset();

                        return key;
                    }
                }
            }

            const key = styles.length;

            keep();
            styles.push(mint());

            if (bucket === undefined) {
                buckets.set(finished, [key]);
            } else {
                bucket.push(key);
            }

            reset();

            return key;
        },

        get(key: number): T | undefined {
            return key >= 0 && key < styles.length ? styles[key] : undefined;
        },
    };
}
