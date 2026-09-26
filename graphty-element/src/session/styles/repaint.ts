/**
 * @file The repaint: the one pass that turns a stack of layers into what each element is painted,
 * held to a budget that is measured rather than asserted in prose.
 *
 * THE BUDGET IS THE DESIGN. A single-layer edit on 50,000 nodes completes in under 16 ms of
 * main-thread work -- one frame -- and `test/session/styles/repaint.bench.test.ts` fails if it
 * does not. That number exists because the sentence "a repaint is an O(n) pass" was already in
 * the element, above three loops that were not.
 *
 * THE FOUR MECHANISMS THAT MAKE IT REACHABLE, and where each one lives:
 *
 * 1. ONLY AN EXPRESSION REACHES AN EVALUATOR. The selector was compiled when the layer was added
 *    (`./predicate`), so what runs here is a closure: a column presence test, a set membership
 *    test, or no call at all for `{match:"everything"}`. Nothing is parsed per element, ever.
 * 2. A RUN-BOUND LAYER ITERATES THE RUN'S MEASURED COLUMN. {@link RepaintSources.measured} hands
 *    back the dense indices a column holds a value for, and a layer whose selector is
 *    `{match:"has", path}` walks those instead of the element list. A run that measured 300 nodes
 *    of 50,000 visits 300, not 50,000, and the elements the run never measured are not consulted.
 * 3. AN EDIT REPAINTS A DIRTY SET, NOT THE GRAPH. The elements the edited layer matches, unioned
 *    with those its previous version matched AND those its previous version was last applied to.
 *    A layer that matches nothing repaints nothing, and an edit to a layer over 300 elements
 *    repaints 300 elements whatever the graph's size. The "applied to" half is not redundant:
 *    removing a run deletes its result column before its layers are removed, so by then a
 *    `{match:"has"}` selector over that column matches nothing, and marking by the selector alone
 *    left the run's paint on screen after the run had gone. One byte per element per layer
 *    records it -- membership, not values, which is why it is cheap where a per-layer history of
 *    what was painted (below) is not.
 * 4. THE REPRESENTATION IS COLUMNAR. A resolved style is a 23-key object, and building one per
 *    element costs about 47 ms at 50,000 nodes on its own. So one is built only where a caller
 *    asks about ONE element -- {@link RepaintEngine.styleOf} -- and the pass itself merges one
 *    column per channel, allocating a column the first time something writes to it and never for
 *    a channel nothing paints.
 *
 * WHEN THE LAYERS BELOW THE EDIT ARE SKIPPED, AND WHEN THEY ARE NOT. The design also asks that
 * only the layers at or above the edit be visited, and that holds exactly when a layer is ADDED ON TOP of
 * elements the stack has already painted: their columns already hold what the layers beneath
 * painted, so the new layer is simply applied over them and nothing below it runs.
 *
 * Every other edit -- an update, a removal, a move, an add in the middle of the stack -- repaints
 * its dirty elements from the BOTTOM. Undoing the paint of a layer that has been changed or taken
 * away needs the value the layers beneath it painted, and an element keeps no per-layer history
 * to read that out of; keeping one means a merged snapshot per layer, 23 columns times the stack
 * depth, to save a walk over a set that is already small. The ELEMENT bound, which is the one
 * that decides the budget, is honoured exactly in every case: an element outside the dirty set is
 * never visited by any layer.
 *
 * STYLE IDENTITY IS A HASH, NOT A SCAN. See `./intern`. Colour and opacity are per-instance GPU
 * state and do not key a source mesh, so a viridis ramp over 50,000 nodes still needs one mesh.
 *
 * NOTHING HERE THROWS PER ELEMENT. A binding that cannot be prepared -- a palette with fewer
 * colours than the encoding has groups, a scale nobody registered -- disables its layer for the
 * pass and is reported through {@link RepaintEngine.problems}. One layer the session cannot paint
 * must not cost every other layer its paint, which is exactly what `calculatedStyle` did.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Binding, Channel, GraphtyErrorCode, LayerId, Path } from "../../catalog/types";
import { isGraphtyError } from "../../errors";
import { asColorValue, channelDescriptor, type ChannelValues } from "./channels";
import { prepareBinding, type PreparedBinding } from "./encoding";
import { createStyleInterner, meshChannelsFor, type StyleInterner } from "./intern";
import type { CompiledLayer, LayerRepaint, RepaintContext, RepaintReport, RepaintRequest } from "./Layer";
import { columnsFor, type ElementColumns, type SelectorSource, type SelectorTarget } from "./predicate";
import { createScaleRegistry, type ScaleRegistry } from "./scales";

// ---------------------------------------------------------------------------------------------
// What a repaint produces
// ---------------------------------------------------------------------------------------------

/**
 * Everything one element is painted, as one object.
 *
 * MATERIALISED ONE ELEMENT AT A TIME, NEVER IN A LOOP. Building this for every element is what
 * the design's columnar rule forbids: it is 46.7 ms at 50,000 nodes for an answer the
 * repaint already holds in its columns. It exists for the two callers that genuinely ask about a
 * single element -- "why is this node red" and an element inspector.
 *
 * A channel that nothing painted is ABSENT rather than set to a default. The element keeps
 * whatever the renderer draws for a channel no layer wrote, and "not painted" is a different fact
 * from "painted the default", which is the distinction an algorithm's suggested styles depend on.
 */
export type ResolvedStyle = Readonly<Partial<ChannelValues>>;

/** A style that paints nothing, which is what an element no layer matched is left with. */
const EMPTY_STYLE: ResolvedStyle = Object.freeze({});

/**
 * One layer that could not be painted, and why.
 *
 * Reported rather than thrown: a layer whose palette is too small for its groups is a layer to
 * disable with a reason, and taking the whole repaint down with it would leave every other layer
 * unpainted for a fault none of them have.
 */
export interface RepaintProblem {
    /** The layer that could not be painted. */
    readonly layerId: LayerId;
    /** The machine-readable reason. */
    readonly code: GraphtyErrorCode;
    /** What is wrong, in a sentence. */
    readonly message: string;
}

// ---------------------------------------------------------------------------------------------
// What a repaint reads
// ---------------------------------------------------------------------------------------------

/** Everything the pass needs from the session it paints. */
export interface RepaintSources {
    /**
     * How many nodes the session holds.
     *
     * Read at the start of every pass rather than captured, because the graph moves and a pass
     * bounded by a stale count would paint rows that are gone and skip rows that arrived.
     * @returns The node count.
     */
    nodeCount(): number;
    /**
     * How many edges the session holds.
     * @returns The edge count.
     */
    edgeCount(): number;
    /** What the session can answer about one element, which is what the selectors were compiled against. */
    readonly elements: SelectorSource;
    /**
     * The dense indices that carry a value for one column, when the session can enumerate them.
     *
     * THIS IS RULE 3 OF THE COST CONTRACT, and it is the difference between a run-bound layer
     * costing its run's element count and costing the graph's. Absent, or absent for a particular
     * path, the pass falls back to walking every element and asking the compiled selector, which
     * is correct and merely slower.
     *
     * The indices must be within the current element count and must not repeat.
     * @param path - The column path, such as `results.louvain.group`.
     * @param target - Whether the asking layer paints nodes or edges.
     * @returns The indices, or undefined when this session cannot enumerate that column.
     */
    readonly measured?: (path: Path, target: SelectorTarget) => ArrayLike<number> | undefined;
    /** The scales a binding may name. Absent builds a registry holding the built-ins. */
    readonly scales?: ScaleRegistry;
}

