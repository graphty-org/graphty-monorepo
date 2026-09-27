/**
 * @file Change notification and the re-resolution scheduler (design/sets/sets-design.md sections
 * 6.2 and 11). Internal.
 *
 * A live user of a set -- a style layer, the visibility filter -- WATCHES it: it hands in the input
 * signature of everything it reads (`./signature`), how to resolve it, and where the new
 * resolution goes. Six hooks tell the notifier that an input moved:
 *
 * - the sets store's committed diff (`SetsStore.onCommit`), before any `set:changed`;
 * - a selection change and a visibility change, before their public events;
 * - a run moving its result: queued for a re-run (the result is cleared), finished, or removed;
 * - an attribute write after load (`Graph.updateNodes`), announced once per batch on the store
 *   owner's input tick;
 * - a snapshot replacement, announced on the same tick once a freeze has been delivered.
 *
 * Ingest writes attributes too, but announces nothing: it also touches the store, and the freeze
 * that follows re-queues every watch. Announcing it would make a watch resolve mid-load and force
 * a freeze per ingested chunk.
 *
 * On the SAME snapshot a notification is synchronous: every watch whose signature moved resolves
 * at once and is handed the new resolution with the inputs that moved, so a layer can repaint the
 * XOR of old and new before any public event fires. A watch whose signature did not move is not
 * asked to resolve.
 *
 * A SNAPSHOT REPLACEMENT is not: every freeze moves every signature (the serial is in all of them),
 * and re-resolving every live set in one turn would hold the thread. Each watch is queued and the
 * queue is worked frame by frame within a per-frame work budget, counted in the elements each
 * resolution walks as the watch estimates them, never timed. A watch keeps its previous resolution
 * until its new one is ready. A second freeze mid-way adds nothing twice: a watch still queued is
 * resolved once, against the newest snapshot, and a watch already done is queued again and
 * resolved only if its signature moved again.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { RunId, SetId } from "../../catalog/types";

/** One input that moved, as a watch is told. OPEN UNION. */
export type MovedInput =
    | { readonly kind: "sets"; readonly ids: readonly SetId[] }
    | { readonly kind: "selection" }
    | { readonly kind: "visibility" }
    | { readonly kind: "run"; readonly run: RunId }
    | { readonly kind: "attributes"; readonly element: "node" | "edge"; readonly fields: readonly string[] }
    | { readonly kind: "snapshot"; readonly serial: number };

/** One live user of a set. */
export interface SetWatch<R> {
    /**
     * The input signature of everything it reads now.
     * @returns the signature, or null when its inputs cannot be enumerated (always re-resolved)
     */
    signature(): string | null;
    /**
     * Resolve now, against the current snapshot and inputs.
     * @returns the new resolution
     */
    resolve(): R;
    /**
     * Take a new resolution.
     * @param resolution - what {@link SetWatch.resolve} returned
     * @param moved - every input reported since its previous resolution, oldest first
     */
    ready(resolution: R, moved: readonly MovedInput[]): void;
    /**
     * What one resolution costs against the per-frame budget.
     * @returns the elements it walks, estimated
     */
    cost(): number;
}

/**
 * Asks for one call on the next frame.
 * @param callback - what to call
 * @returns cancels the request
 */
type FrameSource = (callback: () => void) => () => void;

/**
 * The frame source a session starts with: a timer, because a headless session has no render loop.
 * The element hands in its render loop's frame callback instead.
 * @param callback - what to call
 * @returns cancels it
 */
const timerFrames: FrameSource = (callback) => {
    const handle = setTimeout(callback, 0);
    return () => {
        clearTimeout(handle);
    };
};

/**
 * Elements resolved per frame. ponytail: a fixed guess of what fits a 16 ms frame (design 6.5
 * projects a fixed set at about 14 ns per element); derive it from the recorded freeze timings
 * when they are measured.
 */
const FRAME_BUDGET = 1_000_000;

/** A watch and its bookkeeping. */
interface Entry {
    readonly watch: SetWatch<unknown>;
    /** The signature its current resolution was made under; undefined before any, null when unsigned. */
    applied: string | null | undefined;
    /** Inputs reported since its current resolution. */
    moved: MovedInput[];
}

