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
 * A KEY IS OPAQUE AND SESSION-LOCAL. It names one style for the life of the session and is
 * meaningless outside it. Nothing may persist one, compare two from different sessions, or read
 * anything back out of the number.
 *
 * A KEY IS RELEASED WHEN NOTHING IS DRAWN FROM IT, AND NEVER HANDED OUT AGAIN. The repaint counts
 * the elements drawn from each key ({@link StyleInterner.retain}, {@link StyleInterner.release}),
 * and a style no element holds is forgotten, so what the interner keeps follows the looks on
 * screen rather than every edit ever made. The number is not recycled: a renderer names a cached
 * source mesh after it, and a recycled key would hand one look's mesh to another. The storage
 * behind a key IS recycled, which is what keeps a session that edits a size a thousand times
 * the size of the picture it draws.
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
    // An effect's COLOUR is geometry here, and the renderer is why. Babylon draws an instanced
    // node through its SOURCE mesh: a glow layer's `customEmissiveColorSelector` is handed the
    // source, and a highlight layer keys its per-mesh colour by the source's uniqueId. So two
    // nodes that share a source mesh cannot be given two outline colours or two glow colours --
    // whichever was applied last is what both are drawn in. A source mesh per distinct effect
    // colour is therefore not a cost this table is choosing to pay, it is the only granularity
    // the renderer can express, and it is exactly the one `NodeEffects.resolveRenderedMesh`
    // describes: one source mesh is precisely the set of nodes sharing one effect configuration.
    "node.outline": "mesh",
    "node.glow": "mesh",
    // A glow's STRENGTH is keyed the same way. `NodeEffects.syncGlowStrengths` gives each SOURCE
    // mesh its own intensity (Babylon's per-mesh `setEffectIntensity`, keyed by uniqueId), so two
    // strengths need two source meshes. As an `instance` channel, two styles differing only in
    // strength shared one source and were drawn at whichever was applied last.
    // COST, as for `node.glow`: every distinct strength builds and caches one source mesh, so a
    // strength computed per node or encoded from data breaks instancing into one mesh per value.
    // ponytail: quantize the strength in the key (or evict source meshes left with no instances)
    // if a continuous glow encoding ever shows up in a profile.
    "node.glowStrength": "mesh",
    "edge.width": "mesh",
    "edge.style": "mesh",
    "edge.patternCount": "mesh",
    "edge.curvature": "mesh",
    "edge.animationSpeed": "mesh",

    // An arrow cap is its own mesh with its own material, built per edge by
    // `EdgeMesh.createArrowHead` out of the style the paint carries. Nothing about it is
    // per-instance state, and the renderer rebuilds a cap only when the edge's mesh key changes
    // -- so a size, a colour or an opacity left out of the key is a change that never reaches
    // the screen.
    "edge.arrowHead": "mesh",
    "edge.arrowHeadSize": "mesh",
    "edge.arrowHeadColor": "mesh",
    "edge.arrowHeadOpacity": "mesh",
    "edge.arrowTail": "mesh",
    "edge.arrowTailSize": "mesh",
    "edge.arrowTailColor": "mesh",
    "edge.arrowTailOpacity": "mesh",

    // Per-instance state: one buffer write, and never a reason to build a second mesh.
    "node.color": "instance",
    "node.opacity": "instance",
    "edge.color": "instance",
    "edge.opacity": "instance",

    // Drawn beside the mesh, and per element by nature.
    "node.label": "content",
    "node.labelStyle": "content",
    "node.tooltip": "content",
    "node.tooltipStyle": "content",
    "node.marker": "content",
    "edge.label": "content",
    "edge.labelStyle": "content",

    // A caption at the end of an arrow is drawn beside the cap, not by it: it is a
    // `RichTextLabel` on its own plane, and `Edge.syncContent` compares and rebuilds it on every
    // paint rather than only when the edge's mesh key moves. So it keys no source mesh, and
    // adding a layer that captions an edge already on screen reaches the screen -- which is
    // exactly what a `mesh` role here would prevent, since the caption's words change nothing
    // about the line or the cap.
    "edge.arrowHeadText": "content",
    "edge.arrowHeadTextStyle": "content",
    "edge.arrowTailText": "content",
    "edge.arrowTailTextStyle": "content",
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

/**
 * How many slots a key's number can name; the rest of the number is how often that slot was used.
 *
 * A key is `uses * SLOT_SPAN + slot`, so it finds its slot with one remainder rather than a map
 * lookup -- which measured half again the cost of a mint -- and a slot reused for a new style
 * answers with a number it has never answered with before.
 */