/**
 * What the last pass painted, as a renderer reads it.
 *
 * READS AND A FIRST DRAW, AND NOTHING THAT EDITS. A renderer asks what one element is painted,
 * which source mesh it belongs to and which elements the last pass touched; it paints the whole
 * graph only at a boundary no edit describes. Nothing in this module talks to a renderer, and
 * binding one to these columns is a separate step.
 */
export interface ElementPaint {
    /**
     * Paint every element from the whole stack.
     *
     * The FIRST DRAW and the dataset boundary, which no edit describes: `LayerRepaint` is handed
     * what one edit changed, and "everything changed, because the graph did" is not an edit. A
     * renderer binding to a session calls this once and then lets the edits keep it up to date.
     * @param stack - The stack to paint from, bottom first.
     * @param context - The signal to stop on and the progress channel.
     * @returns How much was painted.
     */
    repaintAll(stack: readonly CompiledLayer[], context: RepaintContext): Promise<RepaintReport>;
    /**
     * Everything one element is painted.
     * @param target - Whether it is a node or an edge.
     * @param index - Its dense index.
     * @returns The style, holding only the channels something painted.
     */
    styleOf(target: SelectorTarget, index: number): ResolvedStyle;
    /**
     * Which source mesh one element is drawn from.
     * @param target - Whether it is a node or an edge.
     * @param index - Its dense index.
     * @returns The key. Zero is the mesh of an element no mesh-keying channel was written for.
     */
    meshKeyOf(target: SelectorTarget, index: number): number;
    /**
     * What one source mesh key stands for.
     * @param target - Whose key space it belongs to.
     * @param key - The key.
     * @returns The mesh-keying channels of that style, or undefined when the key is not one.
     */
    meshStyleOf(target: SelectorTarget, key: number): ResolvedStyle | undefined;
    /**
     * How many distinct source meshes one kind of element needs.
     *
     * This is the number a structural hash exists to keep small: it must follow the distinct
     * SHAPES and SIZES in the picture, never the element count, and a colour encoding must not
     * move it. A mesh no element is drawn from any more is not counted: its key is released and
     * never handed out again.
     * @param target - Nodes or edges.
     * @returns The count, which is at least one.
     */
    meshCount(target: SelectorTarget): number;
    /**
     * The elements the last pass repainted.
     *
     * THE HALF OF RULE 3 A RENDERER NEEDS. The pass bounds its own work by the dirty set, but a
     * renderer has its own work to do per element -- a mesh to rebuild, a buffer to write -- and
     * a renderer that walked the graph to find out what moved would put the cost back that this
     * whole file exists to take away. So the set is readable, and an edit over 300 elements costs
     * the renderer 300 elements whatever the graph's size.
     *
     * VALID ONLY UNTIL THE NEXT PASS. It is a view onto the pass's own scratch array, not a copy:
     * the next `repaint` or `repaintAll` overwrites it. A caller that keeps it past the end of the
     * announcement it arrived with is reading somebody else's dirty set. Which is why a renderer
     * reads it from {@link ElementPaint.onPainted} rather than after its own `await`; see there.
     * @param target - Nodes or edges.
     * @returns The dense indices, in the order they were marked.
     */
    lastPainted(target: SelectorTarget): ArrayLike<number>;
    /**
     * Be told what a pass painted, at the end of that pass and before any other can begin.
     *
     * THE ONLY SAFE MOMENT TO READ {@link ElementPaint.lastPainted}, and reading it anywhere else
     * is what stranded a whole graph on its bootstrap appearance. The dirty set is one scratch
     * array per element kind, so it belongs to whichever pass is running; a caller that awaited a
     * pass and then read the set was reading it one or more turns of the event loop later, and by
     * then a pass that had begun in between had reset it. Measured on the Kruskal story: a load's
     * whole-graph pass, the pass a finished run asks for, and the pass that applies the run's own
     * layer all reported the same nineteen edges and no nodes at all, so the twenty nodes the
     * first pass painted never reached a mesh and every one of them kept the appearance the
     * element gives a node it has not styled yet.
     *
     * Announced rather than polled, so the set a listener sees is the set the pass that just
     * ended actually painted. Listeners run synchronously, in the order they subscribed, at the
     * end of the pass and before it resolves; a listener that throws ends that pass, and must
     * therefore not throw.
     * @param listener - Called once per finished pass.
     * @returns A function that stops the notifications.
     */
    onPainted(listener: () => void): () => void;
    /**
     * Whether a pass has been asked for and has not finished yet.
     *
     * A pass YIELDS TO THE EVENT LOOP and waits behind the pass in front of it, so between the
     * edit that asks for it and the announcement that ends it there are frames -- as many as the
     * machine is slow. Nothing is in {@link ElementPaint.lastPainted} for those frames, and a
     * renderer that asked only whether paint was waiting to be drawn would call the picture
     * finished, and frame the camera on it, while a node's new size was still on its way.
     * @returns True from the moment a pass is requested until it has announced what it painted.
     */
    painting(): boolean;
    /**
     * The layers the last pass could not paint, and why.
     * @returns The problems, emptied at the start of every pass.
     */
    problems(): readonly RepaintProblem[];
}

/**
 * The pass itself: everything a renderer reads, plus the seam the styles API drives it through.
 *
 * Split from {@link ElementPaint} so that what the renderer is handed is exactly what it reads.
 * `repaint` belongs to the styles API and `invalidate` to the session that owns the data; a
 * renderer holding either could repaint behind the stack's back, and the stack would go on
 * describing a picture that had moved.
 */