/** The notifier and scheduler of one session. */
export class SetsNotifier {
    readonly #entries = new Set<Entry>();
    /** Watches waiting for a frame, in the order they were queued. */
    readonly #queue = new Set<Entry>();
    #frames: FrameSource;
    #cancelFrame: (() => void) | null = null;
    readonly #budget: number;
    #disposed = false;

    /**
     * Start with nothing watched and nothing queued.
     * @param options - the frame source and the per-frame budget, for tests
     * @param options.frames - asks for the next frame; a timer by default
     * @param options.budget - elements resolved per frame
     */
    constructor(options: { frames?: FrameSource; budget?: number } = {}) {
        this.#frames = options.frames ?? timerFrames;
        this.#budget = options.budget ?? FRAME_BUDGET;
    }

    /**
     * Watch a set. Its current resolution is the caller's; the signature it stands for is read now.
     * @param watch - the watch
     * @returns stops watching, and drops it from the queue
     */
    subscribe<R>(watch: SetWatch<R>): () => void {
        const entry: Entry = {
            watch: watch as SetWatch<unknown>,
            applied: this.#disposed ? undefined : watch.signature(),
            moved: [],
        };
        if (!this.#disposed) {
            this.#entries.add(entry);
        }

        return () => {
            this.#entries.delete(entry);
            this.#queue.delete(entry);
        };
    }

    /**
     * Report that one input moved.
     * @param input - what moved
     */
    notify(input: MovedInput): void {
        if (this.#disposed) {
            return;
        }

        for (const entry of [...this.#entries]) {
            entry.moved.push(input);
            if (input.kind === "snapshot") {
                this.#queue.add(entry);
            } else if (!this.#queue.has(entry)) {
                // A queued watch resolves on its frame, against whatever stands then.
                this.#settle(entry);
            }
        }

        if (this.#queue.size > 0) {
            this.#request();
        }
    }

    /**
     * Use another frame source from now on (the element's render loop).
     * @param frames - the source
     */
    useFrames(frames: FrameSource): void {
        this.#frames = frames;
        if (this.#cancelFrame !== null) {
            this.#cancelFrame();
            this.#cancelFrame = null;
            this.#request();
        }
    }

    /**
     * Watches waiting for a frame.
     * @returns how many
     */
    get pending(): number {
        return this.#queue.size;
    }

    /** Cancel the queued work and drop every watch. */
    dispose(): void {
        this.#disposed = true;
        this.#cancelFrame?.();
        this.#cancelFrame = null;
        this.#queue.clear();
        this.#entries.clear();
    }

    /**
     * Resolve one watch if its signature moved.
     * @param entry - the watch
     * @returns true when it resolved
     */
    #settle(entry: Entry): boolean {
        this.#queue.delete(entry);
        const { moved } = entry;
        entry.moved = [];
        try {
            const signature = entry.watch.signature();
            if (signature !== null && signature === entry.applied) {
                return false;
            }

            const resolution = entry.watch.resolve();
            entry.applied = signature;
            entry.watch.ready(resolution, moved);
        } catch {
            // A watch's failure is the watch's: it keeps what it had, and the next input retries it.
            entry.applied = undefined;
        }

        return true;
    }

    /** Ask for a frame, unless one is already asked for. */
    #request(): void {
        if (this.#cancelFrame === null) {
            this.#cancelFrame = this.#frames(() => {
                this.#cancelFrame = null;
                this.#frame();
            });
        }
    }

    /** Work the queue within one frame's budget; the first resolution runs whatever it costs. */
    #frame(): void {
        if (this.#disposed) {
            return;
        }

        let spent = 0;
        for (const entry of [...this.#queue]) {
            if (!this.#queue.has(entry)) {
                continue;
            }

            const cost = entry.watch.cost();
            if (spent > 0 && spent + cost > this.#budget) {
                break;
            }

            if (this.#settle(entry)) {
                spent += cost;
            }
        }

        if (this.#queue.size > 0) {
            this.#request();
        }
    }
}