const SLOT_SPAN = 2 ** 24;

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
    /** How many distinct styles are held: minted and not yet released. */
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
     * @returns The key, which no other style is ever given in this interner.
     */
    end(mint: () => T): number;
    /**
     * Say that one more element is drawn from a key.
     * @param key - The key, as {@link end} answered with.
     */
    retain(key: number): void;
    /**
     * Say that one element fewer is drawn from a key, and forget its style when none is left.
     *
     * A style that has been minted and never retained is held until something retains and then
     * releases it: minting is a lookup, and a lookup must not take a style away.
     * @param key - The key, as {@link end} answered with.
     */
    release(key: number): void;
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

    /**
     * Which SLOTS each hash has minted, which is the only thing a lookup compares against.
     *
     * A slot is where a held style's sequence, style and key are kept. Slots are reused once a
     * style is released; keys are not. See the file comment.
     */
    const buckets = new Map<number, number[]>();

    /**
     * Every held sequence, end to end in ONE array.
     *
     * One array per style would be one allocation per distinct style, which a continuous
     * encoding makes one allocation per element: measured at fifty thousand styles, that is
     * several milliseconds of collector pressure inside a sixteen millisecond budget, and it
     * varies from run to run. Here a mint is a copy into space that is already there. A released
     * sequence leaves a hole, and {@link compact} closes the holes once they outweigh what is
     * held.
     */
    let minted = new Int32Array(SCRATCH_CAPACITY * 8);

    /** How much of {@link minted} is in use, holes included. */
    let used = 0;

    /** How much of {@link minted} belongs to a style that is still held. */
    let live = 0;

    /** Where each slot's sequence starts in {@link minted}. */
    const offsets: number[] = [];

    /** How long each slot's sequence is. */
    const lengths: number[] = [];

    /** The hash each slot is filed under, so a release can find its bucket. */
    const hashes: number[] = [];

    /** The style behind each slot, or undefined for a free slot. */
    const styles: (T | undefined)[] = [];

    /** The key each slot answers with, or -1 for a free slot. */
    const keys: number[] = [];

    /** How many elements are drawn from each slot's style. */
    const counts: number[] = [];

    /** Slots whose style has been released. */
    const free: number[] = [];

    /** How many times each slot has been minted into, which is what keeps its keys distinct. */
    const uses: number[] = [];

    /** How many styles are held. */
    let held = 0;

    /**
     * Where a key's style is kept.
     * @param key - The key.
     * @returns The slot, or -1 when the key is not held.
     */
    const slotOf = (key: number): number => {
        const slot = key % SLOT_SPAN;

        return key >= 0 && keys[slot] === key ? slot : -1;
    };

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
     * Whether the sequence in a slot is the one being built.
     * @param slot - The slot to compare against.
     * @returns True when they hold the same values in the same order.
     */
    const matches = (slot: number): boolean => {
        if (lengths[slot] !== length) {
            return false;
        }

        const offset = offsets[slot];

        for (let at = 0; at < length; at++) {
            if (minted[offset + at] !== scratch[at]) {
                return false;
            }
        }

        return true;
    };

    /**
     * Copy every held sequence to the front of a fresh array, leaving the released ones behind.
     * @param capacity - How big the fresh array is.
     */
    const compact = (capacity: number): void => {
        const packed = new Int32Array(capacity);

        if (live === used) {
            // Nothing has been released, so there are no holes to close: this is a plain growth.
            packed.set(minted.subarray(0, used));
            minted = packed;

            return;
        }

        let at = 0;

        for (let slot = 0; slot < keys.length; slot++) {
            if (keys[slot] === -1) {
                continue;
            }

            const from = offsets[slot];
            const count = lengths[slot];

            for (let step = 0; step < count; step++) {
                packed[at + step] = minted[from + step];
            }

            offsets[slot] = at;
            at += count;
        }

        minted = packed;
        used = at;
    };

    /**
     * Copy the sequence being built into the minted store.
     * @param slot - The slot it belongs to.
     */
    const keep = (slot: number): void => {
        if (used + length > minted.length) {
            let capacity = minted.length;

            // Closing the holes is enough when they are at least half of the array; otherwise it
            // grows. Either way the array stays within a constant factor of what is held.
            while (live + length > capacity / 2) {
                capacity *= 2;
            }

            compact(capacity);
        }

        offsets[slot] = used;
        lengths[slot] = length;

        for (let at = 0; at < length; at++) {
            minted[used + at] = scratch[at];
        }

        used += length;
        live += length;
    };

    return {
        get size(): number {
            return held;
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
                for (const slot of bucket) {
                    if (matches(slot)) {
                        reset();

                        return keys[slot];
                    }
                }
            }

            // ponytail: 16M styles held at once is the ceiling; nothing draws that many meshes.
            const slot = free.length > 0 ? (free.pop() as number) : keys.length;
            const reused = slot < uses.length ? uses[slot] : 0;
            const key = reused * SLOT_SPAN + slot;

            keep(slot);
            styles[slot] = mint();
            keys[slot] = key;
            counts[slot] = 0;
            hashes[slot] = finished;
            uses[slot] = reused + 1;
            held++;

            if (bucket === undefined) {
                buckets.set(finished, [slot]);
            } else {
                bucket.push(slot);
            }

            reset();

            return key;
        },

        retain(key: number): void {
            const slot = slotOf(key);

            if (slot !== -1) {
                counts[slot]++;
            }
        },

        release(key: number): void {
            const slot = slotOf(key);

            if (slot === -1 || --counts[slot] > 0) {
                return;
            }

            const bucket = buckets.get(hashes[slot]);

            if (bucket !== undefined) {
                bucket.splice(bucket.indexOf(slot), 1);

                if (bucket.length === 0) {
                    buckets.delete(hashes[slot]);
                }
            }

            held--;
            live -= lengths[slot];
            styles[slot] = undefined;
            keys[slot] = -1;
            free.push(slot);
        },

        get(key: number): T | undefined {
            const slot = slotOf(key);

            return slot === -1 ? undefined : styles[slot];
        },
    };
}