export interface RepaintEngine extends ElementPaint {
    /** What `createStylesApi` takes as its `repaint`. */
    readonly repaint: LayerRepaint;
    /**
     * What one layer was last painted FROM.
     *
     * THE READ THAT MAKES A LEGEND HONEST. `styles.legend()` tells a reader what the picture
     * means and `styles.explain()` tells them why one element looks the way it does, and both
     * are only trustworthy if they read the same object the paint came from. A second set of
     * bindings prepared for the purpose would walk every bound column again -- milliseconds per
     * continuous binding at fifty thousand values -- to produce an answer that could disagree
     * with what is on screen. It would also be WRONG rather than merely slow: a domain is
     * settled against the element count the pass last sized its stores to, so preparing outside
     * a pass invents a domain from a count of zero before the first draw. So the pass keeps what
     * it prepared and publishes it here, and this read never prepares anything.
     *
     * Deliberately NOT on {@link ElementPaint}: a renderer draws from the resolved columns and
     * has no business reading a scale's domain.
     *
     * KEYED BY THE COMPILED LAYER, NOT BY ITS ID, and the difference is a false legend. An id is
     * minted as a slug of the layer's name plus the lowest free number, and "free" is worked out
     * from the layers the stack holds NOW -- so removing a layer puts its id back in circulation
     * and the next layer of the same name takes it. An index keyed by id would hand the new
     * layer the removed one's bindings, and a legend block would name one layer while reporting
     * another layer's channel, domain and palette. An object cannot be recycled that way.
     *
     * The list is in the order the pass applies them, fixed values first and rules second, and
     * every binding names the channel it paints.
     * @param entry - The compiled layer, as `styles.compiled()` holds it.
     * @returns Its prepared bindings. Empty for a layer that paints nothing, for one the pass
     *   could not prepare at all, and for one that has never been painted.
     */
    encoding(entry: CompiledLayer): readonly PreparedBinding[];
    /**
     * Forget every prepared binding.
     *
     * A binding's domain, its percentile clamp and its category list are properties of the COLUMN
     * it was prepared against, worked out once and then never read again. When the data behind
     * that column moves -- a run publishes, a dataset loads -- they describe the previous data,
     * and the next pass has to work them out again.
     *
     * It does NOT empty {@link RepaintEngine.encoding}. Those are two different questions: what
     * the next pass must work out again, and what the last pass actually painted from. The
     * second stays true after the data moves, because the pixels that pass produced are still on
     * screen until something repaints them -- and there are ordinary paths where nothing does. A
     * run announces its end before the auto-apply policy is consulted, and the policy declines a
     * re-run because it keeps its id and already has its layers; a batch never consults the
     * policy at all. Emptying the read here would blank the legend and empty every explanation
     * over a graph that is visibly, correctly painted.
     */
    invalidate(): void;
    /**
     * Forget which elements each layer was applied to, because the dense indices now name
     * different elements.
     *
     * A DATASET BOUNDARY, and only that. The record is kept by index, so across a new snapshot
     * index 1 is somebody else, and revisiting "what the old layer painted" would repaint the new
     * elements that happen to sit at the old indices -- the whole new graph, for a layer that
     * painted the whole old one. A run publishing does not renumber anything and must not call
     * this: the record is what lets a removed run's layer take its paint back.
     */
    renumbered(): void;
}

// ---------------------------------------------------------------------------------------------
// The columns
// ---------------------------------------------------------------------------------------------

/** How many elements one slice of a pass covers before the clock is consulted. */
const CHUNK = 4096;

/** What {@link RepaintEngine.encoding} answers for a layer nothing was prepared for. */
const NO_PREPARED_BINDINGS: readonly PreparedBinding[] = Object.freeze([]);

/** How long the pass may hold the thread before it hands it back, in milliseconds. */
const SLICE_MS = 8;

/** Rows a store holds before its first growth. */
const INITIAL_CAPACITY = 1024;

/** The byte a switch column carries where nothing painted it. */
const FLAG_ABSENT = 0;

/** The byte a switch column carries where something painted it off. */
const FLAG_FALSE = 1;

/** The byte a switch column carries where something painted it on. */
const FLAG_TRUE = 2;

/**
 * The generation counter is reset before it can overflow a signed 32-bit stamp, because a wrapped
 * generation would mark every element of the previous pass as already dirty in this one.
 */
const MAX_GENERATION = 0x7fff_fffe;

/** One channel's values, in the shape that channel's kind of value packs into. */
type ChannelColumn =
    | { readonly channel: Channel; readonly kind: "number"; values: Float64Array }
    | { readonly channel: Channel; readonly kind: "flag"; values: Uint8Array }
    | { readonly channel: Channel; readonly kind: "ref"; values: unknown[] }
    | { readonly channel: Channel; readonly kind: "merge"; values: unknown[] };

/**
 * Which column shape a channel's values pack into.
 *
 * Numbers and switches go into typed arrays, so a column of 50,000 sizes is 400 KB of contiguous
 * memory with no per-element object in it. Everything else -- a colour, a word from a closed
 * list, a label, a label style -- is held by reference, which costs nothing extra because the
 * encoding hands back a bounded set of shared values rather than a new one per element. A label
 * style is held by reference too, but merged with what the layers beneath painted: see
 * {@link writeColumn}.
 * @param channel - The channel.
 * @returns The shape its column takes.
 */
function kindFor(channel: Channel): ChannelColumn["kind"] {
    const accepts = channelDescriptor(channel)?.accepts;

    if (accepts === "number") {
        return "number";
    }

    if (accepts === "labelStyle") {
        return "merge";
    }

    return accepts === "boolean" ? "flag" : "ref";
}

/**
 * Build an empty column.
 * @param channel - The channel it holds.
 * @param capacity - How many rows it must hold.
 * @returns The column, painted nowhere.
 */
function makeColumn(channel: Channel, capacity: number): ChannelColumn {
    const kind = kindFor(channel);

    if (kind === "number") {
        // NaN is "nothing painted this": no real channel value is NaN, and a separate presence
        // byte would double the reads in the hottest loop in the file.
        return { channel, kind, values: new Float64Array(capacity).fill(Number.NaN) };
    }

    if (kind === "flag") {
        return { channel, kind, values: new Uint8Array(capacity) };
    }

    return { channel, kind, values: new Array<unknown>(capacity) };
}

/**
 * Grow a column in place, keeping what it already holds.
 *
 * The column OBJECT is kept and only its array replaced, because a prepared layer holds a
 * reference to the column it writes and would otherwise go on writing into the old array.
 * @param column - The column to grow.
 * @param capacity - The new row count.
 */
function growColumn(column: ChannelColumn, capacity: number): void {
    if (column.kind === "number") {
        const grown = new Float64Array(capacity).fill(Number.NaN);
        grown.set(column.values);
        column.values = grown;

        return;
    }

    if (column.kind === "flag") {
        const grown = new Uint8Array(capacity);
        grown.set(column.values);
        column.values = grown;

        return;
    }

    column.values.length = capacity;
}

/**
 * What one column holds for one element.
 * @param column - The column.
 * @param index - The element's dense index.
 * @returns The value, or undefined where nothing painted it.
 */
function readColumn(column: ChannelColumn, index: number): unknown {
    if (column.kind === "number") {
        const value = column.values[index];

        return Number.isNaN(value) ? undefined : value;
    }

    if (column.kind === "flag") {
        const value = column.values[index];

        if (value === FLAG_ABSENT) {
            return undefined;
        }

        return value === FLAG_TRUE;
    }

    return column.values[index];
}

/**
 * Paint one element in one column.
 * @param column - The column.
 * @param index - The element's dense index.
 * @param value - What the layer painted, already checked against the channel by the encoding.
 */
function writeColumn(column: ChannelColumn, index: number, value: unknown): void {
    if (column.kind === "number") {
        column.values[index] = typeof value === "number" ? value : Number.NaN;

        return;
    }

    if (column.kind === "flag") {
        column.values[index] = value === true ? FLAG_TRUE : FLAG_FALSE;

        return;
    }

    const held = column.values[index];

    // A label style is a bag of fields, and a layer that names one field has said nothing about
    // the others: `{color}` stacked over `{sizePx: 24}` is a red label at 24 px, not a red label
    // at the default size. So each field takes the value of the highest layer that wrote it. A
    // new object, because the value a layer painted is shared by every element it painted. A
    // field set to undefined says nothing either -- a settings form that clears a field produces
    // one -- so it never overwrites what a lower layer wrote.
    if (column.kind === "merge" && typeof held === "object" && held !== null) {
        const merged: Record<string, unknown> = { ...held };

        for (const [field, fieldValue] of Object.entries(value as object)) {
            if (fieldValue !== undefined) {
                merged[field] = fieldValue;
            }
        }

        column.values[index] = merged;

        return;
    }

    column.values[index] = value;
}

/**
 * Take one element's value out of one column, so the layers can paint it again from nothing.
 * @param column - The column.
 * @param index - The element's dense index.
 */
function clearColumn(column: ChannelColumn, index: number): void {
    if (column.kind === "number") {
        column.values[index] = Number.NaN;

        return;
    }

    if (column.kind === "flag") {
        column.values[index] = FLAG_ABSENT;

        return;
    }

    column.values[index] = undefined;
}

/**
 * Push one element's value for one mesh-keying channel into the interner.
 *
 * Absent is pushed for a channel with no column and for an element nothing painted. A value
 * announces its own kind and therefore its own length, so a sequence decodes one way only however
 * many tokens each channel contributed -- see NUMBER_TOKEN in `./intern`.
 *
 * A COLOUR IS ITS FOUR COMPONENTS, AND LEAVING IT OUT WAS A SILENT DEFECT. A resolved colour
 * arrives here as a `ColorValue` object, so until this branch existed it fell past the
 * three `typeof` tests and was pushed as ABSENT: every colour folded into the key as "nothing
 * painted this", which made every colour equal to every other colour and to no colour at all.
 * The two channels that suffered were `edge.arrowHeadColor` and `edge.arrowTailColor` -- the only
 * colours whose role is `mesh` -- and the symptom was exact: a cap was drawn in the right colour
 * on the first paint, because the first paint builds every mesh anyway, and a colour written to a
 * graph already on screen changed nothing at all, because the key it should have changed could
 * not see it. Writing a cap SIZE afterwards rebuilt the cap and the colour appeared, which is how
 * the resolved value was shown to have been right the whole time.
 *
 * THE COMPONENTS RATHER THAN THE HEX STRING, because {@link StyleInterner.pushText} mints a token
 * per distinct word into a table that is never emptied. That is the right trade for a word from a
 * closed list -- a node shape, a line pattern -- and the wrong one for a colour, where a
 * continuous encoding would put one string per element in it. The components are already parsed
 * and cost nothing to read.
 * @param meshes - The interner mid-sequence.
 * @param column - The channel's column, or null when nothing has ever written that channel.
 * @param index - The element's dense index.
 */
function pushMeshValue(meshes: StyleInterner<ResolvedStyle>, column: ChannelColumn | null, index: number): void {
    if (column === null) {
        meshes.pushAbsent();

        return;
    }

    const value = readColumn(column, index);

    if (typeof value === "number") {
        meshes.pushNumber(value);

        return;
    }

    if (typeof value === "boolean") {
        meshes.pushFlag(value);

        return;
    }

    if (typeof value === "string") {
        meshes.pushText(value);

        return;
    }

    const color = asColorValue(value);

    if (color === null) {
        meshes.pushAbsent();

        return;
    }

    meshes.pushNumber(color.r);
    meshes.pushNumber(color.g);
    meshes.pushNumber(color.b);
    meshes.pushNumber(color.a);
}

// ---------------------------------------------------------------------------------------------
// What one kind of element holds
// ---------------------------------------------------------------------------------------------

/** Everything the pass keeps about one kind of element. */
interface TargetStore {
    /** Whether it holds nodes or edges. */
    readonly target: SelectorTarget;
    /** What the session can answer about one of them. */
    readonly elements: ElementColumns;
    /** The distinct source meshes this kind of element needs. */
    readonly meshes: StyleInterner<ResolvedStyle>;
    /** One column per channel something has painted, allocated on first write. */
    readonly columns: Map<Channel, ChannelColumn>;
    /** How many rows every array here holds. */
    capacity: number;
    /** How many of those rows are elements that exist. */
    count: number;
    /** Which source mesh each element is drawn from. Doubles, because a key outgrows 32 bits. */
    meshKeys: Float64Array;
    /** The pass that last marked each element dirty, which is how a mark is cleared for free. */
    stamps: Int32Array;
    /** This pass's number. */
    generation: number;
    /** The elements this pass repaints, in the order they were marked. */
    dirty: Uint32Array;
    /** How many of them there are. */
    dirtyCount: number;
    /**
     * Which elements have been through a pass over the WHOLE stack.
     *
     * An element that has not cannot have the layers below an edit skipped over it: its columns
     * hold nothing for them to have painted, so the skip would leave it showing the edited layer
     * and nothing else.
     */
    painted: Uint8Array;
    /** Whether any layer has ever painted a channel that keys a source mesh. */
    meshWritten: boolean;
}

/** One channel one layer paints, with everything knowable already worked out. */
interface PreparedChannel {
    /** The column it writes into. */
    readonly column: ChannelColumn;
    /** The path it reads, or null when it writes a literal and reads nothing. */
    readonly path: Path | null;
    /** The binding, prepared against the whole column exactly once. */
    readonly binding: PreparedBinding;
}

/** One layer, ready to paint. */
interface PreparedLayer {
    /** What it paints, in the order it will be applied. */
    readonly channels: readonly PreparedChannel[];
    /** Whether any of those channels keys a source mesh. */
    readonly touchesMesh: boolean;
    /** Why it paints nothing at all, or null when it paints. */
    readonly problem: RepaintProblem | null;
}

/**
 * Whether an edit is purely layers ADDED ON TOP of the stack.
 *
 * The one shape of edit whose dirty elements do not have to be merged from the bottom again: the
 * layers beneath the new ones did not move, so what they painted is still what the columns hold,
 * and the new layers go straight over it. Anything else -- an update, a removal, a move, an add
 * in the middle -- can take paint AWAY from an element, and giving that element back what the
 * layers beneath it painted means running them.
 * @param request - What the edit asked for.
 * @returns True when only the layers at or above `fromIndex` have to be applied.
 */
function addedOnTop(request: RepaintRequest): boolean {
    const { edits, stack, fromIndex } = request;

    if (edits.length === 0) {
        return false;
    }

    for (const edit of edits) {
        if (edit.previous !== null || edit.next === null) {
            return false;
        }
    }

    return fromIndex === stack.length - edits.length;
}

// ---------------------------------------------------------------------------------------------
// The pass
// ---------------------------------------------------------------------------------------------

/**
 * Build the repaint one session paints through.
 *
 * One per session. The engine holds the painted columns, so two of them over one session would
 * each hold half an answer.
 * @param sources - What the pass reads: the element counts, the value readers, the measured
 *     columns and the scales.
 * @returns The repaint seam and the questions that can be asked of what it painted.
 */
export function createLayerRepaint(sources: RepaintSources): RepaintEngine {
    const scales = sources.scales ?? createScaleRegistry();

    /**
     * Prepared layers, keyed by the compiled layer they were built from.
     *
     * A compiled layer object is replaced only when that layer is added or updated, so an edit to
     * one layer leaves every other layer's prepared bindings untouched. Without this, every edit
     * would re-walk every bound column -- 3.3 to 4.6 ms per continuous binding at 50,000 values --
     * for layers that did not change.
     */
    let prepared = new WeakMap<CompiledLayer, PreparedLayer>();

    /**
     * What the last pass painted each layer FROM, which is a different fact with a different
     * lifetime.
     *
     * The map above is a CACHE: it answers "can the next pass skip preparing this layer again",
     * and `invalidate` empties it the moment the data behind a domain moves. This one is a
     * RECORD: it answers "what did the paint currently on screen come from", and that stays true
     * until something actually repaints. Conflating them blanks the legend of a picture nobody
     * has changed, because a run ending invalidates and then, on a re-run or a batch, repaints
     * nothing.
     *
     * Written together with the cache, so the two can never describe different bindings, and
     * weak for the same reason the cache is: an entry lives exactly as long as the compiled
     * layer it describes, and a layer dropped from the stack takes its record with it.
     */
    const lastPreparedFrom = new WeakMap<CompiledLayer, PreparedLayer>();

    /**
     * Which elements each layer was applied to, one byte per element.
     *
     * READ WHEN THE LAYER IS TAKEN AWAY OR REPLACED, because by then its selector is no longer a
     * reliable answer to "what did this paint": the data it selected on may have moved or gone.
     * Keyed by the compiled layer for the reason {@link lastPreparedFrom} is, and weak so a layer
     * dropped from the stack takes its record with it.
     *
     * Set by a pass and emptied only by {@link RepaintEngine.renumbered}, so within one index space
     * it can over-report an element the layer stopped matching. That costs a repaint of an
     * element that did not need one, never a wrong picture.
     */
    let appliedTo = new WeakMap<CompiledLayer, Uint8Array>();

    /** The layers the pass in progress could not paint. */
    let problems: RepaintProblem[] = [];

    /**
     * The pass that is running, so the next one can wait for it rather than interleave with it.
     *
     * See {@link exclusively} for what interleaving costs.
     */
    let inFlight: Promise<void> = Promise.resolve();

    /** How many passes have been asked for and not finished: the one running and those behind it. */
    let unfinished = 0;

    /** Who is told what a pass painted, in the order they asked. */
    const painted = new Set<() => void>();

    /**
     * Tell everyone what this pass painted, while its dirty set is still its own.
     *
     * A LISTENER MUST NOT THROW, and one that does is not caught here. What subscribes is the
     * half of the element that reads the dirty set and remembers it -- indices into a set -- so a
     * throw would be a defect rather than a condition, and swallowing it would hide the one
     * notification the picture depends on. It ends the pass that was running; the pass behind it
     * still runs, because {@link exclusively} lets a waiter through whether the pass in front of
     * it finished or threw.
     */
    const announcePainted = (): void => {
        for (const listener of painted) {
            listener();
        }
    };

    /**
     * Start a store for one kind of element.
     * @param target - Nodes or edges.
     * @returns The store, holding nothing and knowing the default mesh.
     */
    const makeStore = (target: SelectorTarget): TargetStore => {
        const meshes = createStyleInterner<ResolvedStyle>();
        const meshChannels = meshChannelsFor(target).length;

        // Mint the mesh of an element nothing painted first, so that it is key zero and an
        // element whose mesh-keying channels are all absent needs no interning at all.
        meshes.begin();

        for (let at = 0; at < meshChannels; at++) {
            meshes.pushAbsent();
        }

        meshes.end(() => EMPTY_STYLE);

        return {
            target,
            elements: columnsFor(sources.elements, target),
            meshes,
            columns: new Map<Channel, ChannelColumn>(),
            capacity: INITIAL_CAPACITY,
            count: 0,
            meshKeys: new Float64Array(INITIAL_CAPACITY),
            stamps: new Int32Array(INITIAL_CAPACITY),
            generation: 0,
            dirty: new Uint32Array(INITIAL_CAPACITY),
            dirtyCount: 0,
            painted: new Uint8Array(INITIAL_CAPACITY),
            meshWritten: false,
        };
    };

    const stores: Readonly<Record<SelectorTarget, TargetStore>> = {
        node: makeStore("node"),
        edge: makeStore("edge"),
    };

    /**
     * Make room for every element that now exists.
     * @param store - The store to grow.
     * @param count - How many elements of that kind the session holds.
     */
    const ensureCapacity = (store: TargetStore, count: number): void => {
        // An element that is gone is drawn from nothing, so the mesh it was drawn from loses it.
        for (let index = count; index < store.count; index++) {
            if (store.meshKeys[index] !== 0) {
                store.meshes.release(store.meshKeys[index]);
                store.meshKeys[index] = 0;
            }
        }

        store.count = count;

        if (count <= store.capacity) {
            return;
        }

        let { capacity } = store;

        while (capacity < count) {
            capacity *= 2;
        }

        const meshKeys = new Float64Array(capacity);
        meshKeys.set(store.meshKeys);
        const stamps = new Int32Array(capacity);
        stamps.set(store.stamps);
        const painted = new Uint8Array(capacity);
        painted.set(store.painted);

        for (const column of store.columns.values()) {
            growColumn(column, capacity);
        }

        store.capacity = capacity;
        store.meshKeys = meshKeys;
        store.stamps = stamps;
        store.painted = painted;
        store.dirty = new Uint32Array(capacity);
    };

    /**
     * The column one channel's values go into, allocated the first time anything writes it.
     * @param store - The store it belongs to.
     * @param channel - The channel.
     * @returns The column.
     */
    const columnFor = (store: TargetStore, channel: Channel): ChannelColumn => {
        const existing = store.columns.get(channel);

        if (existing !== undefined) {
            return existing;
        }

        const column = makeColumn(channel, store.capacity);
        store.columns.set(channel, column);

        return column;
    };

    /**
     * Turn a thrown refusal into a problem the pass can carry.
     * @param layerId - The layer that could not be prepared.
     * @param thrown - What was thrown.
     * @returns The problem.
     */
    const problemFrom = (layerId: LayerId, thrown: unknown): RepaintProblem => {
        if (isGraphtyError(thrown)) {
            return { layerId, code: thrown.code, message: thrown.message };
        }

        return {
            layerId,
            code: "E_INTERNAL",
            message: thrown instanceof Error ? thrown.message : String(thrown),
        };
    };

    /**
     * Every value one column holds, walked once, so a binding can settle its domain against it.
     *
     * A column the session can enumerate is read at the indices it names, which is what makes a
     * run's domain a property of what the run measured rather than of the whole graph.
     * @param store - Whose column it is.
     * @param path - The column path.
     * @returns The values and how many elements in the store carry none.
     */
    const readWholeColumn = (store: TargetStore, path: Path): { values: unknown[]; unmeasured: number } => {
        const measured = sources.measured?.(path, store.target);

        if (measured !== undefined) {
            const values = new Array<unknown>(measured.length);

            for (let at = 0; at < measured.length; at++) {
                values[at] = store.elements.value(measured[at], path);
            }

            return { values, unmeasured: Math.max(0, store.count - measured.length) };
        }

        const values = new Array<unknown>(store.count);
        let unmeasured = 0;

        for (let index = 0; index < store.count; index++) {
            const value = store.elements.value(index, path);
            values[index] = value;

            if (value === undefined || value === null) {
                unmeasured++;
            }
        }

        return { values, unmeasured };
    };

    /**
     * Work out everything one layer can know before it sees an element.
     *
     * The literal values come first and the encoded bindings second, so a layer that writes both
     * to one channel lets the rule win and leaves the literal standing for the elements the rule
     * skips. That is the only reading under which writing both means anything, and it is written
     * down in the layer, so an export explains itself.
     * @param entry - The compiled layer.
     * @returns The prepared layer, or one carrying the reason it cannot be painted.
     */
    const buildPreparedLayer = (entry: CompiledLayer): PreparedLayer => {
        const { layer } = entry;
        const store = stores[layer.target];
        const channels: PreparedChannel[] = [];
        let touchesMesh = false;

        /**
         * Prepare one channel of the layer.
         * @param name - The channel name, as the layer spelled it.
         * @param path - The path it reads, or null for a literal.
         * @param binding - The binding to prepare.
         */
        const add = (name: string, path: Path | null, binding: Binding): void => {
            const descriptor = channelDescriptor(name);

            // A channel of the wrong target, a channel the element cannot draw and a name that is
            // not a channel are all refused by the layer check before a layer is accepted. Here
            // they are simply not painted: a repaint is not the place to relitigate a spec.
            if (descriptor === undefined || descriptor.target !== layer.target || !descriptor.renderable) {
                return;
            }

            const { channel } = descriptor;
            const column = path === null ? undefined : readWholeColumn(store, path);

            channels.push({
                column: columnFor(store, channel),
                path,
                binding: prepareBinding({
                    channel,
                    binding,
                    scales,
                    ...(column === undefined ? {} : { column: column.values, unmeasured: column.unmeasured }),
                }),
            });

            touchesMesh = touchesMesh || meshChannelsFor(layer.target).includes(channel);
        };

        try {
            for (const [name, value] of Object.entries(layer.set ?? {})) {
                add(name, null, { value });
            }

            for (const [name, binding] of Object.entries(layer.encode ?? {})) {
                if (binding !== undefined) {
                    add(name, "by" in binding ? binding.by : null, binding);
                }
            }
        } catch (thrown) {
            return { channels: [], touchesMesh: false, problem: problemFrom(layer.id, thrown) };
        }

        return { channels, touchesMesh, problem: null };
    };

    /**
     * The prepared form of one layer, built once and kept until the data moves.
     * @param entry - The compiled layer.
     * @returns The prepared layer.
     */
    const prepareLayer = (entry: CompiledLayer): PreparedLayer => {
        const cached = prepared.get(entry);

        if (cached !== undefined) {
            // Written on the cache hit as well as the miss, so the record stays in step with the
            // cache without anybody having to reason about which paths clear which. One map
            // write per layer per pass, against a read that has to be right every time.
            lastPreparedFrom.set(entry, cached);

            return cached;
        }

        const built = buildPreparedLayer(entry);
        prepared.set(entry, built);
        lastPreparedFrom.set(entry, built);

        return built;
    };

    /**
     * Where a layer's elements come from: the column its selector names, or every element.
     *
     * `{match:"has"}` and `{match:"top"}` NARROW to their column's measured elements, and that is
     * the design's rule that a run-bound layer iterates the run's measured column rather than a
     * shortcut. An expression is not narrowed even when it reads one column, because
     * ``path == `null` `` is a perfectly good expression that matches exactly the elements the
     * column does NOT hold, and the compiled selector reports which columns it reads without
     * reporting what it asks of them. Narrowing on that would silently paint the wrong set, which
     * is worse than walking the element list at seven nanoseconds an element.
     * @param entry - The compiled layer.
     * @returns The indices to walk, or null for every element.
     */
    const iterationFor = (entry: CompiledLayer): ArrayLike<number> | null => {
        const { selector } = entry;

        // A top selector paints a subset of its column's measured elements, so it narrows too.
        if (selector.match !== "has" && selector.match !== "top") {
            return null;
        }

        const path = selector.paths[0];

        return path === undefined ? null : (sources.measured?.(path, selector.target) ?? null);
    };

    /**
     * Start a pass for one kind of element.
     * @param store - The store.
     */
    const beginPass = (store: TargetStore): void => {
        store.dirtyCount = 0;

        if (store.generation >= MAX_GENERATION) {
            store.stamps = new Int32Array(store.capacity);
            store.generation = 0;
        }

        store.generation++;
    };

    /**
     * Put one element in the dirty set, unless it is already in it.
     * @param store - The store.
     * @param index - The element's dense index.
     */
    const markDirty = (store: TargetStore, index: number): void => {
        if (store.stamps[index] === store.generation) {
            return;
        }

        store.stamps[index] = store.generation;
        store.dirty[store.dirtyCount] = index;
        store.dirtyCount++;
    };

    /**
     * Put everything one layer matches in the dirty set.
     *
     * Called for the layer as it was AND for the layer as it will be, because an element the
     * edited layer no longer matches has to be repainted to lose the paint it had.
     * @param entry - The compiled layer.
     */
    const markLayer = (entry: CompiledLayer): void => {
        const store = stores[entry.layer.target];
        const { test } = entry.selector;
        const indices = iterationFor(entry);

        if (indices === null) {
            for (let index = 0; index < store.count; index++) {
                if (test === null || test(index)) {
                    markDirty(store, index);
                }
            }

            return;
        }

        for (let at = 0; at < indices.length; at++) {
            const index = indices[at];

            if (index < store.count && (test === null || test(index))) {
                markDirty(store, index);
            }
        }
    };

    /**
     * Put everything one layer was applied to in the dirty set, whatever its selector matches now.
     *
     * A walk over one byte per element rather than over the layer's own elements: at fifty
     * thousand nodes that is tens of microseconds, against a frame of sixteen milliseconds.
     * @param entry - The compiled layer, as it was painted.
     */
    const markApplied = (entry: CompiledLayer): void => {
        const covered = appliedTo.get(entry);

        if (covered === undefined) {
            return;
        }

        const store = stores[entry.layer.target];
        const end = Math.min(covered.length, store.count);

        for (let index = 0; index < end; index++) {
            if (covered[index] === 1) {
                markDirty(store, index);
            }
        }
    };

    /**
     * The record of which elements one layer was applied to, sized to the store.
     * @param entry - The compiled layer.
     * @param store - The store it paints.
     * @returns The record.
     */
    const appliedRecord = (entry: CompiledLayer, store: TargetStore): Uint8Array => {
        const existing = appliedTo.get(entry);

        if (existing !== undefined && existing.length >= store.capacity) {
            return existing;
        }

        const grown = new Uint8Array(store.capacity);

        if (existing !== undefined) {
            grown.set(existing);
        }

        appliedTo.set(entry, grown);

        return grown;
    };

    /**
     * Take the dirty elements' values out of every column, so the stack can paint them again.
     * @param store - The store.
     */
    const clearDirty = (store: TargetStore): void => {
        for (const column of store.columns.values()) {
            for (let at = 0; at < store.dirtyCount; at++) {
                clearColumn(column, store.dirty[at]);
            }
        }
    };

    /**
     * Give the event loop a turn when this slice has held the thread long enough.
     *
     * A macrotask rather than a microtask, for the reason the visibility pass gives: a microtask
     * lets progress fire while starving the event loop, so the bar moves, the frame never paints
     * and the Cancel button's handler does not run until the work it was meant to stop is done.
     * @param context - The signal to stop on.
     * @param deadline - When this slice runs out.
     * @returns The next slice's deadline.
     * @throws The signal's reason when the pass has been cancelled.
     */
    const breathe = async (context: RepaintContext, deadline: number): Promise<number> => {
        if (performance.now() < deadline) {
            return deadline;
        }

        await new Promise<void>((resume) => {
            setTimeout(resume, 0);
        });

        if (context.signal.aborted) {
            throw context.signal.reason as Error;
        }

        return performance.now() + SLICE_MS;
    };

    /**
     * Paint one layer over the dirty elements it matches.
     * @param store - The store.
     * @param entry - The compiled layer.
     * @param layer - Its prepared form.
     * @param context - The signal to stop on and the progress channel.
     * @param deadline - When this slice runs out.
     * @returns The next slice's deadline.
     */
    const paintLayer = async (
        store: TargetStore,
        entry: CompiledLayer,
        layer: PreparedLayer,
        context: RepaintContext,
        deadline: number,
    ): Promise<number> => {
        const { test } = entry.selector;
        const narrowed = iterationFor(entry);

        // Walk whichever list is shorter. The measured column bounds the layer by what the run
        // measured; the dirty list bounds it by what this edit touched. Both are correct, and the
        // smaller one is the one worth walking.
        const walk = narrowed !== null && narrowed.length < store.dirtyCount ? narrowed : null;
        const total = walk === null ? store.dirtyCount : walk.length;
        const { channels } = layer;
        const { elements } = store;
        const covered = appliedRecord(entry, store);
        let slice = deadline;

        /**
         * Paint one run of elements.
         * @param from - The first position to paint.
         * @param to - One past the last.
         */
        const paintSlice = (from: number, to: number): void => {
            for (let at = from; at < to; at++) {
                const index = walk === null ? store.dirty[at] : walk[at];

                // A measured column may name an element this edit is not repainting, and an
                // element outside the dirty set must never be visited: it keeps what it has.
                if (walk !== null && (index >= store.count || store.stamps[index] !== store.generation)) {
                    continue;
                }

                if (test !== null && !test(index)) {
                    continue;
                }

                covered[index] = 1;

                // Indexed rather than `for ... of`, which would allocate an iterator per element
                // for a list whose length was settled when the layer was prepared.
                for (let which = 0; which < channels.length; which++) {
                    const channel = channels[which];
                    const read = channel.path === null ? undefined : elements.value(index, channel.path);
                    const painted = channel.binding.paint(read);

                    // Undefined means this layer has nothing to say about this element, so what
                    // the layers below it painted stands. That is what stops an algorithm
                    // painting the elements it never measured.
                    if (painted !== undefined) {
                        writeColumn(channel.column, index, painted);
                    }
                }
            }
        };

        for (let from = 0; from < total; from += CHUNK) {
            paintSlice(from, Math.min(from + CHUNK, total));
            slice = await breathe(context, slice);
        }

        return slice;
    };

    /**
     * Work out which source mesh each dirty element is now drawn from.
     * @param store - The store.
     * @param context - The signal to stop on.
     * @param deadline - When this slice runs out.
     * @returns The next slice's deadline.
     */
    const internDirty = async (store: TargetStore, context: RepaintContext, deadline: number): Promise<number> => {
        const channels = meshChannelsFor(store.target);
        const columns = channels.map((channel) => store.columns.get(channel) ?? null);
        const { meshes } = store;
        let slice = deadline;

        /**
         * Which element {@link mintStyle} is to read.
         *
         * A field rather than a closed-over parameter so that the factory below is built ONCE
         * for the whole pass. Building it inside the loop would allocate a closure per element
         * for a function that runs only when a style is new -- measured at fifty thousand nodes,
         * that allocation cost more than the interning it was there for.
         */
        let minting = 0;

        /**
         * Build the style behind a source mesh key, which the interner calls only when it mints.
         * @returns The mesh-keying channels of the element at {@link minting}.
         */
        const mintStyle = (): ResolvedStyle => {
            const style: Partial<ChannelValues> = {};
            const bag = style as Record<string, unknown>;

            for (let which = 0; which < columns.length; which++) {
                const column = columns[which];
                const value = column === null ? undefined : readColumn(column, minting);

                if (value !== undefined) {
                    bag[channels[which]] = value;
                }
            }

            return style;
        };

        /**
         * Intern one run of elements.
         * @param from - The first position.
         * @param to - One past the last.
         */
        const internSlice = (from: number, to: number): void => {
            for (let at = from; at < to; at++) {
                const index = store.dirty[at];

                meshes.begin();

                for (let which = 0; which < columns.length; which++) {
                    pushMeshValue(meshes, columns[which], index);
                }

                minting = index;
                const key = meshes.end(mintStyle);
                const held = store.meshKeys[index];

                // Counted only when an element MOVES to another mesh, so an edit that leaves
                // every mesh where it was -- a colour, a label -- costs no bookkeeping at all.
                // Key zero is the default mesh and is never released.
                if (key !== held) {
                    if (key !== 0) {
                        meshes.retain(key);
                    }

                    if (held !== 0) {
                        meshes.release(held);
                    }

                    store.meshKeys[index] = key;
                }
            }
        };

        for (let from = 0; from < store.dirtyCount; from += CHUNK) {
            internSlice(from, Math.min(from + CHUNK, store.dirtyCount));
            slice = await breathe(context, slice);
        }

        return slice;
    };

    /**
     * Whether every dirty element has already been through a pass over the whole stack.
     *
     * The precondition for skipping the layers below an edit: what those layers painted has to
     * already be in the columns for the skip to leave the right picture behind.
     * @param store - The store.
     * @returns True when the layers below an edit may be skipped for this dirty set.
     */
    const everyDirtyPainted = (store: TargetStore): boolean => {
        for (let at = 0; at < store.dirtyCount; at++) {
            if (store.painted[store.dirty[at]] !== 1) {
                return false;
            }
        }

        return true;
    };

    /**
     * Repaint one kind of element.
     * @param store - The store.
     * @param stack - The stack as it will stand, bottom first.
     * @param context - The signal to stop on and the progress channel.
     * @param deadline - When this slice runs out.
     * @param skipBelow - The lowest layer that has to be applied, or null to apply the whole
     *     stack. Only an add on top of already-painted elements may name one.
     * @returns How many elements were repainted, and the next slice's deadline.
     */
    const paintTarget = async (
        store: TargetStore,
        stack: readonly CompiledLayer[],
        context: RepaintContext,
        deadline: number,
        skipBelow: number | null,
    ): Promise<{ painted: number; deadline: number }> => {
        if (store.dirtyCount === 0) {
            return { painted: 0, deadline };
        }

        const from = skipBelow !== null && everyDirtyPainted(store) ? skipBelow : 0;

        // Clearing is what makes a removal and an update correct, and it is exactly what the
        // add-on-top path does not have to do: nothing below the new layer changed, so what those
        // layers painted is already right where it needs to be.
        if (from === 0) {
            clearDirty(store);
        }

        let slice = deadline;

        for (let at = from; at < stack.length; at++) {
            const entry = stack[at];

            if (entry.layer.target !== store.target || !entry.layer.enabled) {
                continue;
            }

            const layer = prepareLayer(entry);

            if (layer.problem !== null) {
                problems.push(layer.problem);
                continue;
            }

            if (layer.channels.length === 0) {
                continue;
            }

            store.meshWritten = store.meshWritten || layer.touchesMesh;
            slice = await paintLayer(store, entry, layer, context, slice);
        }

        // Interning is skipped entirely while no layer has ever painted a channel that keys a
        // mesh, which is the ordinary case: a colour encoding moves no element to another mesh.
        if (store.meshWritten) {
            slice = await internDirty(store, context, slice);
        }

        for (let at = 0; at < store.dirtyCount; at++) {
            store.painted[store.dirty[at]] = 1;
        }

        return { painted: store.dirtyCount, deadline: slice };
    };

    /**
     * Run one pass: work out what is dirty, paint it, and say how much that was.
     * @param stack - The stack to paint from, bottom first.
     * @param context - The signal to stop on and the progress channel.
     * @param mark - Puts the elements this pass repaints into the dirty sets.
     * @param skipBelow - The lowest layer that has to be applied, or null for the whole stack.
     * @returns How much was painted.
     * @throws The signal's reason when the pass is cancelled part way through.
     */
    const runPass = async (
        stack: readonly CompiledLayer[],
        context: RepaintContext,
        mark: () => void,
        skipBelow: number | null,
    ): Promise<RepaintReport> => {
        problems = [];

        if (context.signal.aborted) {
            throw context.signal.reason as Error;
        }

        const { node: nodes, edge: edges } = stores;

        ensureCapacity(nodes, sources.nodeCount());
        ensureCapacity(edges, sources.edgeCount());
        beginPass(nodes);
        beginPass(edges);
        mark();

        const total = nodes.dirtyCount + edges.dirtyCount;
        context.report({ phase: "painting", completed: 0, total });

        const deadline = performance.now() + SLICE_MS;
        const node = await paintTarget(nodes, stack, context, deadline, skipBelow);
        context.report({ phase: "painting", completed: node.painted, total });
        const edge = await paintTarget(edges, stack, context, node.deadline, skipBelow);
        context.report({ phase: "painting", completed: total, total });
        announcePainted();

        return { nodes: node.painted, edges: edge.painted };
    };

    /**
     * Run one pass at a time, however many callers ask for one at once.
     *
     * THE STORES ARE ONE SET OF MUTABLE ARRAYS AND A PASS OWNS THEM WHILE IT RUNS. Every pass
     * yields to the event loop -- that is what keeps a 50,000 element repaint off the frame
     * budget -- so two passes started from two places do not take turns, they interleave, and
     * the second one's `beginPass` empties the dirty set the first one is still painting from.
     *
     * Not a hypothetical. Three doors into a pass fire within a few milliseconds of each other on
     * an ordinary load: the repaint a data source's load ends with, the repaint a finished run
     * asks for, and the layer that run's own suggestion adds. Measured together on one story, the
     * whole-graph pass reported painting nineteen of the twenty-nine edges it had marked and none
     * of its twenty nodes -- it had been handed the third pass's dirty set halfway through -- and
     * the nodes it was painting kept the appearance the element gives an unstyled node.
     *
     * A waiter runs whether the pass in front of it finished or threw: a cancelled edit must not
     * take the pass behind it down, and a pass that never starts is a picture that never arrives.
     * @param body - The pass.
     * @returns What it painted.
     */
    const exclusively = async (body: () => Promise<RepaintReport>): Promise<RepaintReport> => {
        unfinished++;

        const mine = inFlight.then(body, body);

        // Counted down on the chain the next pass waits on, not on `mine`. A `finally` on the
        // caller's promise moves the microtask every caller resumes on, and a layer added before
        // a load and not awaited then goes unpainted (test/browser/first-paint-after-load.test.ts
        // and style-layer-ordering.test.ts both catch it).
        const finished = (): void => {
            unfinished--;
        };

        inFlight = mine.then(finished, finished);

        return mine;
    };

    /**
     * Repaint what one edit touched.
     * @param request - What changed, and the stack to paint from.
     * @param context - The signal to stop on and the progress channel.
     * @returns How much was painted.
     * @throws The signal's reason when the edit is cancelled part way through.
     */
    const repaint = async (request: RepaintRequest, context: RepaintContext): Promise<RepaintReport> =>
        exclusively(async () =>
            runPass(
                request.stack,
                context,
                () => {
                    for (const edit of request.edits) {
                        // BOTH halves, and that is the whole of the dirty set: an element the
                        // layer no longer matches has to be repainted to LOSE the paint it had,
                        // and one it now matches has to be repainted to gain it.
                        if (edit.previous !== null) {
                            markLayer(edit.previous);
                            markApplied(edit.previous);
                        }

                        if (edit.next !== null) {
                            markLayer(edit.next);
                        }
                    }
                },
                addedOnTop(request) ? request.fromIndex : null,
            ),
        );

    return {
        repaint,

        repaintAll(stack: readonly CompiledLayer[], context: RepaintContext): Promise<RepaintReport> {
            return exclusively(async () =>
                runPass(
                    stack,
                    context,
                    () => {
                        for (const store of [stores.node, stores.edge]) {
                            for (let index = 0; index < store.count; index++) {
                                markDirty(store, index);
                            }
                        }
                    },
                    null,
                ),
            );
        },

        painting(): boolean {
            return unfinished > 0;
        },

        onPainted(listener: () => void): () => void {
            painted.add(listener);

            return () => {
                painted.delete(listener);
            };
        },

        styleOf(target: SelectorTarget, index: number): ResolvedStyle {
            const store = stores[target];

            if (index < 0 || index >= store.count) {
                return EMPTY_STYLE;
            }

            const style: Partial<ChannelValues> = {};
            const bag = style as Record<string, unknown>;

            for (const [channel, column] of store.columns) {
                const value = readColumn(column, index);

                if (value !== undefined) {
                    bag[channel] = value;
                }
            }

            return style;
        },

        meshKeyOf(target: SelectorTarget, index: number): number {
            const store = stores[target];

            return index >= 0 && index < store.count ? store.meshKeys[index] : 0;
        },

        meshStyleOf(target: SelectorTarget, key: number): ResolvedStyle | undefined {
            return stores[target].meshes.get(key);
        },

        meshCount(target: SelectorTarget): number {
            return stores[target].meshes.size;
        },

        lastPainted(target: SelectorTarget): ArrayLike<number> {
            const store = stores[target];

            // A view rather than a copy: the renderer reads it straight through and a copy of
            // fifty thousand indices per edit is exactly the allocation the pass avoids elsewhere.
            return store.dirty.subarray(0, store.dirtyCount);
        },

        problems(): readonly RepaintProblem[] {
            return problems;
        },

        encoding(entry: CompiledLayer): readonly PreparedBinding[] {
            const layer = lastPreparedFrom.get(entry);

            if (layer === undefined || layer.channels.length === 0) {
                return NO_PREPARED_BINDINGS;
            }

            // Built per call rather than kept, because the pass holds the channel and the reader
            // wants the binding, and a legend is read once a picture rather than once an element.
            return layer.channels.map((channel) => channel.binding);
        },

        invalidate(): void {
            prepared = new WeakMap<CompiledLayer, PreparedLayer>();

            // What every element shows was worked out from the columns these bindings read, so
            // it describes the previous data too. Forgetting that they were painted forces the
            // next edit to merge them from the bottom of the stack again rather than adding a
            // layer on top of a picture that is no longer current.
            stores.node.painted.fill(0);
            stores.edge.painted.fill(0);
        },

        renumbered(): void {
            appliedTo = new WeakMap<CompiledLayer, Uint8Array>();
        },
    };
}
