/**
 * @file The styles API: the stack of layers a session holds, and the verbs that change it.
 *
 * LAYERS ARE ADDRESSED BY ID. There is no `insertLayer(position)`, no `removeLayerByIndex`, no
 * `updateLayerByIndex` and no `reorderLayers(from, to)`, and there will not be: every verb here
 * names a layer by {@link Layer.id}, and a position is said as "above this layer" or "below this
 * layer". The cost of the old spelling is on the record -- the one consumer had to keep an index
 * reconciliation module beside the element and delete its layers highest-index-first, and one
 * off-by-one took the element's own base layer with it, after which the next load died in mesh
 * building. An id survives every insertion, removal and reorder around it, so none of that
 * arithmetic has anywhere to go wrong.
 *
 * INDEX 0 IS THE BOTTOM. {@link StylesApi.list} returns the stack bottom first, which is paint
 * order: a layer later in the list paints over a layer earlier in it. This is the fact every
 * consumer gets wrong once, so it is stated here, on `list`, on `move` and in the design.
 *
 * READING IS SYNCHRONOUS, WRITING IS A COMMAND. `list`, `get`, `validate`, `legend`, `explain`,
 * `agreement` and `toDocument` answer from what the session already holds and cost nothing. `add`, `update`,
 * `remove`, `move`, `removeBySource`, `encode`, `highlight`, `applyTemplate` and
 * `resolveToStatic` each dispatch a command (`style.patch`, `style.encode`, `style.template`),
 * which is one undoable step in the session's history, and each returns a `Run` that can be
 * fired from a click handler and forgotten without an unhandled rejection. Awaiting one gives the
 * layer.
 *
 * ONE ANALYSIS LAYER PER RUN AND CHANNEL. `encode()` is the one path an analysis layer takes, and
 * it REPLACES the layer already painting that channel from that run rather than stacking a second
 * one on top of it: in place, keeping the layer's id and its place in the stack. Without that rule
 * a quickstart that runs an algorithm and then colours by it produces two layers and two legend
 * blocks on one channel, one of them invisible under the other, and a reader has no way to tell
 * which of the two made the picture.
 *
 * A HIGHLIGHT IS EXCLUSIVE. `highlight()` takes every highlight layer out of the stack before it
 * adds its own, because a second route or a second chosen set REPLACES the first rather than being
 * painted beside it. Which layers those are is read from the run's shape -- a route, a node set
 * and an edge set are highlights -- and never from the algorithm's name.
 *
 * NO WRITE VERB THROWS. A malformed spec, an unknown id, a locked layer: every refusal arrives as
 * a REJECTED run, never as a synchronous exception. A verb that threw would undo the thing the
 * `Run` is for, because a fire-and-forget call in a click handler would put the exception on the
 * window. The door for "is this valid" before anything is committed is {@link StylesApi.validate},
 * which is synchronous, writes nothing, and reports every problem at once.
 *
 * THE STACK MOVES AT ONCE, AND THE PICTURE FOLLOWS IT. The stack is project state: the command
 * writes the new stack when it is dispatched, so `add()` followed immediately by `list()` shows
 * the new layer. The repaint then runs on the session's derivation lane, from the stack the
 * picture shows to the stack state holds, whatever moved it -- an edit, an undo, a redo -- so
 * restoring a stack restores the picture. Several edits made faster than a repaint are drawn by
 * one pass. What a verb's `Run` means follows from that:
 *
 * - it settles once the pass that repaints the edit has run, and rejects when that repaint fails
 *   (the edit stays recorded, and undo takes it back);
 * - a signal already aborted when the verb is called refuses the edit, and nothing is written;
 * - `cancel()`, or an abort after the call, does NOT take the edit back: it has been recorded,
 *   and may have merged into a larger step (a colour picker's drag is one step), so undo is the
 *   way back. The run then resolves with the edit applied;
 * - it is never listed in `history.pending` or in `runs`.
 *
 * AN ELEMENT-OWNED LAYER IS NOT THE CONSUMER'S. The base and selection layers are seeded at
 * construction with `source.by === "element"`, which makes them {@link Layer.locked}. Removing,
 * editing or moving one is `E_PROTECTED`, and `add()` refuses to mint an element source at all.
 * That replaces identifying them BY NAME, which is what the one consumer does today and which its
 * own comment admits breaks for a reader who calls their own layer "default".
 *
 * WHERE THE REPAINT PLUGS IN. `sources.repaint` is the seam, and nothing in this module
 * implements it: see {@link LayerRepaint} in `./Layer`. This module registers the `styles` hook
 * of the derivation lane, which hands the repaint the difference between two stacks
 * (`stackChange` in `./repaint`). A session with no renderer hands none in and paints nothing,
 * which is not a degraded mode -- the stack is the session's and the paint is the renderer's.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { knownPaletteIds, PALETTE_DESCRIPTORS, paletteDescriptor } from "../../catalog/palettes";
import type {
    AttributeDescriptor,
    Binding,
    Channel,
    ChannelValue,
    EdgeId,
    Encoding,
    FieldDescriptor,
    LayerId,
    LayerSource,
    LayerSpec,
    MeasurementDeclaration,
    NodeId,
    PaletteDescriptor,
    Path,
    RunId,
    Scope,
    StaticStyle,
    StyleDocument,
} from "../../catalog/types";
import { DEFAULT_SELECTION_STYLE } from "../../config/GraphStyle";
import { EDGE_CONSTANTS } from "../../constants/meshConstants";
import { GraphtyError } from "../../errors";
import type { GraphtyWarningCode } from "../../errors/codes";
import { resolveColumn } from "../columns";
import {
    STYLE_DEFINITIONS,
    type StyleCommand,
    type StyleEncodeCommand,
    type StylePatchCommand,
} from "../commands/style";
import { englishRunLabel } from "../english";
import { Dispatcher } from "../project/Dispatcher";
import type { ProjectState } from "../project/state";
import { nearestNames } from "../results/ResultsApi";
import { isHighlightShape, resultPath, resultShapeContract, type RunRef } from "../results/types";
import {
    type Caveats,
    deriveRunId,
    ENGINE_VERSIONS,
    type EngineVersions,
    ManagedRun,
    type ResolvedScope,
    type Run,
    type RunBody,
    type RunDefinition,
    type RunOptions,
    type RunQueue,
    type RunQueueContext,
    type RunSurroundings,
    type RunTicket,
} from "../runs";
import { sealedSet } from "../sealed";
import type { CodedFact, CodedFactParam, ColumnRef } from "../shared";
import type { HistoryCause } from "../types";
import { beneathAuthored } from "./autoApply";
import { channelDescriptor, isChannel, toColorValue } from "./channels";
import { colorsOf, replaceColorPatch, type StyleColor } from "./colors";
import {
    type BindingPreview,
    type PreparedBinding,
    previewBinding,
    requireChannel,
    type RuleBinding,
} from "./encoding";
import {
    type ColumnEncodingSpec,
    type EncodingProposal,
    type EncodingRun,
    type EncodingSource,
    type EncodingSpec,
    planColumnEncoding,
    planEncoding,
    proposeColumnBinding,
} from "./EncodingSpec";
import {
    type AgreementElements,
    type ExplainSources,
    explainStyle,
    type ExplainTarget,
    resolveToStatic as resolveRule,
    type StyleAgreement,
    styleAgreement,
    type StyleCounts,
    styleCounts,
    type StyleExplanation,
    type UnboundLayer,
    unboundLayers,
} from "./explain";
import {
    checkLayerSpec,
    type CompiledLayer,
    isElementSource,
    type Layer,
    type LayerCheck,
    type LayerCheckOptions,
    type LayerPosition,
    type LayerRepaint,
    mintLayerId,
    type PathDirectory,
    type RepaintContext,
    type RepaintReason,
    type RepaintReport,
    sourceOf,
    specOf,
    type ValidationResult,
} from "./Layer";
import {
    buildLayerLegend,
    buildLegend,
    type EncodingLookup,
    type FieldWords,
    type LegendBlock,
    type LegendSources,
} from "./legend";
import { stopsProblem } from "./palettes";
import { quotePath, type SelectorSource, type SelectorTarget } from "./predicate";
import { stackChange } from "./repaint";
import {
    assertRouted,
    partPatch,
    retargetSelector,
    rowOf,
    type RowParts,
    rowParts,
    type RowSpec,
    type RowTarget,
    type RowWrite,
    startingRowOf,
    startingRows,
} from "./rows";
import { createScaleRegistry, type ScaleRegistry } from "./scales";
import {
    arrange,
    documentRows,
    findRow,
    folderIdsOf,
    insertRow,
    layerIdsOf,
    lockedByReader,
    mapRow,
    normalize,
    paintedStack,
    pruneRows,
    publicRow,
    publicRows,
    readDocumentRows,
    reconcile,
    rowKeyOf,
    type RowNode,
    type Rows,
    rowsOf,
    type StyleRow,
    type StyleRowId,
    type StyleRowPin,
    type StyleRowPlace,
} from "./tree";
import { categoriesOf, type ValueCategory, valueEntryPatch } from "./values";

// ---------------------------------------------------------------------------------------------
// The surface
// ---------------------------------------------------------------------------------------------

/**
 * What `highlight()` is asked for: a run that named a subset, and what that subset looks like.
 *
 * There is no channel here and no scale, because a highlight says "these ones" rather than "this
 * much": the run's shape already publishes which elements it chose, and the only question left is
 * what being chosen looks like.
 */
export interface HighlightSpec {
    /** The run, its awaited result, or its bare id. All three are what a caller has in hand. */
    readonly run: RunRef;
    /** The field that says which elements were chosen. Defaults to the shape's primary field. */
    readonly field?: string;
    /** What to call the layer. Defaults to the run's label. */
    readonly name?: string;
    /**
     * What a chosen element is painted.
     *
     * Absent, the element's own highlight colour is used. Channels of the half the run did not
     * choose are ignored, so a route's `set` may name node and edge channels together.
     */
    readonly set?: StaticStyle;
}

/**
 * What {@link StylesApi.agreement} reads besides its scope and channel.
 * @since 3.26.0
 */
export interface AgreementOptions {
    /** Read only the layers beneath this row of the tree. */
    readonly below?: StyleRowId;
    /** Read only the elements this row matches; see {@link StylesApi.agreement}. */
    readonly over?: StyleRowId;
}

/** What applying a style document did, per layer. */
export interface TemplateReport {
    /** The layers that bound and now paint, bottom first. */
    readonly applied: readonly LayerId[];
    /**
     * The layers that read nothing this session answers, and the layers naming a set this project
     * does not hold (detached).
     *
     * They are IN the stack and disabled, never dropped: a layer naming a run that has not been
     * started is a correct layer over a session that will answer it later, and the way to make it
     * paint is `update(id, { enabled: true })` once the data is there.
     */
    readonly unbound: readonly UnboundLayer[];
}

/** What applying a style document accepts beyond the document itself. */
export interface TemplateOptions extends RunOptions {
    /**
     * What to record as the template the layers came from, on every layer that named no source of
     * its own. That is what lets the whole import be swept away again in one call.
     */
    readonly templateId?: string;
}

/**
 * The style stack, the verbs that change it, and the three questions a reader asks of it.
 *
 * Everything on this surface addresses a layer by its id. Nothing on it takes an index, and
 * nothing on it returns one.
 */
export interface StylesApi {
    /**
     * Every layer in the stack, BOTTOM FIRST.
     *
     * Index 0 is the bottom, which is paint order: a layer later in the list paints over a layer
     * earlier in it. The array and the layers in it are frozen, and the same array comes back
     * until the stack changes, so `previous === next` is a valid staleness test.
     *
     * The index a layer happens to sit at is NOT its identity. Read {@link Layer.id} for that,
     * and pass the id to every other verb.
     * @returns The layers, bottom first.
     */
    list(): readonly Layer[];
    /**
     * One layer, by id.
     * @param id - The layer id.
     * @returns The layer, or undefined when the stack holds none with that id.
     */
    get(id: LayerId): Layer | undefined;
    /**
     * Check a layer specification without adding it.
     *
     * SYNCHRONOUS, and it writes nothing: this is what a form calls on every keystroke and before
     * a person presses Apply. It reports every problem it finds rather than the first, each with
     * a path into the specification and, for an expression, the character offset -- and reports
     * separately the paths that parsed but that nothing in this session answers, which are not
     * errors.
     *
     * It deliberately does not say how many elements would match. Counting is a pass over the
     * graph; that question is `session.plan()`, which is a command and says so.
     * @param spec - The layer as it would be added.
     * @returns The verdict.
     */
    validate(spec: LayerSpec): ValidationResult;
    /**
     * Add a layer.
     *
     * The element mints the id. A specification naming an element source is refused: only the
     * element owns element layers.
     * @param spec - The layer to add.
     * @param at - Which neighbour to sit next to. Neither means the top of the stack; both is
     *     refused, because a layer sits in one place.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the layer as the stack now holds it, and rejects with a
     *     `GraphtyError` when the specification, the position or the source is refused.
     */
    add(spec: LayerSpec, at?: LayerPosition, options?: RunOptions): Run<Layer>;
    /**
     * Change a layer, keeping its id.
     *
     * The patch is applied over the layer's current specification, one key deep. A key present
     * with `undefined` CLEARS it, so `{ set: undefined }` drops the literal values; a key absent
     * leaves what was there. The merged specification is checked exactly as a new one would be,
     * so an update cannot leave a layer in a state `add` would have refused.
     * @param id - The layer to change.
     * @param patch - What to change about it.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the layer as it now stands, and rejects with
     *     `E_PROTECTED` for an element-owned layer and `E_UNKNOWN_LAYER` for an id the stack
     *     does not hold.
     */
    update(id: LayerId, patch: Partial<LayerSpec>, options?: RunOptions): Run<Layer>;
    /**
     * Take a layer out of the stack.
     * @param id - The layer to remove.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves when the layer is gone, and rejects with `E_PROTECTED` for an
     *     element-owned layer and `E_UNKNOWN_LAYER` for an id the stack does not hold.
     */
    remove(id: LayerId, options?: RunOptions): Run<void>;
    /**
     * Move a layer to another place in the stack.
     *
     * `before` names the layer this one is to sit IMMEDIATELY BELOW, in the bottom-first order
     * {@link StylesApi.list} returns -- the same reading as `insertBefore` in the DOM. `null`
     * means the top of the stack, where nothing sits above it.
     * @param id - The layer to move.
     * @param before - The layer to sit below, or null for the top of the stack.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves when the layer has moved, and rejects with `E_PROTECTED` for
     *     an element-owned layer and `E_UNKNOWN_LAYER` when either id is not in the stack.
     */
    move(id: LayerId, before: LayerId | null, options?: RunOptions): Run<void>;
    /**
     * Take away every layer whose source the predicate accepts.
     *
     * This is how a consumer sweeps up after itself -- every layer a run produced, every layer a
     * template applied -- without keeping its own list of what it added, which is the list that
     * goes stale.
     *
     * An element-owned layer is NEVER swept, whatever the predicate says, and no refusal is
     * raised for one: a sweep names a category rather than a layer, and failing the whole sweep
     * because the element happens to own a layer the caller never asked about would make the verb
     * unusable. Naming one outright with {@link StylesApi.remove} is `E_PROTECTED`, because that
     * call did ask about it.
     * @param predicate - Which sources to sweep.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the ids that were removed, bottom first. An empty list
     *     when nothing matched, which is not a failure.
     */
    removeBySource(predicate: (source: LayerSource) => boolean, options?: RunOptions): Run<readonly LayerId[]>;
    /**
     * Add one row, which may paint nodes AND edges: with target `"both"` it is a node part and an
     * edge part sharing the selector, one undo step. A selector that speaks both kinds (a value
     * both carry, such as a path's `onPath`) is read by each part for its own kind; a node rule
     * reads its edges by its `edges` reading (`clipped` or `induced` for the edges between its
     * nodes, `incident` for the edges touching them). `set` and `encode` keys are channels
     * (`"edge.width"`) or bare properties (`"color"`), each going to the parts whose kind has it.
     * {@link StylesApi.remove} and {@link StylesApi.move} on either part act on the whole row;
     * {@link StylesApi.list} still returns one layer per part, each with its own `target`.
     * @param spec - The row.
     * @param at - Which neighbour to sit next to; the top of the stack when absent.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the row, and rejects with `E_BAD_COMMAND` (reason
     *     `row-channel-unknown`) for a key no part of the row has.
     */
    addRow(spec: RowSpec, at?: LayerPosition, options?: RunOptions): Run<RowParts>;
    /**
     * Write to every part of a row at once, one undo step: each `set` and `encode` key goes to the
     * parts whose kind has that channel (`color` to both, `width` to the edges), merging one key
     * deep (`undefined` clears one); `name` and `enabled` reach every part.
     * @param id - The row, or any of its parts. A layer that is no part of a row is a row of one.
     * @param write - What to write.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the row, and rejects with `E_UNKNOWN_LAYER`, `E_PROTECTED`
     *     or `E_BAD_COMMAND` (reason `row-channel-unknown`).
     */
    writeRow(id: LayerId, write: RowWrite, options?: RunOptions): Run<RowParts>;
    /**
     * The parts of the row a layer belongs to, and what they paint together.
     * @param id - The row, or any of its parts.
     * @returns The row, or undefined when the stack holds no such layer.
     */
    parts(id: LayerId): RowParts | undefined;
    /**
     * The fixed colours some rows of the tree write: set values, literal bindings and value-table
     * (`map`) entries, never a palette's or a ramp's. Two spellings of one colour are one entry.
     * @param rowIds - Rows of {@link StylesApi.tree}: a layer row (both parts of a two-kind row),
     *     or a folder (every layer in it).
     * @returns One entry per colour, with every layer and channel writing it, in paint order.
     * @throws A `GraphtyError` with code `E_UNKNOWN_LAYER` for an id the tree does not hold.
     * @since 3.26.0
     */
    colors(rowIds: readonly StyleRowId[]): readonly StyleColor[];
    /**
     * Write one colour in place of another wherever {@link StylesApi.colors} finds it under the
     * same rows, as one undoable step. A layer the reader locked is left as it is.
     * @param rowIds - The rows, as {@link StylesApi.colors} takes them.
     * @param from - The colour replaced, in any spelling.
     * @param to - The colour written.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the layers changed, and rejects with `E_UNKNOWN_LAYER`,
     *     or `E_BAD_COMMAND` when `from` or `to` is not a colour.
     * @since 3.26.0
     */
    replaceColor(rowIds: readonly StyleRowId[], from: string, to: string, options?: RunOptions): Run<readonly Layer[]>;
    /**
     * Paint a run's measurement onto a channel. The one path an analysis layer takes.
     *
     * The layer writes itself: the path of the field, the selector that scopes the layer to
     * exactly the elements the run measured, the kind, the name and the source that records which
     * run, which algorithm and which parameters produced it. A caller supplies the run, the
     * channel and its taste, and cannot get the rest wrong.
     *
     * IT REPLACES RATHER THAN STACKS. A layer already painting this channel from this run is taken
     * over in place, keeping its id and its position, so a run that was encoded twice leaves one
     * layer and one legend block rather than two. Any other layer writing that channel is left
     * alone: an encoding replaces a derived layer, not a decision somebody made.
     *
     * A PLAIN DATA COLUMN is encoded the same way, with `column` in place of `run`. Whatever the
     * spec leaves off is chosen from what the column measures (`session.data.declare`) and
     * written into the new layer: one color per value for a categorical column, a ramp or a size
     * range of 1 to 3 for a quantitative one, the declared order for an ordinal one. A later
     * declaration or a new file never changes a layer that already exists. A column encoding adds
     * a layer; it does not replace one.
     *
     * ```ts
     * await session.styles.encode({ column: { kind: "node", name: "department" }, channel: "node.color" });
     * ```
     * @param spec - The run or the column, the channel and the taste.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the layer, and rejects with `E_UNKNOWN_RUN` for a run this
     *     session does not hold, `E_UNKNOWN_ATTRIBUTE` for a field or column that does not exist,
     *     `E_BAD_COMMAND` when the result has nothing per element to bind a channel to, and with
     *     the refusal's code (see {@link StylesApi.proposeEncoding}) when a column cannot be drawn
     *     on the channel by default.
     */
    encode(spec: EncodingSpec | ColumnEncodingSpec, options?: RunOptions): Run<Layer>;
    /**
     * What `encode()` would store for a spec, without storing anything: the binding, or why the
     * column or field cannot be drawn on that channel by default.
     *
     * SYNCHRONOUS and cheap: it reads the cached attribute descriptors, never the column, so a
     * menu can ask it for every column and channel on every render.
     *
     * A refusal is a coded fact whose codes `EncodingRefusalCode` lists; a run spec's refusal carries
     * the code `E_BAD_COMMAND` that `encode()` would reject with.
     * @param spec - What `encode()` would be asked.
     * @returns `{ ok: true, binding }` or `{ ok: false, refusal }`.
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE`, `E_UNKNOWN_RUN` or `E_UNKNOWN_CHANNEL`
     *     for something that does not exist.
     */
    proposeEncoding(spec: EncodingSpec | ColumnEncodingSpec): EncodingProposal;
    /**
     * Paint the elements a run chose: a route, a chosen set of nodes, a chosen set of edges.
     *
     * EXCLUSIVE. Every highlight layer already in the stack is taken away first, because a second
     * route replaces the first rather than being painted over it. Which layers count as highlights
     * is read from the run's shape, so an algorithm cannot opt out of it by being called something
     * else, and an element-owned layer is never swept.
     *
     * A route publishes its membership on nodes AND on edges, and one layer never paints both, so
     * this adds one layer per half the run chose. That is why it resolves with a list.
     * @param spec - The run, the field that says which elements it chose, and what they look like.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the layers it added, bottom first, and rejects with
     *     `E_UNKNOWN_RUN` for a run this session does not hold and `E_BAD_COMMAND` when the run
     *     measured every element rather than choosing some, which is `encode()`'s work.
     */
    highlight(spec: HighlightSpec, options?: RunOptions): Run<readonly Layer[]>;
    /**
     * Choose the colour a highlight paints when it names no style of its own.
     *
     * That covers every route and chosen set a finished run paints by itself, and every
     * `highlight()` called without `set`. A highlighted edge is still drawn three times as wide.
     * The element's own colour is Paul Tol's indigo `#332288`; a consumer whose drawings need a
     * route to stand apart from its own node colours more strongly sets its own.
     *
     * A view setting, not a step: it records nothing in the history, is not saved with the
     * styles, and changes no layer already in the stack -- only highlights painted after it.
     *
     * ```ts
     * session.styles.setHighlightColor("#000000");
     * ```
     * @param color - Any colour a layer's `node.color` accepts, or undefined for the element's
     *     own.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` when the colour is not one a layer accepts.
     */
    setHighlightColor(color: string | undefined): void;
    /**
     * The static style `highlight()` paints on one half of the graph when it is called without
     * `set`: the session's highlight colour (see {@link StylesApi.setHighlightColor}), and for an
     * edge three times the default width as well.
     *
     * A consumer that lets a reader style chosen elements by hand can start them on the same look
     * a highlight would give them.
     *
     * ```ts
     * session.styles.highlightStyle("edge"); // { "edge.color": "#332288", "edge.width": 24 }
     * ```
     * @param target - Nodes or edges.
     * @returns A fresh object; changing it changes nothing in the session.
     */
    highlightStyle(target: SelectorTarget): StaticStyle;
    /**
     * What the picture is telling a reader, derived from the encoding model and never from the
     * canvas.
     *
     * SYNCHRONOUS, and it measures nothing: every figure in it was worked out when the bindings
     * were prepared. It therefore exists headlessly, in a Node test, and at any export scale.
     * @returns One block per channel a layer paints from the data, BOTTOM FIRST -- the same order
     *     {@link StylesApi.list} returns. Empty when nothing is bound to paint.
     */
    legend(): readonly LegendBlock[];
    /**
     * The legend blocks of one layer: what it paints, channel by channel, read the way
     * {@link StylesApi.legend} reads it. Unlike `legend()`, a base layer is answered too, so a
     * layer list can show every layer's paint (a fixed colour is one swatch). A hidden layer
     * paints nothing and answers no blocks.
     * @param id - The layer.
     * @returns One block per channel the layer paints, fixed values included.
     * @throws A `GraphtyError` with code `E_UNKNOWN_LAYER` when the stack holds no layer with that id.
     * @since 3.17.0
     */
    legendOf(id: LayerId): readonly LegendBlock[];
    /**
     * Resolve once the element has finished painting everything it started for itself.
     *
     * WHY A CONSUMER NEEDS THIS. The element paints a run's suggested encoding on the run's first
     * completion, and it does so WITHOUT making the caller await the picture -- a reader who asked
     * for a measurement is waiting on the numbers, not on the repaint. The consequence is that
     * `await runs.start(...)` hands back the result while the paint is still on its way, so a
     * consumer that reads {@link StylesApi.list} or {@link StylesApi.legend} in the same turn sees
     * the picture as it stood a moment earlier and can reasonably conclude the element painted
     * nothing.
     *
     * Working that out by counting turns is coordination code, and coordination code is exactly
     * what a consumer should never have to write against this element. So the element answers the
     * question instead.
     *
     * Every style edit is queued on the session's own queue, so this is the queue being empty
     * rather than a per-run promise: after it resolves there is no element-initiated painting
     * outstanding, whoever started it.
     * @returns A promise that resolves when nothing the element started is still in flight.
     */
    settled(): Promise<void>;
    /**
     * Why one element looks the way it does: what it is painted, which layer painted each part of
     * it, and whether a person may change any of it where they are looking.
     *
     * SYNCHRONOUS. It walks the stack once for one element with the same closures the repaint ran,
     * so it is not a second reading of the merge that can drift from the first.
     * @param target - The node or the edge to explain.
     * @returns The merged style, who contributed what, and which channels are editable.
     * @throws A `GraphtyError` with code `E_BAD_COMMAND` when the session holds no such element.
     */
    explain(target: ExplainTarget): StyleExplanation;
    /**
     * How several elements look, channel by channel: whether they agree, and on what.
     *
     * The several-elements counterpart of {@link StylesApi.explain}, read through the same walk
     * over the stack, so it says about each element what an explanation of that element says.
     * Two elements agree on a channel only when they carry the same value AND the same layer
     * decided it. The answer is counts, never lists of ids, and it costs one pass over the scope.
     * @param scope - The elements to read: the selection, a kept set, a list of node ids, or any
     *     other scope the session resolves.
     * @param channel - One channel to restrict the answer to. Absent, every channel something
     *     painted is answered.
     * @param options - What else to read.
     * @param options.below - A row of {@link StylesApi.tree}. Given, the answer reads only the
     *     layers beneath that row (the element's own layers beneath it included), so it is what
     *     those elements would look like without the row and everything above it: the value a
     *     panel shows as an empty field's placeholder. Beneath the bottom row it is the element's
     *     own floor. Since 3.26.0.
     * @param options.over - A row of {@link StylesApi.tree}. Given, the answer reads only the
     *     elements of `scope` that row matches, so `{ below: row, over: row }` is what lies beneath
     *     the row on its own elements. When the row matches none of them (Selected with nothing
     *     selected, Hovered), it reads the elements of the row's kinds through only the layers whose
     *     selector matches every element -- what an element would get on entering the row -- and
     *     says so in {@link StyleAgreement.readOver}. Since 3.26.0.
     * @returns Per channel, the value and deciding layer they all share or how they split, and how
     *     many elements nothing painted on it.
     * @throws A `GraphtyError` with code `E_UNKNOWN_CHANNEL` when `channel` names no channel, and
     *     `E_UNKNOWN_LAYER` when `below` or `over` names no row.
     */
    agreement(scope: Scope, channel?: Channel, options?: AgreementOptions): StyleAgreement;
    /**
     * What a binding would paint, read before it is written: the bins of its scale over the
     * channel's kind of element, how many elements fall in each and what each paints, where a
     * stepped scale changes step, and how many elements sit below or above the domain, carry no
     * value, or carry one the scale has no place for.
     *
     * Prepared exactly as the repaint prepares a written binding (the session's default palettes
     * filled in the same way), so a layer written with this binding paints what the preview said.
     * Counts only, in one pass over the elements of the channel's kind.
     * @param binding - The binding, as it would be written: `{ by, scale, palette or stops, ... }`.
     * @param options - Where to read it.
     * @param options.channel - The channel it would paint.
     * @param options.bins - How many bins to cut a numeric domain into (20 when absent); a scale of
     *     categories has one bin per category.
     * @returns The preview.
     * @throws A `GraphtyError`: `E_UNKNOWN_CHANNEL` for a channel the element does not have,
     *     `E_BAD_COMMAND` for a binding that reads no value, `E_BAD_LAYER`, `E_UNKNOWN_SCALE`,
     *     `E_UNKNOWN_PALETTE` or `E_CAP_EXCEEDED` for one the channel cannot take, as writing it
     *     would.
     * @since 3.26.0
     */
    preview(binding: RuleBinding, options: { readonly channel: Channel; readonly bins?: number }): BindingPreview;
    /**
     * How many elements one layer covers, and on how many it decides each channel it writes.
     *
     * Read through the same walk over the stack as {@link StylesApi.explain} and
     * {@link StylesApi.agreement}, so the three never disagree. Counts only, in one pass over the
     * layer's kind of element. Re-read it when `revision` would change: on `style:changed`, and
     * after a data or run change.
     * @param id - The layer.
     * @returns What it matches, where it wins each channel, and what it could not paint.
     * @throws A `GraphtyError` with code `E_UNKNOWN_LAYER` when the stack holds no layer with that id.
     * @since 3.16.0
     */
    counts(id: LayerId): StyleCounts;
    /**
     * Turn a rule into the fixed value it currently produces, so a person can then edit it.
     *
     * THE PAIRED VERB OF {@link StylesApi.explain}, which reports a channel worked out from the
     * data as not editable: a control offered there would take a value, write it, and be painted
     * over by the rule on the same repaint. This takes the value the rule produces and writes it
     * as a literal, which is what makes the control honest.
     * @param id - The layer carrying the rule.
     * @param channel - The channel the rule paints.
     * @param at - The element whose painted value to fix on. Absent, the rule is asked about the
     *     largest group it found or the middle of the extent it measured, so the fixed value is a
     *     value out of this picture rather than an invented one.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the layer as it now stands, and rejects with `E_PROTECTED`
     *     for an element-owned layer, `E_UNKNOWN_LAYER` for an id the stack does not hold, and
     *     `E_BAD_COMMAND` when that layer works the channel out from nothing.
     */
    resolveToStatic(id: LayerId, channel: Channel, at?: ExplainTarget, options?: RunOptions): Run<Layer>;
    /**
     * Hide or show the paint of one value of a layer's encoding -- one group of a community run's
     * colours, say -- as one undoable step that is saved with the project.
     *
     * The value is hidden in `channel` and in every other channel of the layer that reads the same
     * field, so a group drawn by colour and shape disappears from both; a channel reading another
     * field is left alone, because a value of one field is not the same value in another. An
     * element carrying it is drawn as the layers beneath paint it, as an unmeasured element is.
     * The legend keeps the value's row, marked `hidden`, with the colour it comes back in. Values
     * are compared as the legend spells them, so `0` and `"0"` are the same group; pass the
     * `channel` and a swatch `value` of a legend block, or the `group` of a run summary's group.
     * @param id - The layer, such as the one `encode()` returned.
     * @param channel - The channel whose value it is, such as a legend block's `channel`.
     * @param value - The value to hide or show.
     * @param hidden - True to hide it, false to paint it again.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the layer as it now stands (its bindings' `hidden` lists),
     *     and rejects with `E_PROTECTED` for an element-owned layer, `E_UNKNOWN_LAYER` for an id
     *     the stack does not hold, and `E_BAD_COMMAND` when the layer does not encode `channel`
     *     from the data.
     */
    setValueHidden(
        id: LayerId,
        channel: Channel,
        value: string | number | boolean,
        hidden: boolean,
        options?: RunOptions,
    ): Run<Layer>;
    /**
     * The values one channel of a layer paints by category -- a community run's groups, a data
     * column's values -- largest group first, from what the last repaint painted: each value, how
     * many of the layer's elements carry it, whether it is hidden, and its value-table entry.
     *
     * When a run re-runs, a group the run made up is matched to the new group sharing most of its
     * members, and every layer's entries, hidden values and rule conditions naming it follow it; a
     * value that is a name is matched by name; what matched nothing is reported in the layer's
     * `unmatched` as codes.
     * @param id - The layer.
     * @param channel - The channel, such as `"node.color"`.
     * @returns The values; none when the layer does not paint the channel by category.
     * @throws `E_UNKNOWN_LAYER` for an id the stack does not hold.
     */
    categories(id: LayerId, channel: Channel): readonly ValueCategory[];
    /**
     * Set what one value of a categorical binding paints, or let it follow the palette again, as
     * one undoable step: an entry in the binding's value table (its `map`). A palette change
     * reaches every value without an entry and leaves the entries alone.
     * @param id - The layer.
     * @param channel - A channel the layer paints from a value, such as `"node.color"`.
     * @param value - The value, as {@link ValueCategory.value} spells it.
     * @param entry - What the value paints, or undefined to clear the entry.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the layer, and rejects with `E_BAD_COMMAND` when the layer
     *   does not paint `channel` from a value (`details.reason` `"not-bound"`) or the entry is not
     *   a text or a number (`"bad-entry"`), `E_UNKNOWN_LAYER`, `E_PROTECTED` and `E_LOCKED`.
     */
    setValueEntry(
        id: LayerId,
        channel: Channel,
        value: string | number | boolean,
        entry: ChannelValue | undefined,
        options?: RunOptions,
    ): Run<Layer>;
    /**
     * Add a saved stack of layers to this one.
     *
     * THREE OUTCOMES PER LAYER, AND ALL THREE ARE REPORTED. A layer whose paths this session
     * answers is applied and paints. A layer whose paths nothing answers is added DISABLED and
     * reported in `unbound` with what it needs -- never dropped in silence, and never left enabled
     * to match nothing, because a confident empty screen reads exactly like a correct answer of
     * zero. A layer the element would refuse outright takes the whole document down, so an import
     * either lands or leaves the stack exactly as it was.
     * @param document - The layers to add, bottom first, as {@link StylesApi.toDocument} writes
     *     them.
     * @param options - What to record as the template, a signal to cancel with, and a progress
     *     handler.
     * @returns A run that resolves with what bound and what did not, and rejects with
     *     `E_BAD_LAYER` for a malformed layer, `E_PROTECTED` for one claiming to be the element's
     *     own, and `E_UNSUPPORTED` for a palette this element does not have.
     */
    applyTemplate(document: StyleDocument, options?: TemplateOptions): Run<TemplateReport>;
    /**
     * The stack as a portable document, for saving, sharing and applying to another dataset.
     *
     * SYNCHRONOUS. The element's own layers are NOT in it: they come with the element, they cannot
     * be added by a consumer, and a document carrying them would either duplicate them or be
     * refused wherever it was applied. What a document holds is what somebody chose.
     * @returns The document, bottom first.
     */
    toDocument(): StyleDocument;
    /**
     * The style tree: the consumer's layers as rows, with folders, pins, the reader's locks and
     * hidden rows, BOTTOM FIRST at every level.
     *
     * Flattening it gives the consumer's layers in exactly {@link StylesApi.list}'s order, so the
     * tree order is the paint order. The element's own layers are not rows: they are the floor.
     * Within one folder, rows pinned to the bottom come first and rows pinned to the top last. A
     * folder's eye and lock reach every row in it. The same array comes back until the stack
     * changes.
     * @returns The top-level rows, bottom first.
     */
    tree(): readonly StyleRow[];
    /**
     * Add an empty folder.
     * @param name - What to call it.
     * @param at - The folder to put it in and its index there, bottom first; the top of the
     *     unpinned top-level rows when absent.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the folder's row, and rejects with `E_UNKNOWN_LAYER` for a
     *     parent the tree does not hold and `E_BAD_COMMAND` for a parent that is not a folder.
     */
    addFolder(name: string, at?: StyleRowPlace, options?: RunOptions): Run<StyleRow>;
    /**
     * Rename a row: a folder, or a layer (which renames the layer). Allowed on a locked row.
     * @param id - The row.
     * @param name - The new name.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the row, and rejects with `E_UNKNOWN_LAYER` for a row the
     *     tree does not hold.
     */
    renameRow(id: StyleRowId, name: string, options?: RunOptions): Run<StyleRow>;
    /**
     * Move a row, with everything in it, to a folder (or the top level) and an index there. The
     * layers it holds move in the paint order with it.
     * @param id - The row.
     * @param to - The folder and the index, bottom first, counted without the row itself. A pinned
     *     row stays in its pin band.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the row, and rejects with `E_UNKNOWN_LAYER` for a row or
     *     parent the tree does not hold, and `E_BAD_COMMAND` for a parent that is not a folder or
     *     lies inside the row.
     */
    moveRow(id: StyleRowId, to: StyleRowPlace, options?: RunOptions): Run<StyleRow>;
    /**
     * Pin a row to the top or the bottom of its folder, or unpin it. A row pinned to the bottom
     * stays beneath every unpinned row, including those added later.
     * @param id - The row.
     * @param pin - Where to pin it.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the row.
     */
    pinRow(id: StyleRowId, pin: StyleRowPin, options?: RunOptions): Run<StyleRow>;
    /**
     * Set the reader's lock on a row. While it, or a folder holding it, is locked, `update` (and
     * every verb that changes a layer's look) refuses the layer with `E_LOCKED`. Renaming, moving,
     * pinning, hiding and deleting still work. Not {@link Layer.locked}, which marks the
     * element's own layers.
     * @param id - The row.
     * @param locked - True to lock it.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the row.
     */
    lockRow(id: StyleRowId, locked: boolean, options?: RunOptions): Run<StyleRow>;
    /**
     * Hide or show a row. A hidden row, and every row in a hidden folder, paints nothing and keeps
     * its place; {@link StylesApi.list} still reports its layers as their authors wrote them.
     * @param id - The row.
     * @param hidden - True to hide it.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the row.
     */
    hideRow(id: StyleRowId, hidden: boolean, options?: RunOptions): Run<StyleRow>;
    /**
     * Delete a row: a layer, or a folder with every row and layer in it.
     * @param id - The row.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the ids of the layers removed, bottom first.
     */
    deleteRow(id: StyleRowId, options?: RunOptions): Run<readonly LayerId[]>;
    /**
     * Add back whichever of the three starting rows the tree lacks: Everything (nodes and edges,
     * pinned to the bottom, writing nothing), Selected (nodes and edges, pinned to the top,
     * drawing a near-black node halo with a white glow and a near-black edge band) and Hovered (nodes, pinned to
     * the top, writing nothing). One undo step; nothing when all three are there. Setting the
     * project setting `startingRows` to true adds them the same way.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the rows added, bottom first.
     * @since 3.26.0
     */
    restoreStartingRows(options?: RunOptions): Run<readonly RowParts[]>;
    /**
     * Choose the palette a colour binding uses when it names none, one per palette kind: a
     * binding on groups takes the categorical default, one on amounts the sequential default, and
     * one with a `midpoint` the diverging default. A kind left out keeps its current default.
     *
     * RESOLVED WHEN A LAYER IS WRITTEN: a binding that names no palette records the default's id,
     * so a saved document always names a concrete palette. The call therefore belongs before the
     * layers are added. A later call leaves the layers that took the previous default as they are
     * and writes a warning naming them; with `reapply: true` it re-resolves those layers instead.
     * A layer that names its palette is never touched.
     * @param palettes - The palette id per kind. Each must name a palette of that kind.
     * @param options - How a late call treats the layers already written.
     * @param options.reapply - True re-resolves the layers that took the previous default.
     * @throws `E_UNKNOWN_PALETTE` for an id no palette answers to, `E_BAD_COMMAND` for a palette
     *   of the wrong kind or a slot that is not a palette kind.
     */
    setDefaultPalettes(palettes: DefaultPalettes, options?: { readonly reapply?: boolean }): void;
}

/** The palette a colour binding naming none uses, per palette kind. */
export interface DefaultPalettes {
    readonly categorical?: string;
    readonly sequential?: string;
    readonly diverging?: string;
}

/**
 * The style stack as the session holds it: the consumer surface, plus the compiled form.
 *
 * `compiled()` is separate rather than folded into `list()` because the two shapes disagree on
 * purpose. A consumer reads layers as data; a repaint needs the predicate that was built when the
 * layer was added, and a consumer has no business holding one.
 */
export interface SessionStylesApi extends StylesApi {
    /**
     * The stack with every selector already compiled, BOTTOM FIRST.
     *
     * What a renderer binding to this session reads when it paints from scratch -- a first draw,
     * a dataset change, a resumed view -- rather than from the dirty set an edit hands it.
     * @returns The compiled layers, bottom first.
     */
    compiled(): readonly CompiledLayer[];
}

/**
 * A layer the element owns, which is the only kind that may be seeded as one.
 *
 * Element layers exist by construction: they are handed to `createStylesApi` and cannot be
 * added afterwards, which is what makes `locked` a fact about where a layer came from rather than
 * a flag anybody can set.
 */
export interface ElementLayerSpec extends LayerSpec {
    /** Always an element source. That is what makes the layer locked. */
    source: Extract<LayerSource, { by: "element" }>;
}

/** What one change to the stack was, as a host mirrors it onto an event. */
export interface StyleChange {
    /** Which verb produced it. */
    readonly reason: RepaintReason;
    /** The layers it touched, bottom first. */
    readonly layers: readonly LayerId[];
    /**
     * How much the pass that drew this change repainted, or null when no renderer is bound to
     * this session. When one pass covers several edits (a colour picker's drag, a held undo),
     * each edit's change carries that pass's whole report.
     */
    readonly painted: RepaintReport | null;
    /**
     * The paths the changed layers read that nothing in this session answers.
     *
     * Not a failure: a selector naming a run that has not been started is a correct selector over
     * a session that will answer it later. It is reported so a consumer can say why a layer
     * paints nothing instead of showing a confident empty screen.
     */
    readonly unresolvedPaths: readonly Path[];
    /**
     * What the changed layers will paint nothing for, as codes; see
     * {@link ValidationResult.warnings}. Empty for an undo, a redo, a restore or a rollback.
     */
    readonly warnings: readonly CodedFact<GraphtyWarningCode>[];
    /**
     * What moved the stack: an edit (`"command"`), or an undo, a redo, a restore or a rollback,
     * which each publish one change per step they passed.
     */
    readonly cause: HistoryCause;
}

/** Everything the style stack is built from. */
export interface StylesSources {
    /**
     * What the session can answer about one element, which is what a selector compiles against.
     *
     * Read per element by the predicate rather than captured, so a compiled layer stays correct
     * across a freeze that renumbers the index space.
     */
    readonly elements: SelectorSource;
    /** See {@link LayerCheckOptions.admitScope}. */
    readonly admitScope?: LayerCheckOptions["admitScope"];
    /**
     * The element's own layers, seeded at the bottom of the stack in the order given.
     *
     * Checked at construction like any other layer; a malformed one is `E_INTERNAL`, because a
     * layer the element ships is the element's bug and not the caller's.
     */
    readonly base?: readonly ElementLayerSpec[];
    /** Which paths this session answers. Absent means it cannot say, and none are reported. */
    readonly paths?: PathDirectory;
    /** The scales a binding may name. Absent builds a registry holding the built-ins. */
    readonly scales?: ScaleRegistry;
    /**
     * Where a run is looked up, for the two verbs that take one.
     *
     * Absent, `encode()` and `highlight()` refuse with `E_UNSUPPORTED`: a session that cannot
     * resolve a run cannot write a layer bound to one, and writing a layer bound to a run it never
     * checked would produce a selector that matches nothing and says nothing about why.
     */
    readonly runs?: EncodingSource;
    /**
     * Where a column encoding looks its column up. Absent, `encode({ column })` and
     * `proposeEncoding({ column })` refuse with `E_UNSUPPORTED`.
     */
    readonly columns?: {
        /** @returns What `session.data.attributes()` lists now. */
        attributes(): readonly AttributeDescriptor[];
        /**
         * @param column - The column.
         * @returns What it was declared to measure, if anything.
         */
        declaration(column: ColumnRef): MeasurementDeclaration | undefined;
    };
    /**
     * The prepared bindings the last repaint painted from, by layer.
     *
     * What {@link StylesApi.legend} and {@link StylesApi.explain} read, which is what makes both
     * of them a reading of the object that made the picture rather than a second guess at it. A
     * binding's domain, its palette and its category list are settled once, against the column, by
     * whatever prepared it; nothing here prepares one, because preparing one is a pass over the
     * data and these two verbs are synchronous reads.
     *
     * Absent, the session has nothing prepared to read: the legend is empty and an explanation
     * paints nothing. That is the truthful answer for a session with no renderer bound to it, not
     * a degraded one.
     *
     * Asked by the COMPILED layer rather than by its id, because a layer id is recycled: it is a
     * slug of the layer's name plus the lowest number no layer in the stack is using, so removing
     * a layer frees its id for the next layer of the same name. A lookup by id would answer for
     * the departed layer, and a legend block would name one layer while reporting another's
     * channel, domain and palette. This API still speaks ids to its own callers -- {@link
     * EncodingLookup} is what the legend and the explanation take -- and the translation happens
     * once, here, where the stack that resolves an id to its compiled layer lives.
     */
    readonly encoding?: (entry: CompiledLayer) => readonly PreparedBinding[];
    /**
     * The dense index of one node, for {@link StylesApi.explain}.
     *
     * Absent, no node id resolves and every explanation refuses with `E_BAD_COMMAND`, which is
     * what a session that holds no element to explain should say.
     * @param id - The node id.
     * @returns Its index, or undefined when the session holds no node with that id.
     */
    readonly nodeIndex?: (id: NodeId) => number | undefined;
    /**
     * The dense index of one edge, for {@link StylesApi.explain}.
     * @param id - The edge id.
     * @returns Its index, or undefined when the session holds no edge with that id.
     */
    readonly edgeIndex?: (id: EdgeId) => number | undefined;
    /**
     * The words one field goes by, from the session's attributes and run fields.
     *
     * Absent, or absent for a particular path, a legend humanises the path's last segment and says
     * so rather than pretending a plain name was found.
     * @param path - The column path.
     * @param target - Whether the layer asking paints nodes or edges.
     * @returns The words, or undefined when nothing in the session names that path.
     */
    readonly field?: (path: Path, target: SelectorTarget) => FieldWords | undefined;
    /**
     * Each group's place by size in one run, from the run's `sizes` table, keyed by the group as
     * a category name. Absent, a legend ranks a run's groups by their place among its swatches.
     * @param runId - The run.
     * @returns The rank by group, or undefined when the run has no sizes table.
     */
    readonly groupRanks?: (runId: RunId) => ReadonlyMap<string, number> | undefined;
    /**
     * What paints the elements a change touched.
     *
     * THE SEAM, and the one thing this module does not do. Absent, an edit changes the stack and
     * paints nothing, which is exactly right for a headless session.
     */
    readonly repaint?: LayerRepaint;
    /**
     * The queue the session's runs take their turn in, which `settled()` waits on because a run
     * paints its suggested layers when it finishes. An edit does not take a turn in it: it is
     * written when it is dispatched.
     */
    readonly queue?: RunQueue;
    /**
     * The one path every change to project state takes, and the history it records. The stack
     * lives in its `styles` slice. Absent, the stack gets a dispatcher of its own.
     */
    readonly dispatcher?: Dispatcher;
    /**
     * Resolve a scope specification, so an edit can record what it looked at.
     *
     * Absent, an edit records a scope of no elements. A style edit's real extent is decided by
     * the layers it touches rather than by a node set, so nothing depends on this being exact.
     * @param spec - What to resolve.
     * @returns What it resolves to now.
     */
    readonly resolveScope?: (spec: Scope) => ResolvedScope;
    /** Which versions are doing the work. Defaults to the element's own. */
    readonly engine?: EngineVersions;
    /**
     * Called whenever the stack changes, so a host can mirror it onto an event.
     * @param change - What changed, and how much was painted.
     */
    readonly onChange?: (change: StyleChange) => void;
    /**
     * A number that moves whenever the data or the run results change, which is half of what
     * {@link StyleCounts.revision} is made of. Absent, only style changes move it.
     */
    readonly inputRevision?: () => number;
    /**
     * Aborted when the session holding the stack is disposed. Every edit still pending is
     * cancelled with it, so a caller awaiting one gets an `AbortError` rather than waiting for
     * ever, and an edit issued afterwards is cancelled before it starts.
     */
    readonly disposed?: AbortSignal;
}

// ---------------------------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------------------------

/** What a style edit records as the scope it looked at. */
const WHOLE_GRAPH: Scope = "graph";

/** A style edit publishes no per-element field: the stack is not a result bag. */
const NO_FIELDS: readonly FieldDescriptor[] = Object.freeze([]);

/** Nothing further qualifies a style edit. */
const NO_NOTES: readonly string[] = Object.freeze([]);

/** No paths went unanswered. */
const NO_PATHS: readonly Path[] = Object.freeze([]);

/** Nothing to warn about. */
const NO_WARNINGS: readonly CodedFact<GraphtyWarningCode>[] = Object.freeze([]);

/** A layer nothing prepared has no bindings to read. */
const NO_BINDINGS: readonly PreparedBinding[] = Object.freeze([]);

/**
 * The index of an element in a session that cannot resolve ids.
 * @returns Undefined, always: no id names an element here.
 */
const NO_INDEX = (): number | undefined => undefined;

/**
 * What a highlight paints when its caller names no style and the consumer chose no colour with
 * {@link StylesApi.setHighlightColor}.
 *
 * A highlight is drawn OVER the default indigo node, the default darkgrey edge, the whitesmoke
 * background AND whatever a measurement painted the other nodes, so it is chosen against all of
 * them rather than on its own. Paul Tol's indigo is at least Delta E 19 from each of them -- every
 * colour of the default measurement palette included -- at normal vision and under all three
 * kinds of colour blindness, and 11:1 against the background. The Okabe-Ito vermilion it replaced
 * sat inside the default measurement palette (Delta E 1 from its second step), so a route drawn
 * over nodes coloured by a score read as low-scored nodes; the blue before that was Delta E 13
 * from the default node. `test/catalog/default-palette-quality.test.ts` measures it.
 *
 * It is a neutral default, not the best colour for every drawing: rendered as lit spheres on a
 * drawing with no measure, an indigo route's nodes sit close to the default nodes in lightness.
 * A consumer that wants a route to stand out more on its own drawings chooses its colour with
 * {@link StylesApi.setHighlightColor}.
 *
 * Colour alone is not enough for an edge: a thin line at the default width reads as a thin line
 * whatever its colour, so a highlighted edge is also drawn three times as wide. A node gets no
 * size, because a size here would flatten whatever size encoding the layers beneath it drew.
 */
export const DEFAULT_HIGHLIGHT = {
    color: "#332288",
    edgeWidth: EDGE_CONSTANTS.DEFAULT_LINE_WIDTH * 3,
} as const;

/** The only style document version there is. */
const DOCUMENT_VERSION = 1;

/** Both halves of a graph, in the order a document and a report list them. */
const HALVES: readonly SelectorTarget[] = Object.freeze(["node", "edge"]);

/**
 * Which door one edit came through.
 *
 * Wider than {@link RepaintReason}, which says what a repaint has to do rather than what was
 * asked: an encode that replaces a layer is an update to the repaint and an encode to the person
 * who called it, and both facts are worth keeping.
 */
type StyleVerb = "encode" | "highlight" | "resolve" | "template" | RepaintReason;

/** Style commands worked out when the edit runs and recorded together as one step. */
interface StyleBatch {
    readonly batch: () => readonly StyleCommand[];
}

/** Nothing qualifies a style edit's work: it is exact, it reads no weights, it samples nothing. */
const EDIT_CAVEATS: Caveats = Object.freeze({
    direction: "as-loaded",
    exact: true,
    method: "layer-stack",
    facts: [],
    notes: NO_NOTES,
    precision: "f64",
    seed: null,
    weight: null,
});

/** The stack an edit produces, worked out before anything is written. */
interface EditPlan<T> {
    /** The stack as it will stand, bottom first. */
    readonly stack: readonly CompiledLayer[];
    /** What the run resolves to. */
    readonly result: T;
    /** The layers the edit touched, for the change announcement. */
    readonly layers: readonly LayerId[];
    /** The paths those layers read that nothing answers. */
    readonly unresolvedPaths: readonly Path[];
    /** What those layers will paint nothing for, when the plan checked any. */
    readonly warnings?: readonly CodedFact<GraphtyWarningCode>[];
    /**
     * What the change announcement says this edit was. Worked out by the plan, because an
     * `encode()` only knows whether it adds a layer or replaces one once it has looked at the
     * stack.
     */
    readonly reason: RepaintReason;
    /** The style tree the edit leaves, when it changes the tree itself; else worked out from the stack. */
    readonly rows?: Rows;
    /** A layer the edit moved, whose tree row is placed again by its new neighbours. */
    readonly moved?: LayerId;
}

/** What a style command's dispatch resolves with. */
interface EditOutcome<T> {
    /** What the verb resolves with. */
    readonly result: T;
    /** How much the pass repainting the edit painted; rejects when that repaint failed. */
    readonly painted: Promise<RepaintReport | null>;
}

/** An edit written and not yet repainted, told once the pass covering it has run. */
interface Announcement {
    readonly change: Omit<StyleChange, "painted" | "cause">;
    settle(painted: RepaintReport | null): void;
    refuse(error: unknown): void;
}

/** What an edit's run is handed in place of a queue slot: it is never stopped. */
const IMMEDIATE: RunQueueContext = {
    signal: new AbortController().signal,
    progress: { setProgress: () => undefined, setMessage: () => undefined, setPhase: () => undefined },
    id: "style-edit",
};

/** An edit's run has nothing on a queue to cancel. */
const NO_TICKET: RunTicket = { cancel: () => undefined };

/**
 * A pass's repaint is never cancelled: a newer change waits for the next pass instead.
 */
const PASS_CONTEXT: RepaintContext = {
    signal: new AbortController().signal,
    report: () => undefined,
};

/** What a pass paints when the stack it is handed is the one it already shows. */
const NOTHING_PAINTED: RepaintReport = Object.freeze({ nodes: 0, edges: 0 });

/** What every folder id starts with, which no layer id can (a layer id has no colon). */
const FOLDER = "folder:";

/** The tree a consumer reads, per stack, so the same array comes back until the stack changes. */
const treeCache = new WeakMap<readonly CompiledLayer[], readonly StyleRow[]>();

/** One layer of a style document, in both the form it was written in and the form it compiled to. */
interface ImportedLayer {
    /** The specification the document carried, kept so the layer can be re-checked disabled. */
    readonly spec: LayerSpec;
    /** The layer it compiled to, carrying the id it will keep. */
    readonly compiled: CompiledLayer;
}

/**
 * The dense indices of the ids a scope resolved to, skipping any the session no longer holds.
 * @param ids - The ids.
 * @param indexOf - Where an id is resolved.
 * @yields Each index, in the order the ids came.
 */
function* indicesOf<Id>(ids: Iterable<Id>, indexOf: (id: Id) => number | undefined): Generator<number> {
    for (const id of ids) {
        const index = indexOf(id);
        if (index !== undefined) {
            yield index;
        }
    }
}

/**
 * A scope of no elements, for a session that hands in no resolver.
 * @returns The resolved scope.
 */
function emptyScope(): ResolvedScope {
    return Object.freeze({
        digest: "",
        edgeCount: 0,
        edges: sealedSet<never>([], "A resolved scope is an answer, not a place to write."),
        nodeCount: 0,
        nodes: sealedSet<never>([], "A resolved scope is an answer, not a place to write."),
        resolvedAt: new Date().toISOString(),
        spec: WHOLE_GRAPH,
    });
}

/**
 * The refusal a call naming a layer the stack does not hold gets.
 * @param id - The id that was named.
 * @param known - Every id the stack does hold.
 * @returns The error to reject with.
 */
function unknownLayer(id: LayerId, known: readonly LayerId[]): GraphtyError {
    return new GraphtyError({
        code: "E_UNKNOWN_LAYER",
        message: `There is no style layer with the id "${id}".`,
        source: "style",
        target: { kind: "layer", id },
        details: { id, known },
    });
}

/**
 * The refusal a call that would change an element-owned layer gets.
 * @param layer - The layer it named.
 * @param verb - What it tried to do.
 * @returns The error to reject with.
 */
function protectedLayer(layer: Layer, verb: string): GraphtyError {
    return new GraphtyError({
        code: "E_PROTECTED",
        message:
            `"${layer.name}" belongs to the element, so it cannot be ${verb}. ` +
            "Add a layer of your own above it instead.",
        source: "style",
        target: { kind: "layer", id: layer.id },
        details: { id: layer.id, source: layer.source, verb },
    });
}

/**
 * The refusal a call that would change a layer the reader locked gets.
 * @param layer - The layer it named.
 * @param row - The locked row: the layer's own, or a folder holding it.
 * @returns The error to reject with.
 */
function readerLocked(layer: Layer, row: StyleRowId): GraphtyError {
    return new GraphtyError({
        code: "E_LOCKED",
        message: `"${layer.name}" is locked. Unlock it before changing it.`,
        source: "style",
        target: { kind: "layer", id: layer.id },
        details: { id: layer.id, row },
    });
}

/**
 * The refusal a call naming a row the style tree does not hold gets.
 * @param id - The id that was named.
 * @param rows - The tree.
 * @returns The error to reject with.
 */
function unknownRow(id: StyleRowId, rows: Rows): GraphtyError {
    const known: string[] = [];
    const walk = (list: Rows): void => {
        for (const row of list) {
            known.push(row.id);
            walk(row.children ?? []);
        }
    };
    walk(rows);
    return new GraphtyError({
        code: "E_UNKNOWN_LAYER",
        message: `There is no style row with the id "${id}".`,
        source: "style",
        details: { id, known },
    });
}

/**
 * The refusal a specification the check rejected gets.
 *
 * The code is the FIRST problem's, so a consumer switching on it sees the reason a person would
 * name, and every problem travels in `details.errors` so a form can mark them all at once.
 * @param name - What the layer was called, for the message.
 * @param result - The verdict.
 * @returns The error to reject with.
 */
function refusedSpec(name: string, result: ValidationResult): GraphtyError {
    const first = result.errors[0];

    return new GraphtyError({
        code: first?.code ?? "E_BAD_LAYER",
        message: `"${name}" cannot be a style layer: ${first?.message ?? "the specification is malformed."}`,
        source: "style",
        details: { errors: result.errors, unresolvedPaths: result.unresolvedPaths },
    });
}

/**
 * The source a document's layer is filed under.
 *
 * A layer that named its own source keeps it: a layer a run produced goes on saying so, which is
 * what lets it be re-run or swept with the rest of that run's work. A layer that named none is
 * filed under the template it arrived in, so the whole import can be swept away in one call.
 * @param spec - The layer as the document carried it.
 * @param templateId - What the import is called, when the caller named it.
 * @returns The specification to check.
 */
function stamped(spec: LayerSpec, templateId: string | undefined): LayerSpec {
    if (spec.source !== undefined || templateId === undefined) {
        return spec;
    }

    return { ...spec, source: { by: "template", templateId } };
}

/**
 * Check a style document is one this element can read at all.
 *
 * A DOCUMENT MAY CARRY PALETTES AND THEY ARE NOT AN ERROR. The refusal here used to say that
 * "palettes travel with the element, not with a document", which stopped being true the moment a
 * palette could be registered: a document naming a registered palette is applied, and only one
 * naming a palette nothing registered is refused -- with the code that tells a consumer to
 * register it first rather than one that says the element does not support the idea.
 * @param document - The document.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` for a version this element does not read,
 *   and `E_UNKNOWN_PALETTE` for a palette nothing on this page has registered.
 */
function checkDocument(document: StyleDocument): void {
    // Read as a number rather than as the literal the type declares: a document is data off a
    // disk or a wire, and the one thing a version field exists for is to carry a value this
    // build has never heard of.
    const { version } = document as { version: number };

    if (version !== DOCUMENT_VERSION) {
        throw badCommand(
            `This element reads style documents of version ${String(DOCUMENT_VERSION)}, and this one says version ${String(version)}.`,
            { version },
        );
    }

    const missing = (document.palettes ?? [])
        .filter((palette) => paletteDescriptor(palette.id) === undefined)
        .map((palette) => palette.id);

    if (missing.length > 0) {
        const available = knownPaletteIds();

        throw new GraphtyError({
            code: "E_UNKNOWN_PALETTE",
            message:
                `Nothing has registered the palette ${missing.map((id) => `"${id}"`).join(", ")}. ` +
                "Register it with `registerPalette` before applying this document; applying it now would " +
                "paint colours nobody chose.",
            source: "style",
            details: { palettes: missing, available, candidates: available },
        });
    }
}

/**
 * The descriptors of every palette these layers name that the element does not itself ship.
 *
 * WHY A SAVED LOOK CARRIES THEM. A document records the palette a layer paints through by NAME,
 * and a name is only meaningful on a page that registered it. Writing the descriptor beside the
 * name makes the document self-describing: the consumer opening it can see exactly which palettes
 * it needs, show them, and register them -- rather than getting a refusal naming a palette they
 * have no way to reconstruct. The element's own palettes are left out on purpose, because they
 * are the same everywhere and copying eighteen descriptors into every saved file would make a
 * document larger than the look it records.
 * @param specs - The layers being written out.
 * @returns The descriptors, in the order the palettes were first named.
 */
function carriedPalettes(specs: readonly LayerSpec[]): readonly PaletteDescriptor[] {
    const named = new Set<string>();

    for (const spec of specs) {
        for (const binding of Object.values(spec.encode ?? {})) {
            if (binding !== undefined && "by" in binding && binding.palette !== undefined) {
                named.add(String(binding.palette));
            }
        }
    }

    const carried: PaletteDescriptor[] = [];

    for (const id of named) {
        if (PALETTE_DESCRIPTORS.some((descriptor) => descriptor.id === id)) {
            continue;
        }

        const descriptor = paletteDescriptor(id);

        if (descriptor !== undefined) {
            carried.push(descriptor);
        }
    }

    return carried;
}

/**
 * Whether an update would change the kind of a row part, which would leave the row with two parts
 * of one kind.
 * @param layer - The layer being updated.
 * @param patch - The update.
 * @returns True for a row part given another target.
 */
function retargetsRowPart(layer: Layer, patch: Partial<LayerSpec>): boolean {
    return layer.row !== undefined && patch.target !== undefined && patch.target !== layer.target;
}

/**
 * The refusal a call the session cannot make sense of gets.
 * @param message - What is wrong, in a sentence.
 * @param details - The offending values, for an editor that points at them.
 * @returns The error to reject with.
 */
function badCommand(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "style", details });
}

/**
 * An error's details as a coded fact's params: the plain values only.
 * @param details - The details.
 * @returns The params.
 */
function plainParams(details: unknown): Record<string, CodedFactParam> {
    const params: Record<string, CodedFactParam> = {};
    for (const [key, value] of Object.entries((details ?? {}) as Record<string, unknown>)) {
        const plain = (entry: unknown): boolean =>
            entry === null || ["string", "number", "boolean"].includes(typeof entry);
        if (plain(value) || (Array.isArray(value) && value.every(plain))) {
            params[key] = value as CodedFactParam;
        }
    }

    return params;
}

/**
 * The refusal a run-bound verb gets in a session that cannot look a run up.
 * @param verb - What was being attempted.
 * @returns The error to reject with.
 */
function noRuns(verb: string): GraphtyError {
    return new GraphtyError({
        code: "E_UNSUPPORTED",
        message:
            `This session cannot look a run up, so styles.${verb}() has nothing to bind to. ` +
            "Add a layer of your own with styles.add() instead.",
        source: "style",
        details: { op: `styles.${verb}`, reason: "no runs are reachable from this session" },
    });
}

/**
 * The run id behind any of the three ways a caller names a run.
 * @param ref - The run, its result, or its id.
 * @returns The run id.
 */
function runIdOf(ref: RunRef): RunId {
    // Anything but an object is passed through for the check to refuse, rather than thrown here:
    // a door that threw would put the exception on the window of a fire-and-forget caller.
    if (typeof ref !== "object" || (ref as unknown) === null) {
        return ref as RunId;
    }

    return "runId" in ref ? ref.runId : ref.id;
}

/**
 * Look a run up, or say which runs there are.
 * @param ref - The run, its result, or its id.
 * @param source - Where runs are looked up.
 * @returns The run.
 * @throws A `GraphtyError` with code `E_UNKNOWN_RUN`, carrying the nearest ids as candidates.
 */
function requireRun(ref: RunRef, source: EncodingSource): EncodingRun {
    const found = source.run(ref);

    if (found !== undefined) {
        return found;
    }

    const wanted = runIdOf(ref);
    const available = source.runIds();

    throw new GraphtyError({
        code: "E_UNKNOWN_RUN",
        message: `There is no run called "${wanted}" in this session.`,
        source: "style",
        details: { run: wanted, available, candidates: nearestNames(wanted, available) },
    });
}

/**
 * Whether a layer is the one an encoding of this run and this channel would take over.
 *
 * The test is what the layer PAINTS, not what it is called or who filed it: an encoding layer
 * whose rule for this channel reads a column under this run's results is the layer a second
 * `encode()` of the same pair is a second version of. A layer somebody wrote by hand is a
 * decision rather than a derivation, so it is left where it is and painted over.
 * @param layer - The layer to test.
 * @param runId - The run the new encoding binds to.
 * @param channel - The channel it paints.
 * @returns True when the layer is this run's derived layer for that channel.
 */
function isDerivedFor(layer: Layer, runId: RunId, channel: Channel): boolean {
    if (layer.kind !== "encoding") {
        return false;
    }

    const binding = layer.encode?.[channel];

    if (binding === undefined || !("by" in binding)) {
        return false;
    }

    const root = resultPath(runId);

    return binding.by === root || binding.by.startsWith(`${root}.`);
}

/**
 * The channels of a static style that paint one half of the graph.
 * @param set - The style, or undefined for the session's highlight colour.
 * @param half - Whether the layer paints nodes or edges.
 * @param color - The session's highlight colour, used when `set` is undefined.
 * @returns The channels for that half, or null when the style names none of them.
 */
function halfOfStyle(set: StaticStyle | undefined, half: SelectorTarget, color: string): StaticStyle | null {
    if (set === undefined) {
        return half === "node"
            ? { "node.color": color }
            : { "edge.color": color, "edge.width": DEFAULT_HIGHLIGHT.edgeWidth };
    }

    const mine: StaticStyle = {};

    for (const [name, value] of Object.entries(set)) {
        if (isChannel(name) && name.startsWith(`${half}.`) && value !== undefined) {
            mine[name] = value;
        }
    }

    return Object.keys(mine).length === 0 ? null : mine;
}

// ---------------------------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------------------------

/**
 * The patch that hides or shows one value in the bindings of a layer that read one field.
 *
 * Only the bindings reading the same field as `channel` are touched: a value of one field is not
 * the same value in another, so hiding community 2 must not hide the nodes whose degree is 2.
 * @param layer - The layer, or undefined when the stack holds none with that id.
 * @param channel - The channel whose field the value belongs to.
 * @param value - The value.
 * @param hidden - Whether to hide it.
 * @returns The patch: the layer's whole `encode` with the matching bindings' `hidden` lists
 *   updated, or nothing to change for a layer that is not there (the update then refuses it).
 * @throws `E_BAD_COMMAND` when the layer does not encode `channel` from the data.
 */
function hiddenValuePatch(
    layer: Layer | undefined,
    channel: Channel,
    value: string | number | boolean,
    hidden: boolean,
): Partial<LayerSpec> {
    if (layer === undefined) {
        return {};
    }

    const own = layer.encode?.[channel];
    if (own === undefined || !("by" in own)) {
        throw badCommand(`Layer ${layer.id} does not encode ${channel} from the data, so it has no value to hide.`, {
            id: layer.id,
            channel,
        });
    }

    const encode: Encoding = {};
    for (const [name, binding] of Object.entries(layer.encode ?? {}) as [Channel, Binding][]) {
        if (!("by" in binding) || binding.by !== own.by) {
            encode[name] = binding;
            continue;
        }

        // The same spelling the legend compares by: 0 and "0" are one value.
        const kept = (binding.hidden ?? []).filter((entry) => String(entry) !== String(value));
        const list = hidden ? [...kept, value] : kept;
        const { hidden: _previous, ...rest } = binding;
        encode[name] = list.length === 0 ? rest : { ...rest, hidden: list };
    }

    return { encode };
}

/**
 * The layer one id names in a state, for a verb that computes its patch from it.
 * @param state - The project state.
 * @param id - The layer.
 * @returns The layer, or undefined when the state holds none with that id.
 */
function layerIn(state: ProjectState, id: LayerId): Layer | undefined {
    return state.styles.find((entry) => entry.layer.id === id)?.layer;
}

/**
 * Build the style stack one session holds.
 * @param sources - What a selector compiles against, the element's own layers, the scales, the
 *     repaint seam, the dispatcher and the change hook.
 * @returns The stack, including the compiled form a renderer reads.
 * @throws A `GraphtyError` with code `E_INTERNAL` when one of the element's own layers is
 *     malformed, which is a bug in the element rather than in the call.
 */
export function createStylesApi(sources: StylesSources): SessionStylesApi {
    const engine = sources.engine ?? ENGINE_VERSIONS;
    const scales = sources.scales ?? createScaleRegistry();
    const dispatcher = sources.dispatcher ?? new Dispatcher({ definitions: STYLE_DEFINITIONS });

    let listCache: { readonly of: readonly CompiledLayer[]; readonly layers: readonly Layer[] } | null = null;
    let indexCache: {
        readonly of: readonly CompiledLayer[];
        readonly byId: ReadonlyMap<LayerId, CompiledLayer>;
    } | null = null;
    let edits = 0;
    /** What a highlight that names no style paints; see {@link StylesApi.setHighlightColor}. */
    let highlightColor: string = DEFAULT_HIGHLIGHT.color;
    /** How many `style:changed` events this stack has published, for {@link StyleCounts.revision}. */
    let styleRevision = 0;
    /** Edits written since the last pass, told once it has repainted them. */
    const announcements: Announcement[] = [];
    /** What the last pass changed and painted, which an undo, a redo or a rollback reports. */
    let lastPass: { reason: RepaintReason; layers: readonly LayerId[]; painted: RepaintReport | null } = {
        reason: "update",
        layers: [],
        painted: null,
    };

    /**
     * The stack as project state holds it now.
     * @returns The compiled layers, bottom first.
     */
    const current = (): readonly CompiledLayer[] => dispatcher.state.styles;

    /**
     * The layers of the stack by id, cached until the stack changes.
     * @returns The index.
     */
    const byId = (): ReadonlyMap<LayerId, CompiledLayer> => {
        const stack = current();
        if (indexCache?.of !== stack) {
            indexCache = { of: stack, byId: new Map(stack.map((entry) => [entry.layer.id, entry])) };
        }

        return indexCache.byId;
    };

    /**
     * The stack as data, cached until it changes.
     * @returns The layers, bottom first.
     */
    const listLayers = (): readonly Layer[] => {
        const stack = current();
        if (listCache?.of !== stack) {
            listCache = { of: stack, layers: Object.freeze(stack.map((entry) => entry.layer)) };
        }

        return listCache.layers;
    };

    /**
     * The bindings one layer was painted from, by the id its readers know it by.
     *
     * The translation between the two ways a layer is addressed, in the one place that holds
     * both: `legend()` and `explain()` have a `LayerId`, and the pass that prepared the bindings
     * is keyed by the compiled layer object so that a recycled id cannot answer for a layer that
     * has gone. A layer that is not in the stack, and a session with nothing prepared at all,
     * both read as no bindings -- which is the truthful answer rather than a degraded one.
     * @param layerId - The layer.
     * @returns Its prepared bindings, fixed values first and rules second.
     */
    const encodingOf: EncodingLookup = (layerId) => {
        const entry = byId().get(layerId);

        return entry === undefined || sources.encoding === undefined ? NO_BINDINGS : sources.encoding(entry);
    };

    /** What an explanation, an unbound report and a resolved rule are read from. */
    const explainSources: ExplainSources = {
        stack: () => paintedStack(current()),
        encoding: encodingOf,
        elements: sources.elements,
        nodeIndex: sources.nodeIndex ?? NO_INDEX,
        edgeIndex: sources.edgeIndex ?? NO_INDEX,
        ...(sources.paths === undefined ? {} : { paths: sources.paths }),
    };

    /**
     * The elements a scope resolves to, as dense indices.
     * @param scope - The scope.
     * @returns Its nodes and edges.
     */
    const elementsOf = (scope: Scope): AgreementElements => {
        const resolved = sources.resolveScope?.(scope) ?? emptyScope();

        return {
            nodes: indicesOf(resolved.nodes, (id) => explainSources.nodeIndex(id)),
            edges: indicesOf(resolved.edges, (id) => explainSources.edgeIndex(id)),
        };
    };

    /**
     * The layers some rows of the tree hold: both parts of a two-kind row, every layer in a folder.
     * @param ids - The rows.
     * @returns The layers, bottom first, once each.
     * @throws A `GraphtyError` with code `E_UNKNOWN_LAYER` when the tree holds no such row.
     */
    const layersUnder = (ids: readonly StyleRowId[]): Layer[] => {
        const stack = current();
        const rows = rowsOf(stack);
        const wanted = new Set<LayerId>();
        for (const id of ids) {
            const found = findRow(rows, id);
            if (found === undefined) {
                throw unknownRow(id, rows);
            }

            const keys = found.row.kind === "folder" ? layerIdsOf(found.row.children ?? []) : [found.row.id];
            for (const key of keys) {
                for (const part of rowParts(stack, key)) {
                    wanted.add(part.layer.id);
                }
            }
        }

        return stack.filter((entry) => wanted.has(entry.layer.id)).map((entry) => entry.layer);
    };

    /**
     * The stack as it paints, cut beneath one row of the tree: every layer under it, the
     * element's own layers there included.
     * @param id - The row.
     * @returns The layers beneath it, bottom first.
     * @throws A `GraphtyError` with code `E_UNKNOWN_LAYER` when the tree holds no such row.
     */
    const stackBelow = (id: StyleRowId): readonly CompiledLayer[] => {
        const rows = rowsOf(current());
        if (findRow(rows, id) === undefined) {
            throw unknownRow(id, rows);
        }

        // The tree order is the paint order, so the rows met before this one are the consumer
        // layers beneath it, and they are a prefix of the consumer layers in the stack.
        const beneath = new Set<LayerId>();
        const walk = (list: Rows): boolean =>
            list.some((row) => {
                if (row.id === id) {
                    return true;
                }

                if (row.kind === "layer") {
                    beneath.add(row.id);
                    return false;
                }

                return walk(row.children ?? []);
            });
        walk(rows);

        const painted = paintedStack(current());
        const cut = painted.findIndex((entry) => !entry.layer.locked && !beneath.has(rowKeyOf(entry)));

        return cut === -1 ? painted : painted.slice(0, cut);
    };

    /** What a legend is read from. */
    const legendSources: LegendSources = {
        layers: () => paintedStack(current()).map((entry) => entry.layer),
        encoding: encodingOf,
        scales,
        ...(sources.field === undefined ? {} : { field: sources.field }),
        ...(sources.groupRanks === undefined ? {} : { groupRanks: sources.groupRanks }),
        painted: (id) => api.counts(id).painted,
        // Only a `{match:"has"}` layer below can be answered: its elements are the ones a column
        // lists, and each is put to the compiled test of the layer above. Every other shape would
        // need a walk over the whole graph, and a legend is read on every style change.
        covers: (above, below) => {
            if (below.selector.match !== "has") {
                return false;
            }

            const rows = sources.elements.measured?.(below.selector.path, below.target);
            const test = byId().get(above.id)?.selector.test;

            if (rows === undefined || rows.length === 0 || test === undefined) {
                return false;
            }

            for (let at = 0; at < rows.length; at++) {
                if (test !== null && !test(rows[at])) {
                    return false;
                }
            }

            return true;
        },
    };

    /**
     * Check one layer specification against this session.
     * @param spec - The specification.
     * @param id - The id it would carry.
     * @param admit - Whether a scope selector is admitted as at a write door (false for a
     *     document's layer, which may name a set of the session it was saved in).
     * @returns The verdict and, when it is sound, the compiled layer.
     */
    /** The defaults `setDefaultPalettes` chose; empty until it is called. */
    let defaultPalettes: DefaultPalettes = {};
    /**
     * The bindings, as "layer id / channel", whose palette was filled in from a default rather
     * than named by the author. Only ever read against the live stack, so an entry for a layer
     * that is gone answers for nothing.
     */
    const defaulted = new Set<string>();

    /**
     * The palette kind a colour binding's default comes from, or null when it reads no palette.
     * @param binding - The binding.
     * @returns The kind.
     */
    const paletteKindOf = (binding: Binding): keyof DefaultPalettes | null => {
        if (
            !("by" in binding) ||
            binding.stops !== undefined ||
            binding.map !== undefined ||
            binding.scale === "passthrough"
        ) {
            return null;
        }

        if (scales.describe(binding.scale ?? "linear")?.domainKind === "categorical") {
            return "categorical";
        }

        return binding.midpoint === undefined ? "sequential" : "diverging";
    };

    /**
     * The colour bindings of a specification that name no palette, and the default each takes.
     * @param spec - The specification.
     * @returns Each such channel, with its binding and the default palette's id (undefined when
     *   no default is set for its kind).
     */
    const unnamedPalettes = (spec: LayerSpec): { channel: string; binding: Binding; kind: keyof DefaultPalettes }[] => {
        const found: { channel: string; binding: Binding; kind: keyof DefaultPalettes }[] = [];
        for (const [channel, binding] of Object.entries(spec.encode ?? {})) {
            if (binding === undefined || channelDescriptor(channel)?.accepts !== "color") {
                continue;
            }

            const kind = paletteKindOf(binding);
            if (kind !== null && "by" in binding && binding.palette === undefined) {
                found.push({ channel, binding, kind });
            }
        }

        return found;
    };

    /**
     * Write the default palettes into a specification's colour bindings that name none.
     * @param spec - The specification.
     * @param id - The layer it is written to, so the default it took can be found again.
     * @returns The specification with every default it takes named.
     */
    const withDefaultPalettes = (spec: LayerSpec, id: LayerId): LayerSpec => {
        let encode: Record<string, Binding> | undefined;
        for (const { channel, binding, kind } of unnamedPalettes(spec)) {
            const palette = defaultPalettes[kind];
            if (palette !== undefined) {
                encode ??= { ...(spec.encode as Record<string, Binding>) };
                encode[channel] = { ...binding, palette };
                defaulted.add(`${id}/${channel}`);
            }
        }

        return encode === undefined ? spec : { ...spec, encode };
    };

    const check = (given: LayerSpec, id: LayerId, admit = true): LayerCheck => {
        const options: LayerCheckOptions = {
            id,
            elements: sources.elements,
            scales,
            ...(sources.paths === undefined ? {} : { paths: sources.paths }),
            // A document's layer may name a set of the session it was saved in: kept, and reported
            // detached, rather than refused.
            ...(sources.admitScope === undefined || !admit ? {} : { admitScope: sources.admitScope }),
        };

        return checkLayerSpec(withDefaultPalettes(given, id), options);
    };

    /**
     * A minter for one edit, which remembers what it has already handed out.
     *
     * An edit that adds several layers at once -- a route that paints nodes and edges, a document
     * with three layers of the same name -- mints several ids before any of them is in the stack,
     * so the ids it has just minted have to count as taken or the second would collide with the
     * first and quietly replace it.
     * @returns A function that mints one free id per call.
     */
    const minter = (): ((name: unknown) => LayerId) => {
        const taken = new Set(byId().keys());

        return (name: unknown): LayerId => {
            const id = mintLayerId(typeof name === "string" ? name : "", taken);
            taken.add(id);

            return id;
        };
    };

    /**
     * The id a new layer gets, which is free of every id the stack already holds.
     * @param name - What the layer is called.
     * @returns The minted id.
     */
    const mint = (name: unknown): LayerId => minter()(name);

    /**
     * The layer at an id, or the refusal for naming one that is not there.
     * @param id - The id.
     * @returns The compiled layer.
     * @throws A `GraphtyError` with code `E_UNKNOWN_LAYER` when the stack holds none with that id.
     */
    const require = (id: LayerId): CompiledLayer => {
        const found = byId().get(id);

        if (found === undefined) {
            throw unknownLayer(
                id,
                current().map((entry) => entry.layer.id),
            );
        }

        return found;
    };

    /**
     * Where a layer sits in the stack now.
     * @param id - The layer id.
     * @returns The index, bottom first.
     */
    const positionOf = (id: LayerId): number => current().findIndex((entry) => entry.layer.id === id);

    /**
     * What a run asks of the session holding it.
     * @param label - What to call the edit.
     * @returns The surroundings.
     */
    const surroundingsFor = (label: string): RunSurroundings => ({
        label: () => label,
        // A style edit is not one of the runs a consumer browses: it holds no result to rank and
        // nothing binds a layer to it, so it never takes a place in the runs list.
        queuePosition: () => null,
        // Never stale: the stack is the session's own state, so an edit's answer cannot go on
        // describing a stack that has changed underneath it.
        stale: () => null,
        resolveScope: () => sources.resolveScope?.(WHOLE_GRAPH) ?? emptyScope(),
        // No queue: the edit is written when it is dispatched, and the repaint follows on the
        // derivation lane, which never cancels or reorders it.
        enqueue: (body: RunBody): RunTicket => {
            void body(IMMEDIATE);

            return NO_TICKET;
        },
    });

    /**
     * Make one edit: dispatch its command, which writes the new stack at once, and hand back a
     * run that settles once the pass repainting it has run.
     *
     * A signal already aborted writes nothing. A cancel or an abort after the call does NOT take
     * the edit back: it has been recorded, and may have merged into a larger step, so undo is the
     * way back. The run then resolves with the edit applied.
     * @param verb - Which door the edit came through, which is what the run is called.
     * @param label - What to call it.
     * @param command - The command, or a function from state to one for a door that resolves late.
     * @param options - A signal, and a progress handler.
     * @returns The run.
     */
    const edit = <T>(
        verb: StyleVerb,
        label: string,
        command: StyleCommand | ((state: ProjectState) => StyleCommand) | StyleBatch,
        options: RunOptions,
    ): Run<T> => {
        edits++;
        const params: Readonly<Record<string, unknown>> = Object.freeze({ edit: edits, verb });
        // Only a signal that is already aborted is handed over: it refuses the edit before anything
        // is written. One aborted later has nothing left to stop. Disposal cancels what is pending.
        const stops = [options.signal?.aborted === true ? options.signal : undefined, sources.disposed].filter(
            (entry) => entry !== undefined,
        );
        const signal = stops.length > 1 ? AbortSignal.any(stops) : stops[0];
        const definition: RunDefinition<T> = {
            algorithm: `styles.${verb}`,
            caveats: EDIT_CAVEATS,
            engine,
            exact: null,
            fields: NO_FIELDS,
            id: deriveRunId({
                algorithm: `styles.${verb}`,
                exact: null,
                params,
                sample: null,
                scope: WHOLE_GRAPH,
                seed: null,
            }),
            params,
            sample: null,
            seed: null,
            // "fact" rather than a per-element shape: an edit publishes what changed about the
            // stack, not a column of values to rank or bin.
            shape: "fact",
            style: false,
            timeBoxMs: null,
            // A cancel settles the run with the edit applied rather than rejecting it.
            publishOnCancel: true,
            execute: async () => {
                if (options.dryRun === true) {
                    throw new GraphtyError({
                        code: "E_UNSUPPORTED",
                        message:
                            "A style edit cannot be a dry run. Ask whether a layer is valid with " +
                            "styles.validate(spec), which performs nothing, and how much it would match " +
                            "with session.plan().",
                        source: "style",
                        details: { op: `styles.${verb}` },
                    });
                }

                if ("batch" in command) {
                    // Several layers written as one step: a transaction, joining the caller's own
                    // when there is one, since the dispatcher routes it there.
                    const members = command.batch();
                    const outcomes = await dispatcher.transaction(label, async (scope) => {
                        const each: EditOutcome<unknown>[] = [];
                        for (const member of members) {
                            each.push((await scope.dispatch(member)) as EditOutcome<unknown>);
                        }

                        return each;
                    });
                    await Promise.all(outcomes.map((outcome) => outcome.painted));

                    return { result: outcomes.map((outcome) => outcome.result) as T };
                }

                const outcome = (await dispatcher.dispatch(command)) as EditOutcome<T>;
                await outcome.painted;

                return { result: outcome.result };
            },
            ...(signal === undefined ? {} : { signal }),
            ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
        };

        const run = new ManagedRun<T>(definition, surroundingsFor(label));
        run.start();

        return run;
    };

    /**
     * Where a new layer goes, read from the neighbour it was told to sit next to.
     * @param at - The position, or undefined for the top of the stack.
     * @returns The index it would be inserted at, bottom first.
     * @throws A `GraphtyError` with code `E_BAD_COMMAND` when both neighbours were named, and
     *     `E_UNKNOWN_LAYER` when the named one is not in the stack.
     */
    const insertionIndex = (at: LayerPosition | undefined): number => {
        const { length } = current();
        if (at === undefined) {
            return length;
        }

        if (at.above !== undefined && at.below !== undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "A layer sits in one place: name either the layer to sit above or the layer to sit below.",
                source: "style",
                details: { above: at.above, below: at.below },
            });
        }

        if (at.above !== undefined) {
            require(at.above);
            const parts = rowParts(current(), at.above);

            return positionOf(parts[parts.length - 1].layer.id) + 1;
        }

        if (at.below !== undefined) {
            require(at.below);

            return positionOf(rowParts(current(), at.below)[0].layer.id);
        }

        return length;
    };

    /**
     * The runs this session can look up, or the refusal a session that cannot look one up gives.
     * @param verb - What was being attempted, for the refusal.
     * @returns Where a run is looked up.
     * @throws A `GraphtyError` with code `E_UNSUPPORTED` when no lookup was handed in.
     */
    /**
     * The column a column encoding names, and its declaration.
     * @param spec - The column encoding.
     * @returns The column's descriptor and declaration.
     * @throws A `GraphtyError` with `E_UNSUPPORTED` in a session with no columns, and
     *     `E_UNKNOWN_ATTRIBUTE` for a column no record carries.
     */
    const columnOf = (
        spec: ColumnEncodingSpec,
    ): { column: AttributeDescriptor; declaration: MeasurementDeclaration | undefined } => {
        const { columns } = sources;
        if (columns === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session holds no data columns to encode.",
                source: "style",
                details: { op: "styles.encode" },
            });
        }

        const column = resolveColumn(columns.attributes(), spec.column);
        return { column, declaration: columns.declaration(column) };
    };

    /**
     * The layer a column encoding adds, with its defaults written in.
     * @param spec - The column encoding.
     * @returns The layer.
     */
    const planColumn = (spec: ColumnEncodingSpec): LayerSpec => {
        const { column, declaration } = columnOf(spec);
        return planColumnEncoding(spec, column, declaration, scales);
    };

    const requireRuns = (verb: string): EncodingSource => {
        const { runs } = sources;

        if (runs === undefined) {
            throw noRuns(verb);
        }

        return runs;
    };

    /**
     * The plan for putting one new layer into the stack.
     * @param spec - The layer as it would be added.
     * @param index - Where it goes, bottom first.
     * @param id - The id it will carry for the rest of its life.
     * @returns The plan.
     * @throws A `GraphtyError` when the specification is refused.
     */
    const planInsert = (spec: LayerSpec, index: number, id: LayerId): EditPlan<Layer> => {
        const checked = check(spec, id);

        if (checked.layer === null) {
            throw refusedSpec(spec.name, checked.result);
        }

        const next = [...current()];
        next.splice(index, 0, checked.layer);

        return {
            stack: next,
            result: checked.layer.layer,
            layers: [checked.layer.layer.id],
            unresolvedPaths: checked.result.unresolvedPaths,
            warnings: checked.result.warnings,
            reason: "add",
        };
    };

    /**
     * The plan for changing one layer, keeping its id and its place in the stack.
     * @param id - The layer to change.
     * @param patch - What to change about it.
     * @param base - The stack to change, when an edit changes several layers in one step.
     * @returns The plan.
     * @throws A `GraphtyError` with code `E_PROTECTED` for an element-owned layer, and whatever
     *     the check refuses the merged specification with.
     */
    const planUpdate = (
        id: LayerId,
        patch: Partial<LayerSpec>,
        base: readonly CompiledLayer[] = current(),
    ): EditPlan<Layer> => {
        const existing = base.find((entry) => entry.layer.id === id) ?? require(id);

        if (existing.layer.locked) {
            throw protectedLayer(existing.layer, "changed");
        }

        const key = rowKeyOf(existing);
        if (lockedByReader(rowsOf(current()), key)) {
            const found = findRow(rowsOf(current()), key);
            const holder = [...(found?.ancestors ?? []), ...(found === undefined ? [] : [found.row])].find(
                (row) => row.locked,
            );
            throw readerLocked(existing.layer, holder?.id ?? key);
        }

        const merged: LayerSpec = { ...specOf(existing.layer), ...patch };

        if (isElementSource(sourceOf(merged))) {
            throw protectedLayer(existing.layer, "given an element source");
        }

        const checked = check(merged, id);

        if (checked.layer === null) {
            throw refusedSpec(merged.name, checked.result);
        }

        const next = [...base];
        next[base.indexOf(existing)] = checked.layer;

        return {
            stack: next,
            result: checked.layer.layer,
            layers: [id],
            unresolvedPaths: checked.result.unresolvedPaths,
            warnings: checked.result.warnings,
            reason: "update",
        };
    };

    /**
     * The plan for taking one layer out.
     * @param id - The layer.
     * @returns The plan.
     */
    const planRemove = (id: LayerId): EditPlan<void> => {
        const existing = require(id);

        if (existing.layer.locked) {
            throw protectedLayer(existing.layer, "removed");
        }

        const parts = rowParts(current(), id);

        return {
            stack: current().filter((entry) => !parts.includes(entry)),
            result: undefined,
            layers: parts.map((entry) => entry.layer.id),
            unresolvedPaths: NO_PATHS,
            reason: "remove",
        };
    };

    /**
     * The plan for moving one layer.
     * @param id - The layer.
     * @param before - The layer to sit below, or null for the top.
     * @returns The plan.
     */
    const planMove = (id: LayerId, before: LayerId | null): EditPlan<void> => {
        const existing = require(id);

        if (existing.layer.locked) {
            throw protectedLayer(existing.layer, "moved");
        }

        if (before === id) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "A layer cannot be moved below itself.",
                source: "style",
                target: { kind: "layer", id },
                details: { id },
            });
        }

        const parts = rowParts(current(), id);
        const without = current().filter((entry) => !parts.includes(entry));
        let to = without.length;

        if (before !== null) {
            require(before);
            // Below a row means below its bottom part, so the move never splits a row.
            const below = rowParts(current(), before)[0];
            to = without.indexOf(below);
            if (to === -1) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: "A row cannot be moved below one of its own parts.",
                    source: "style",
                    target: { kind: "layer", id },
                    details: { id, before },
                });
            }
        }

        const next = [...without];
        next.splice(to, 0, ...parts);

        return {
            stack: next,
            result: undefined,
            layers: parts.map((entry) => entry.layer.id),
            unresolvedPaths: NO_PATHS,
            reason: "move",
            moved: rowKeyOf(existing),
        };
    };

    /**
     * The plan for a sweep: the layers it named, except any the element owns.
     * @param ids - The layers the sweep matched when it was dispatched.
     * @returns The plan.
     */
    const planSweep = (ids: readonly LayerId[]): EditPlan<readonly LayerId[]> => {
        const removing = new Set(
            current()
                .filter((entry) => !entry.layer.locked && ids.includes(entry.layer.id))
                .map((entry) => entry.layer.id),
        );
        const removed = current()
            .filter((entry) => removing.has(entry.layer.id))
            .map((entry) => entry.layer.id);

        return {
            stack: current().filter((entry) => !removing.has(entry.layer.id)),
            result: Object.freeze(removed),
            layers: removed,
            unresolvedPaths: NO_PATHS,
            reason: "sweep",
        };
    };

    /**
     * The plan for an encoding, which replaces this run's derived layer for the channel in place.
     * @param spec - The encoding, naming its run by id.
     * @param beneath - Place a new layer beneath the authored layers driving its channel.
     * @returns The plan.
     */
    const planEncode = (spec: StyleEncodeCommand["spec"], beneath = false): EditPlan<Layer> => {
        const planned = planEncoding(spec, requireRuns("encode"));
        const source = sourceOf(planned);
        const stack = current();
        const previous =
            source.by === "run"
                ? stack.find((entry) => isDerivedFor(entry.layer, source.runId, spec.channel))
                : undefined;

        if (previous === undefined) {
            const at = beneath
                ? beneathAuthored(
                      stack.map((entry) => entry.layer),
                      [spec.channel],
                  )
                : stack.length;

            return planInsert(planned, at, mint(planned.name));
        }

        // The one place a locked layer is written rather than refused, and it is what the
        // replacement rule is for: the layer being taken over is the one the element derived from
        // this very run, and what replaces it says so in its source. A layer somebody wrote by
        // hand is never this layer -- `isDerivedFor` asks what the layer paints, not what it is
        // called.
        const { id } = previous.layer;
        const checked = check(planned, id);

        if (checked.layer === null) {
            throw refusedSpec(planned.name, checked.result);
        }

        const next = [...stack];
        next[positionOf(id)] = checked.layer;

        return {
            stack: next,
            result: checked.layer.layer,
            layers: [id],
            unresolvedPaths: checked.result.unresolvedPaths,
            warnings: checked.result.warnings,
            reason: "update",
        };
    };

    /**
     * The plan for a highlight, which takes every other highlight out first.
     * @param spec - The highlight, naming its run by id.
     * @param beneath - Place it beneath the authored layers driving a colour it paints.
     * @returns The plan.
     */
    const planHighlight = (
        spec: Extract<StylePatchCommand, { action: "highlight" }>["spec"],
        beneath = false,
    ): EditPlan<readonly Layer[]> => {
        const run = requireRun(spec.run, requireRuns("highlight"));

        if (!isHighlightShape(run.shape)) {
            throw badCommand(
                `A "${run.shape}" result measures every element rather than choosing some, so it is painted ` +
                    "with encode() rather than highlighted.",
                { run: run.id, shape: run.shape },
            );
        }

        const field = spec.field ?? resultShapeContract(run.shape).primaryField ?? "";
        const chosen = run.fields.filter((entry) => entry.name === field);

        if (!chosen.some((entry) => entry.kind === "node" || entry.kind === "edge")) {
            const published = run.fields.map((entry) => entry.name);

            throw new GraphtyError({
                code: "E_UNKNOWN_ATTRIBUTE",
                message: `The run "${run.id}" publishes no field called "${field}" on its nodes or its edges.`,
                source: "style",
                details: {
                    run: run.id,
                    field,
                    available: published,
                    candidates: nearestNames(field, published),
                },
            });
        }

        // One entry per half the run chose AND the style has something to say about, so a route
        // styled with an edge colour alone paints the route's edges and leaves its nodes to the
        // layers underneath.
        const painting = new Map<SelectorTarget, StaticStyle>();

        for (const half of HALVES) {
            const set = chosen.some((entry) => entry.kind === half)
                ? halfOfStyle(spec.set, half, highlightColor)
                : null;

            if (set !== null) {
                painting.set(half, set);
            }
        }

        if (painting.size === 0) {
            throw badCommand(
                `The style names no channel that paints the ${chosen.map((entry) => entry.kind).join(" or ")} ` +
                    `the run "${run.id}" chose, so the highlight would paint nothing.`,
                { run: run.id, field, set: spec.set },
            );
        }

        const path = resultPath(run.id, field);
        const called = spec.name ?? englishRunLabel(run);
        const id = minter();
        const added: CompiledLayer[] = [];
        const unresolved = new Set<Path>();
        // Both halves make one row, as `addRow` makes it, both carrying the node part's id as
        // their row. The node part stays first, as `highlight()` has always returned it.
        const ids = [...painting.keys()].map(() => id(called));
        const row = painting.size > 1 ? ids[0] : undefined;

        for (const [index, [half, set]] of [...painting].entries()) {
            const layerSpec: LayerSpec = {
                name: called,
                target: half,
                kind: "highlight",
                // The membership column carries FALSE for the elements the run looked at and did
                // not choose, so a presence test would paint the whole neighbourhood of a route in
                // the colour of the route. The value is what says "chosen", so the value is what
                // is asked about.
                selector: { match: "expression", where: `${quotePath(path)} == \`true\`` },
                set,
                source: { by: "run", runId: run.id, algorithm: run.algorithm, params: run.params },
                ...(row === undefined ? {} : { row }),
            };
            const checked = check(layerSpec, ids[index]);

            if (checked.layer === null) {
                throw refusedSpec(layerSpec.name, checked.result);
            }

            for (const unanswered of checked.result.unresolvedPaths) {
                unresolved.add(unanswered);
            }

            added.push(checked.layer);
        }

        const stack = current();
        const removing = new Set(
            stack
                .filter((entry) => !entry.layer.locked && entry.layer.kind === "highlight")
                .map((entry) => entry.layer.id),
        );

        const kept = stack.filter((entry) => !removing.has(entry.layer.id));
        const at = beneath
            ? beneathAuthored(
                  kept.map((entry) => entry.layer),
                  added.flatMap((entry) => Object.keys(entry.layer.set ?? {}) as Channel[]),
              )
            : kept.length;

        return {
            stack: [...kept.slice(0, at), ...added, ...kept.slice(at)],
            result: Object.freeze(added.map((entry) => entry.layer)),
            layers: [...removing, ...added.map((entry) => entry.layer.id)],
            unresolvedPaths: Object.freeze([...unresolved]),
            reason: "add",
        };
    };

    /**
     * The plan for applying a style document: every layer lands, bound or disabled, or none does.
     * @param document - The document.
     * @param templateId - What to record as the template.
     * @returns The plan.
     */
    const planTemplate = (document: StyleDocument, templateId: string | undefined): EditPlan<TemplateReport> => {
        checkDocument(document);

        const id = minter();
        const imported: ImportedLayer[] = [];
        const unresolved = new Set<Path>();
        const warnings: CodedFact<GraphtyWarningCode>[] = [];

        for (const spec of document.layers) {
            const authored = stamped(spec, templateId);

            if (isElementSource(sourceOf(authored))) {
                throw new GraphtyError({
                    code: "E_PROTECTED",
                    message:
                        `"${authored.name}" claims to be one of the element's own layers, and only the ` +
                        "element mints those. A document carries the layers somebody chose.",
                    source: "style",
                    details: { name: authored.name, source: authored.source },
                });
            }

            const checked = check(authored, id(authored.name), false);

            if (checked.layer === null) {
                throw refusedSpec(authored.name, checked.result);
            }

            for (const unanswered of checked.result.unresolvedPaths) {
                unresolved.add(unanswered);
            }

            warnings.push(...checked.result.warnings);

            imported.push({ spec: authored, compiled: checked.layer });
        }

        // Asked of the imported layers ALONE, so a layer that was already in the stack and has
        // been waiting for its run is not reported as this import's problem.
        const unbound = unboundLayers({
            ...explainSources,
            stack: () => imported.map((entry) => entry.compiled),
        });
        const disabled = new Set(unbound.map((entry) => entry.layerId));
        const final = imported.map((entry): CompiledLayer => {
            if (!disabled.has(entry.compiled.layer.id)) {
                return entry.compiled;
            }

            const off = check({ ...entry.spec, enabled: false }, entry.compiled.layer.id, false);

            if (off.layer === null) {
                throw refusedSpec(entry.spec.name, off.result);
            }

            return off.layer;
        });

        const written = document.tree;
        let rows: Rows | undefined;
        if (written !== undefined) {
            const read = readDocumentRows(
                written,
                (index) => {
                    const entry = final[index];
                    return entry === undefined ? undefined : rowKeyOf(entry);
                },
                folderMinter(rowsOf(current())),
            );
            if (read === null) {
                throw badCommand("The style document's tree names a layer it does not hold, or one twice.", {
                    layers: document.layers.length,
                });
            }

            rows = Object.freeze([...rowsOf(current()), ...read]);
        }

        return {
            ...(rows === undefined ? {} : { rows }),
            stack: [...current(), ...final],
            result: Object.freeze({
                applied: Object.freeze(
                    final.filter((entry) => !disabled.has(entry.layer.id)).map((entry) => entry.layer.id),
                ),
                unbound,
            }),
            layers: final.map((entry) => entry.layer.id),
            unresolvedPaths: Object.freeze([...unresolved]),
            warnings: Object.freeze(warnings),
            reason: "add",
        };
    };

    /**
     * The plan for adding a row: one layer per kind it paints, the edge part right under the node
     * part, both carrying the node part's id as their row.
     * @param spec - The row.
     * @param at - Which neighbour to sit next to.
     * @param into - A stack to add it to at an index, when an edit adds several rows in one step.
     * @param into.stack - That stack.
     * @param into.index - Where in it.
     * @returns The plan.
     */
    const planAddRow = (
        spec: RowSpec,
        at: LayerPosition | undefined,
        into?: { readonly stack: readonly CompiledLayer[]; readonly index: number },
    ): EditPlan<RowParts> => {
        const kinds: SelectorTarget[] = spec.target === "both" ? ["edge", "node"] : [spec.target];
        assertRouted(spec.set, kinds, "set");
        assertRouted(spec.encode, kinds, "encode");

        const id = minter();
        const { target: _target, set: _set, encode: _encode, ...shared } = spec;
        const ids = kinds.map(() => id(spec.name));
        // The row is known by its node part's id, the last minted.
        const row = spec.target === "both" ? ids[ids.length - 1] : undefined;
        const added: CompiledLayer[] = [];
        const unresolved = new Set<Path>();
        const warnings: CodedFact<GraphtyWarningCode>[] = [];

        kinds.forEach((kind, index) => {
            const layerSpec: LayerSpec = {
                ...shared,
                target: kind,
                ...partPatch({ target: kind }, { set: spec.set, encode: spec.encode }),
                ...(row === undefined ? {} : { row }),
            };
            const checked = check(layerSpec, ids[index]);
            if (checked.layer === null) {
                throw refusedSpec(spec.name, checked.result);
            }

            checked.result.unresolvedPaths.forEach((path) => unresolved.add(path));
            warnings.push(...checked.result.warnings);
            added.push(checked.layer);
        });

        const next = [...(into?.stack ?? current())];
        next.splice(into?.index ?? insertionIndex(at), 0, ...added);

        return {
            stack: next,
            result: rowOf(added) as RowParts,
            layers: added.map((entry) => entry.layer.id),
            unresolvedPaths: Object.freeze([...unresolved]),
            warnings: Object.freeze(warnings),
            reason: "add",
        };
    };

    /**
     * Whether a run's layer goes beneath the reader's: only when it asked to, and the project's
     * `runPlacement` is not `"top"` (on top it lands above the unpinned rows, as a call does).
     * @param asked - The command's `beneathAuthored`.
     * @returns True to place it beneath.
     */
    const runBeneath = (asked: boolean | undefined): boolean | undefined =>
        asked === true && dispatcher.services.config?.().runPlacement === "top" ? false : asked;

    /**
     * The plan that adds back whichever starting rows the stack lacks, each pinned where it
     * belongs: Everything at the very bottom of the reader's rows, Selected just below Hovered.
     * @returns The plan; the stack unchanged when every starting row is there.
     */
    const planStartingRows = (): EditPlan<readonly RowParts[]> => {
        const look = dispatcher.services.config?.().selectionStyle ?? DEFAULT_SELECTION_STYLE;
        let stack = current();
        let rows = rowsOf(stack);
        const added: RowParts[] = [];
        const layers: LayerId[] = [];
        const pins: [LayerId, "top" | "bottom"][] = [];

        for (const starting of startingRows(look)) {
            if (stack.some((entry) => startingRowOf(entry) === starting.templateId)) {
                continue;
            }

            const firstOwn = stack.findIndex((entry) => !entry.layer.locked);
            const hovered = stack.findIndex((entry) => startingRowOf(entry) === "graphty:starting-hovered");
            // Everything at the very bottom of the reader's rows; Selected just below Hovered.
            const below = starting.pin === "bottom" ? firstOwn : hovered;
            const index = below === -1 ? stack.length : below;
            const plan = planAddRow(starting.spec, undefined, { stack, index });
            ({ stack } = plan);
            rows = reconcile(rows, stack);
            pins.push([plan.result.id, starting.pin]);
            added.push(plan.result);
            layers.push(...plan.layers);
        }

        // Pinned once every row is placed: a pin taken earlier would band a row before the next
        // one is placed by its stack neighbors, and Hovered would land below Selected.
        for (const [id, pin] of pins) {
            rows = mapRow(rows, id, (row) => ({ ...row, pin }));
        }

        return {
            stack,
            rows: normalize(rows),
            result: Object.freeze(added),
            layers,
            unresolvedPaths: NO_PATHS,
            reason: "add",
        };
    };

    /**
     * The stack with a row painting other kinds: a part for each kind it lacks, added empty with the
     * row's name, rule and eye, and its parts of kinds no longer wanted dropped. The row keeps its
     * id, which stays a layer's id: the node part's when it paints nodes, else its one part's. Its
     * rule is carried across kinds ({@link retargetSelector}). The parts stay together where the
     * row was, the edge part under the node part, every one carrying the row's key.
     * @param key - The row's key.
     * @param target - What it paints from now on.
     * @param changed - Collects the layers added, dropped or rewritten.
     * @returns The stack.
     * @throws Whatever {@link planUpdate} refuses a part with: a locked row is not retargeted.
     */
    const retargetRow = (key: LayerId, target: RowTarget, changed: LayerId[]): readonly CompiledLayer[] => {
        const stack = current();
        const parts = stack.filter((entry) => rowKeyOf(entry) === key);
        const wanted: SelectorTarget[] = target === "both" ? ["edge", "node"] : [target];
        if (wanted.length === parts.length && parts.every((entry) => wanted.includes(entry.layer.target))) {
            return stack;
        }

        // The same refusals a write to each part gets: locked by the element or by the reader.
        for (const part of parts) {
            planUpdate(part.layer.id, {}, stack);
        }

        const id = minter();
        const keyPart = parts.find((entry) => entry.layer.id === key) ?? parts[0];
        const shared = specOf(keyPart.layer);
        const selector = retargetSelector(shared.selector, keyPart.layer.target, wanted, sources.paths);
        const keyKind: SelectorTarget = wanted.includes("node") ? "node" : wanted[0];
        const placed = wanted.map((kind): CompiledLayer => {
            const kept = parts.find((entry) => entry.layer.target === kind);
            const own = kept !== undefined && kept.layer.id !== key ? kept.layer.id : undefined;
            const layerId = kind === keyKind ? key : (own ?? id(shared.name));
            if (kept?.layer.id === layerId && kept.layer.row === key && kept.layer.selector === selector) {
                return kept;
            }

            // Values set for a kind the row no longer paints went with its part.
            const spec: LayerSpec =
                kept === undefined
                    ? { ...shared, target: kind, selector, set: undefined, encode: undefined, row: key }
                    : { ...specOf(kept.layer), selector, row: key };

            const checked = check(spec, layerId);
            if (checked.layer === null) {
                throw refusedSpec(spec.name, checked.result);
            }

            return checked.layer;
        });
        changed.push(...new Set([...parts, ...placed].map((entry) => entry.layer.id)));

        const at = stack.indexOf(parts[0]);
        const next = stack.filter((entry) => rowKeyOf(entry) !== key);
        next.splice(at, 0, ...placed);

        return next;
    };

    /**
     * The plan for one write to every part of a row, each part taking the keys its kind has.
     * @param id - The row or any part.
     * @param write - The write.
     * @returns The plan.
     */
    const planWriteRow = (id: LayerId, write: RowWrite): EditPlan<RowParts> => {
        const key = rowKeyOf(require(id));
        const changed: LayerId[] = [];
        let stack: readonly CompiledLayer[] =
            write.target === undefined ? current() : retargetRow(key, write.target, changed);
        const parts = stack.filter((entry) => rowKeyOf(entry) === key);
        assertRouted(
            write.set,
            parts.map((entry) => entry.layer.target),
            "set",
        );
        assertRouted(
            write.encode,
            parts.map((entry) => entry.layer.target),
            "encode",
        );

        const unresolved = new Set<Path>();
        const warnings: CodedFact<GraphtyWarningCode>[] = [];
        for (const part of parts) {
            const patch = partPatch(part.layer, write);
            if (patch === null) {
                continue;
            }

            const plan = planUpdate(part.layer.id, patch, stack);
            ({ stack } = plan);
            plan.unresolvedPaths.forEach((path) => unresolved.add(path));
            warnings.push(...(plan.warnings ?? NO_WARNINGS));
            changed.push(part.layer.id);
        }

        return {
            stack,
            result: rowOf(stack.filter((entry) => rowKeyOf(entry) === key)) as RowParts,
            layers: changed,
            unresolvedPaths: Object.freeze([...unresolved]),
            warnings: Object.freeze(warnings),
            reason: "update",
        };
    };

    /**
     * A minter of folder ids free of every folder id in some rows, which remembers what it handed out.
     * @param rows - The rows whose folder ids are taken.
     * @returns A function that mints one free folder id per call.
     */
    const folderMinter = (rows: Rows): ((name: string) => StyleRowId) => {
        const taken = new Set(folderIdsOf(rows).map((id) => id.slice(FOLDER.length)));
        return (name: string): StyleRowId => {
            const id = mintLayerId(name, taken);
            taken.add(id);
            return `${FOLDER}${id}`;
        };
    };

    /**
     * A layer row's name: its layer's.
     * @param stack - The stack.
     * @returns The lookup.
     */
    const namesIn =
        (stack: readonly CompiledLayer[]) =>
        (key: LayerId): string =>
            stack.find((entry) => entry.layer.id === key)?.layer.name ?? key;

    /**
     * The plan for a change to the tree alone, which leaves every layer as it is.
     * @param rows - The tree it leaves.
     * @param id - The row it changed, which the run resolves with.
     * @param reason - What the change announcement says it was.
     * @param stack - The stack, when the change also changed a layer (a rename).
     * @returns The plan.
     */
    const treePlan = (
        rows: Rows,
        id: StyleRowId,
        reason: RepaintReason,
        stack: readonly CompiledLayer[] = current(),
    ): EditPlan<StyleRow> => {
        const banded = normalize(rows);
        const found = findRow(banded, id);
        if (found === undefined) {
            throw unknownRow(id, banded);
        }

        return {
            stack,
            rows: banded,
            result: publicRow(found.row, namesIn(stack)),
            layers: found.row.kind === "layer" ? [id] : layerIdsOf(found.row.children ?? []),
            unresolvedPaths: NO_PATHS,
            reason,
        };
    };

    /**
     * The row at an id, or the refusal for naming one the tree does not hold.
     * @param id - The row.
     * @returns The row.
     */
    const requireRow = (id: StyleRowId): RowNode => {
        const found = findRow(rowsOf(current()), id);
        if (found === undefined) {
            throw unknownRow(id, rowsOf(current()));
        }

        return found.row;
    };

    /**
     * The folder a place names, checked.
     * @param at - The place.
     * @param moving - The row being moved there, which may not hold the folder.
     * @returns The folder's id, or null for the top level.
     */
    const parentOf = (at: StyleRowPlace | undefined, moving?: RowNode): StyleRowId | null => {
        const parent = at?.parent ?? null;
        if (parent === null) {
            return null;
        }

        const folder = requireRow(parent);
        if (folder.kind !== "folder") {
            throw badCommand(`"${parent}" is a layer, not a folder, so nothing can be put in it.`, { parent });
        }

        if (moving !== undefined && (moving.id === parent || findRow(moving.children ?? [], parent) !== undefined)) {
            throw badCommand("A folder cannot be moved into itself.", { id: moving.id, parent });
        }

        return parent;
    };

    /**
     * The number of rows a place's folder holds.
     * @param rows - The tree.
     * @param parent - The folder, or null for the top level.
     * @returns How many rows it holds.
     */
    const sizeOf = (rows: Rows, parent: StyleRowId | null): number =>
        parent === null ? rows.length : (findRow(rows, parent)?.row.children?.length ?? 0);

    /**
     * The plan a tree verb asks for.
     * @param command - The command.
     * @returns The plan.
     */
    const planTree = (
        command: Extract<
            StylePatchCommand,
            { action: "addFolder" | "renameRow" | "moveRow" | "pinRow" | "lockRow" | "hideRow" | "deleteRow" }
        >,
    ): EditPlan<unknown> => {
        const rows = rowsOf(current());
        switch (command.action) {
            case "addFolder": {
                const parent = parentOf(command.at);
                const id = folderMinter(rows)(command.name);
                const folder: RowNode = Object.freeze({
                    id,
                    kind: "folder",
                    name: command.name,
                    pin: "none",
                    locked: false,
                    hidden: false,
                    children: Object.freeze([]),
                });
                return treePlan(insertRow(rows, parent, command.at?.index ?? sizeOf(rows, parent), folder), id, "add");
            }
            case "renameRow": {
                const row = requireRow(command.id);
                if (row.kind === "folder") {
                    return treePlan(
                        mapRow(rows, command.id, (each) => ({ ...each, name: command.name })),
                        command.id,
                        "update",
                    );
                }

                const stack = current().map((entry) =>
                    rowKeyOf(entry) === command.id
                        ? Object.freeze({ ...entry, layer: Object.freeze({ ...entry.layer, name: command.name }) })
                        : entry,
                );
                return treePlan(rows, command.id, "update", stack);
            }
            case "moveRow": {
                const row = requireRow(command.id);
                const parent = parentOf(command.to, row);
                const without = pruneRows(rows, (each) => each.id === command.id);
                const index = command.to.index ?? sizeOf(without, parent);
                return treePlan(insertRow(without, parent, index, row), command.id, "move");
            }
            case "pinRow":
                requireRow(command.id);
                return treePlan(
                    mapRow(rows, command.id, (each) => ({ ...each, pin: command.pin })),
                    command.id,
                    "move",
                );
            case "lockRow":
                requireRow(command.id);
                return treePlan(
                    mapRow(rows, command.id, (each) => ({ ...each, locked: command.locked })),
                    command.id,
                    "update",
                );
            case "hideRow":
                requireRow(command.id);
                return treePlan(
                    mapRow(rows, command.id, (each) => ({ ...each, hidden: command.hidden })),
                    command.id,
                    "update",
                );
            default: {
                // deleteRow
                const row = requireRow(command.id);
                const keys = new Set(row.kind === "layer" ? [row.id] : layerIdsOf(row.children ?? []));
                const removed = current()
                    .filter((entry) => !entry.layer.locked && keys.has(rowKeyOf(entry)))
                    .map((entry) => entry.layer.id);
                return {
                    stack: current().filter((entry) => entry.layer.locked || !keys.has(rowKeyOf(entry))),
                    rows: pruneRows(rows, (each) => each.id === command.id),
                    result: Object.freeze(removed),
                    layers: removed,
                    unresolvedPaths: NO_PATHS,
                    reason: "remove",
                };
            }
        }
    };

    /**
     * The plan a style command asks for, against the stack as it stands now.
     * @param command - The command.
     * @returns The plan. Throws a `GraphtyError` to refuse it.
     */
    const planOf = (command: StyleCommand): EditPlan<unknown> => {
        if (command.op === "style.encode") {
            return planEncode(command.spec, runBeneath(command.beneathAuthored));
        }

        if (command.op === "style.template") {
            return planTemplate(command.document, command.templateId);
        }

        switch (command.action) {
            case "add":
                if (isElementSource(sourceOf(command.spec))) {
                    throw new GraphtyError({
                        code: "E_PROTECTED",
                        message:
                            "Only the element mints an element-owned layer. Leave the source unstated for a layer " +
                            "of your own, or name the template or plugin it came from.",
                        source: "style",
                        details: { source: command.spec.source },
                    });
                }

                if (command.spec.row !== undefined) {
                    throw badCommand("A layer joins a row only through addRow.", { row: command.spec.row });
                }

                return planInsert(command.spec, insertionIndex(command.at), mint(command.spec.name));
            case "update":
                if ("row" in command.patch || retargetsRowPart(require(command.id).layer, command.patch)) {
                    throw badCommand("A row part keeps its row and its kind; write to the row with writeRow.", {
                        id: command.id,
                    });
                }

                return planUpdate(command.id, command.patch);
            case "addRow":
                return planAddRow(command.spec, command.at);
            case "restoreStartingRows":
                return planStartingRows();
            case "addFolder":
            case "renameRow":
            case "moveRow":
            case "pinRow":
            case "lockRow":
            case "hideRow":
            case "deleteRow":
                return planTree(command);
            case "writeRow":
                return planWriteRow(command.id, command.write);
            case "remove":
                return planRemove(command.id);
            case "move":
                return planMove(command.id, command.before);
            case "removeBySource":
                return planSweep(command.ids);
            case "highlight":
                return planHighlight(command.spec, runBeneath(command.beneathAuthored));
            case "resolveToStatic":
                // The value and the patch are worked out by the same reading that reported the
                // channel uneditable, and applied by the same update any other patch goes through.
                return planUpdate(
                    command.id,
                    resolveRule(command.id, command.channel, explainSources, command.at).patch,
                );
            default:
                throw badCommand(`"${String((command as { action?: unknown }).action)}" is not a style.patch action.`, {
                    action: (command as { action?: unknown }).action,
                });
        }
    };

    // The style ops of this dispatcher compile against this session.
    dispatcher.services.styles = {
        execute(command, draft) {
            const planned = planOf(command);
            const stack = current();
            // The tree follows the stack another verb planned, or is the one a tree verb planned;
            // the stack then takes the tree's order.
            const rows = reconcile(planned.rows ?? rowsOf(stack), planned.stack, planned.moved);
            const next = arrange(planned.stack, rows);
            if (
                rows === rowsOf(stack) &&
                next.length === stack.length &&
                next.every((entry, at) => entry === stack[at])
            ) {
                // Nothing moved (a sweep that matched nothing): no step, and a pass only to say so.
                dispatcher.lane.touch("styles", "");
            } else {
                draft.styles = next;
            }

            let settle: (painted: RepaintReport | null) => void = () => undefined;
            let refuse: (error: unknown) => void = () => undefined;
            const painted = new Promise<RepaintReport | null>((resolve, reject) => {
                settle = resolve;
                refuse = reject;
            });
            // Nobody may be awaiting it: a failed repaint is also reported where hooks report.
            painted.catch(() => undefined);
            announcements.push({
                change: {
                    reason: planned.reason,
                    layers: planned.layers,
                    unresolvedPaths: planned.unresolvedPaths,
                    warnings: planned.warnings ?? NO_WARNINGS,
                },
                settle,
                refuse,
            });

            return { result: planned.result, painted } satisfies EditOutcome<unknown>;
        },
    };

    // The `styles` hook: the repaint follows the stack, whatever moved it -- an edit, an undo, a
    // redo or a rollback -- from the stack the picture shows to the one state holds.
    dispatcher.lane.register("styles", async (rendered, target) => {
        const told = announcements.splice(0);
        // A hidden row's layers repaint as disabled, keeping their places.
        const request = stackChange(paintedStack(rendered.styles), paintedStack(target.styles));
        let painted: RepaintReport | null = null;
        let failure: unknown = null;

        if (sources.repaint !== undefined) {
            try {
                painted = request.edits.length === 0 ? NOTHING_PAINTED : await sources.repaint(request, PASS_CONTEXT);
            } catch (error) {
                failure = error;
            }
        }

        lastPass = {
            reason: request.reason,
            layers: request.edits.map((each) => (each.next ?? each.previous)?.layer.id ?? ""),
            painted,
        };

        for (const each of told) {
            if (failure === null) {
                each.settle(painted);
            } else {
                each.refuse(failure);
            }

            styleRevision++;
            sources.onChange?.({ ...each.change, painted, cause: "command" });
        }
    });

    // An undo, a redo, a restore or a rollback is told once the pass deriving it has run, one
    // event per step it passed.
    const previousDerived = dispatcher.events.derived;
    dispatcher.events.derived = (change) => {
        previousDerived?.(change);
        if (change.cause !== "command" && change.slices.includes("styles")) {
            styleRevision++;
            sources.onChange?.({
                reason: lastPass.reason,
                layers: lastPass.layers,
                painted: lastPass.painted,
                unresolvedPaths: NO_PATHS,
                warnings: NO_WARNINGS,
                cause: change.cause,
            });
        }
    };

    // The element's own layers are the baseline: seeded once, and never a step.
    const seedId = minter();
    const seeded = (sources.base ?? []).map((spec) => {
        const checked = check(spec, seedId(spec.name));

        if (checked.layer === null) {
            throw new GraphtyError({
                code: "E_INTERNAL",
                message: `The element's own style layer "${spec.name}" is malformed.`,
                source: "style",
                details: { errors: checked.result.errors },
            });
        }

        return checked.layer;
    });
    if (seeded.length > 0) {
        dispatcher.seed((draft) => {
            draft.styles = Object.freeze([...current(), ...seeded]);
        });
    }

    const api: SessionStylesApi = {
        list(): readonly Layer[] {
            return listLayers();
        },

        compiled(): readonly CompiledLayer[] {
            // As it paints: a hidden row's layers read as disabled.
            return paintedStack(current());
        },

        tree(): readonly StyleRow[] {
            const stack = current();
            let rows = treeCache.get(stack);
            if (rows === undefined) {
                rows = publicRows(rowsOf(stack), namesIn(stack));
                treeCache.set(stack, rows);
            }

            return rows;
        },

        addFolder(name: string, at?: StyleRowPlace, options: RunOptions = {}): Run<StyleRow> {
            return edit<StyleRow>(
                "add",
                `Add folder "${name}"`,
                { op: "style.patch", action: "addFolder", name, ...(at === undefined ? {} : { at }) },
                options,
            );
        },

        renameRow(id: StyleRowId, name: string, options: RunOptions = {}): Run<StyleRow> {
            return edit<StyleRow>(
                "update",
                `Rename row ${id}`,
                { op: "style.patch", action: "renameRow", id, name },
                options,
            );
        },

        moveRow(id: StyleRowId, to: StyleRowPlace, options: RunOptions = {}): Run<StyleRow> {
            return edit<StyleRow>("move", `Move row ${id}`, { op: "style.patch", action: "moveRow", id, to }, options);
        },

        pinRow(id: StyleRowId, pin: StyleRowPin, options: RunOptions = {}): Run<StyleRow> {
            return edit<StyleRow>("move", `Pin row ${id}`, { op: "style.patch", action: "pinRow", id, pin }, options);
        },

        lockRow(id: StyleRowId, locked: boolean, options: RunOptions = {}): Run<StyleRow> {
            return edit<StyleRow>(
                "update",
                `Lock row ${id}`,
                { op: "style.patch", action: "lockRow", id, locked },
                options,
            );
        },

        hideRow(id: StyleRowId, hidden: boolean, options: RunOptions = {}): Run<StyleRow> {
            return edit<StyleRow>(
                "update",
                `Hide row ${id}`,
                { op: "style.patch", action: "hideRow", id, hidden },
                options,
            );
        },

        restoreStartingRows(options: RunOptions = {}): Run<readonly RowParts[]> {
            return edit<readonly RowParts[]>(
                "add",
                "Restore the starting rows",
                { op: "style.patch", action: "restoreStartingRows" },
                options,
            );
        },

        deleteRow(id: StyleRowId, options: RunOptions = {}): Run<readonly LayerId[]> {
            return edit<readonly LayerId[]>(
                "remove",
                `Delete row ${id}`,
                { op: "style.patch", action: "deleteRow", id },
                options,
            );
        },

        get(id: LayerId): Layer | undefined {
            return byId().get(id)?.layer;
        },

        validate(spec: LayerSpec): ValidationResult {
            return check(spec, mint(spec.name)).result;
        },

        add(spec: LayerSpec, at?: LayerPosition, options: RunOptions = {}): Run<Layer> {
            return edit<Layer>(
                "add",
                `Add layer "${spec.name}"`,
                { op: "style.patch", action: "add", spec, ...(at === undefined ? {} : { at }) },
                options,
            );
        },

        update(id: LayerId, patch: Partial<LayerSpec>, options: RunOptions = {}): Run<Layer> {
            return edit<Layer>(
                "update",
                `Update layer ${id}`,
                { op: "style.patch", action: "update", id, patch },
                options,
            );
        },

        remove(id: LayerId, options: RunOptions = {}): Run<void> {
            return edit("remove", `Remove layer ${id}`, { op: "style.patch", action: "remove", id }, options);
        },

        move(id: LayerId, before: LayerId | null, options: RunOptions = {}): Run<void> {
            return edit("move", `Move layer ${id}`, { op: "style.patch", action: "move", id, before }, options);
        },

        removeBySource(predicate: (source: LayerSource) => boolean, options: RunOptions = {}): Run<readonly LayerId[]> {
            // Resolved when it is dispatched: the predicate is not data, the ids it matches are.
            return edit<readonly LayerId[]>(
                "sweep",
                "Remove layers by source",
                (state) => ({
                    op: "style.patch",
                    action: "removeBySource",
                    ids: state.styles
                        .filter((entry) => !entry.layer.locked && predicate(entry.layer.source))
                        .map((entry) => entry.layer.id),
                }),
                options,
            );
        },

        addRow(spec: RowSpec, at?: LayerPosition, options: RunOptions = {}): Run<RowParts> {
            return edit<RowParts>(
                "add",
                `Add row "${spec.name}"`,
                { op: "style.patch", action: "addRow", spec, ...(at === undefined ? {} : { at }) },
                options,
            );
        },

        writeRow(id: LayerId, write: RowWrite, options: RunOptions = {}): Run<RowParts> {
            return edit<RowParts>(
                "update",
                `Write row ${id}`,
                { op: "style.patch", action: "writeRow", id, write },
                options,
            );
        },

        parts(id: LayerId): RowParts | undefined {
            return rowOf(rowParts(current(), id));
        },

        colors(rowIds: readonly StyleRowId[]): readonly StyleColor[] {
            return colorsOf(layersUnder(rowIds));
        },

        replaceColor(
            rowIds: readonly StyleRowId[],
            from: string,
            to: string,
            options: RunOptions = {},
        ): Run<readonly Layer[]> {
            const batch = (): StyleCommand[] => {
                const before = toColorValue(from);
                if (before === null || toColorValue(to) === null) {
                    throw badCommand(`"${before === null ? from : to}" is not a colour.`, { from, to });
                }

                const rows = rowsOf(current());
                const commands: StyleCommand[] = [];
                for (const layer of layersUnder(rowIds)) {
                    const patch = lockedByReader(rows, layer.row ?? layer.id)
                        ? null
                        : replaceColorPatch(layer, before.hex, to);
                    if (patch !== null) {
                        commands.push({ op: "style.patch", action: "update", id: layer.id, patch });
                    }
                }

                return commands;
            };

            return edit<readonly Layer[]>("update", `Replace ${from} with ${to}`, { batch }, options);
        },

        encode(spec: EncodingSpec | ColumnEncodingSpec, options: RunOptions = {}): Run<Layer> {
            if ("column" in spec) {
                // Planned when the edit runs and stored as a plain layer, so undo, redo and a
                // replay draw exactly the binding chosen now.
                return edit<Layer>(
                    "encode",
                    `Encode ${spec.channel}`,
                    () => ({ op: "style.patch", action: "add", spec: planColumn(spec) }),
                    options,
                );
            }

            return edit<Layer>(
                "encode",
                `Encode ${spec.channel}`,
                { op: "style.encode", spec: { ...spec, run: runIdOf(spec.run) } },
                options,
            );
        },

        proposeEncoding(spec: EncodingSpec | ColumnEncodingSpec): EncodingProposal {
            if ("column" in spec) {
                const { column, declaration } = columnOf(spec);
                return proposeColumnBinding(spec, column, declaration, scales);
            }

            try {
                const planned = planEncoding(spec, requireRuns("proposeEncoding"));
                return { ok: true, binding: planned.encode?.[spec.channel] as Extract<Binding, { by: Path }> };
            } catch (error) {
                if (!(error instanceof GraphtyError) || error.code !== "E_BAD_COMMAND") {
                    throw error;
                }

                return { ok: false, refusal: { code: error.code, params: plainParams(error.details) } };
            }
        },

        setHighlightColor(color: string | undefined): void {
            if (color === undefined) {
                highlightColor = DEFAULT_HIGHLIGHT.color;
                return;
            }

            const verdict = check(
                {
                    name: "Highlight colour",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.color": color },
                },
                mint("Highlight colour"),
            ).result;

            if (!verdict.ok) {
                throw badCommand(`"${color}" is not a colour a layer accepts, so it cannot be the highlight colour.`, {
                    color,
                });
            }

            highlightColor = color;
        },

        highlightStyle(target: SelectorTarget): StaticStyle {
            return halfOfStyle(undefined, target, highlightColor) ?? {};
        },

        highlight(spec: HighlightSpec, options: RunOptions = {}): Run<readonly Layer[]> {
            return edit<readonly Layer[]>(
                "highlight",
                "Highlight a result",
                { op: "style.patch", action: "highlight", spec: { ...spec, run: runIdOf(spec.run) } },
                options,
            );
        },

        resolveToStatic(id: LayerId, channel: Channel, at?: ExplainTarget, options: RunOptions = {}): Run<Layer> {
            return edit<Layer>(
                "resolve",
                `Fix ${channel} on layer ${id}`,
                { op: "style.patch", action: "resolveToStatic", id, channel, ...(at === undefined ? {} : { at }) },
                options,
            );
        },

        setValueHidden(
            id: LayerId,
            channel: Channel,
            value: string | number | boolean,
            hidden: boolean,
            options: RunOptions = {},
        ): Run<Layer> {
            return edit<Layer>(
                "update",
                `${hidden ? "Hide" : "Show"} ${String(value)} on layer ${id}`,
                (state) => ({
                    op: "style.patch",
                    action: "update",
                    id,
                    patch: hiddenValuePatch(
                        state.styles.find((entry) => entry.layer.id === id)?.layer,
                        channel,
                        value,
                        hidden,
                    ),
                }),
                options,
            );
        },

        categories(id: LayerId, channel: Channel): readonly ValueCategory[] {
            const entry = byId().get(id);
            if (entry === undefined) {
                throw unknownLayer(
                    id,
                    listLayers().map((layer) => layer.id),
                );
            }

            return categoriesOf(entry.layer, channel, encodingOf(id));
        },

        setValueEntry(
            id: LayerId,
            channel: Channel,
            value: string | number | boolean,
            entry: ChannelValue | undefined,
            options: RunOptions = {},
        ): Run<Layer> {
            return edit<Layer>(
                "update",
                `Change ${channel} of ${String(value)} on layer ${id}`,
                (state) => ({
                    op: "style.patch",
                    action: "update",
                    id,
                    patch: valueEntryPatch(layerIn(state, id), channel, value, entry),
                }),
                options,
            );
        },

        applyTemplate(document: StyleDocument, options: TemplateOptions = {}): Run<TemplateReport> {
            return edit<TemplateReport>(
                "template",
                "Apply a style document",
                {
                    op: "style.template",
                    document,
                    ...(options.templateId === undefined ? {} : { templateId: options.templateId }),
                },
                options,
            );
        },

        legend(): readonly LegendBlock[] {
            return buildLegend(legendSources);
        },

        legendOf(id: LayerId): readonly LegendBlock[] {
            const blocks = buildLayerLegend(legendSources, id);

            if (blocks === undefined) {
                throw new GraphtyError({
                    code: "E_UNKNOWN_LAYER",
                    message: `There is no style layer with the id "${id}".`,
                    source: "style",
                    target: { kind: "layer", id },
                    details: { id, known: listLayers().map((layer) => layer.id) },
                });
            }

            return blocks;
        },

        async settled(): Promise<void> {
            // What the element starts for itself (a run's suggested layers) waits on the queue;
            // the repaint of every edit written so far waits on the derivation lane.
            await sources.queue?.settled();
            await dispatcher.lane.settled();
        },

        explain(target: ExplainTarget): StyleExplanation {
            return explainStyle(target, explainSources);
        },

        agreement(scope: Scope, channel?: Channel, options: AgreementOptions = {}): StyleAgreement {
            const { below, over } = options;
            const read = below === undefined ? explainSources : { ...explainSources, stack: () => stackBelow(below) };
            if (over === undefined) {
                return styleAgreement(elementsOf(scope), read, channel);
            }

            // The row's elements: those of the scope some layer of the row matches, hidden or not.
            const parts = layersUnder([over]).flatMap((layer) => byId().get(layer.id) ?? []);
            const scoped = elementsOf(scope);
            const nodes = [...scoped.nodes];
            const edges = [...scoped.edges];
            const within = (target: "node" | "edge", indices: readonly number[]): number[] =>
                indices.filter((index) =>
                    parts.some(
                        ({ layer, selector }) =>
                            layer.target === target && (selector.test === null || selector.test(index)),
                    ),
                );
            const matched = { nodes: within("node", nodes), edges: within("edge", edges) };
            if (matched.nodes.length + matched.edges.length > 0) {
                return { ...styleAgreement(matched, read, channel), readOver: "row" };
            }

            // It matches nothing: read the row's kinds through the layers that match every element.
            const kinds = new Set(parts.map(({ layer }) => layer.target));
            const floor = { ...read, stack: () => read.stack().filter((entry) => entry.selector.test === null) };
            const every = {
                nodes: kinds.has("node") ? nodes : [],
                edges: kinds.has("edge") ? edges : [],
            };

            return { ...styleAgreement(every, floor, channel), readOver: "everyElement" };
        },

        preview(binding: RuleBinding, options: { readonly channel: Channel; readonly bins?: number }): BindingPreview {
            const descriptor = requireChannel(options.channel);
            if (!("by" in binding) || typeof binding.by !== "string") {
                throw badCommand("A preview reads a binding that reads a value: { by: <path>, ... }.", {
                    field: "by",
                });
            }

            if (binding.stops !== undefined) {
                const problem =
                    binding.palette === undefined
                        ? stopsProblem(binding.stops)
                        : "A binding names a palette or carries its own stops, not both.";
                if (problem !== null) {
                    throw new GraphtyError({
                        code: "E_BAD_LAYER",
                        message: problem,
                        source: "style",
                        details: { stops: binding.stops },
                    });
                }
            }

            const kind = descriptor.accepts === "color" ? paletteKindOf(binding) : null;
            const palette = kind === null || binding.palette !== undefined ? undefined : defaultPalettes[kind];
            const filled: RuleBinding = palette === undefined ? binding : { ...binding, palette };
            const { nodes, edges } = elementsOf(WHOLE_GRAPH);
            const read = descriptor.target === "node" ? sources.elements.nodeValue : sources.elements.edgeValue;
            const column = [...(descriptor.target === "node" ? nodes : edges)].map((index) => read(index, binding.by));

            return previewBinding({
                channel: descriptor.channel,
                binding: filled,
                column,
                scales,
                ...(options.bins === undefined ? {} : { bins: options.bins }),
            });
        },

        counts(id: LayerId): StyleCounts {
            const revision = `${String(styleRevision)}.${String(sources.inputRevision?.() ?? 0)}`;

            return styleCounts(id, elementsOf(WHOLE_GRAPH), explainSources, revision);
        },

        setDefaultPalettes(palettes: DefaultPalettes, options: { readonly reapply?: boolean } = {}): void {
            for (const [kind, id] of Object.entries(palettes)) {
                if (kind !== "categorical" && kind !== "sequential" && kind !== "diverging") {
                    throw badCommand(
                        `setDefaultPalettes takes a palette for "categorical", "sequential" or "diverging", not "${kind}".`,
                        { field: kind },
                    );
                }

                if (id === undefined) {
                    continue;
                }

                const palette = paletteDescriptor(String(id));
                if (palette === undefined) {
                    const available = knownPaletteIds();
                    throw new GraphtyError({
                        code: "E_UNKNOWN_PALETTE",
                        message: `There is no palette named "${String(id)}". Define it before making it a default.`,
                        source: "style",
                        details: { palette: id, available, candidates: available },
                    });
                }

                if (palette.kind !== kind) {
                    throw badCommand(
                        `The palette "${palette.id}" is ${palette.kind}, so it cannot be the ${kind} default.`,
                        { field: kind, palette: palette.id },
                    );
                }
            }

            // The layers that took the default a kind is about to lose: a binding naming no palette
            // took the element's own choice, and one this session filled in took the old default.
            const previous = defaultPalettes;
            const stale: { layer: Layer; channels: { channel: string; kind: keyof DefaultPalettes }[] }[] = [];
            for (const { layer } of current()) {
                if (layer.locked) {
                    continue;
                }

                const channels = Object.entries(layer.encode ?? {}).flatMap(([channel, binding]) => {
                    const kind =
                        binding === undefined || channelDescriptor(channel)?.accepts !== "color"
                            ? null
                            : paletteKindOf(binding);
                    if (
                        kind === null ||
                        !("by" in binding) ||
                        palettes[kind] === undefined ||
                        palettes[kind] === previous[kind]
                    ) {
                        return [];
                    }

                    const took =
                        binding.palette === undefined ||
                        (binding.palette === previous[kind] && defaulted.has(`${layer.id}/${channel}`));
                    return took ? [{ channel, kind }] : [];
                });
                if (channels.length > 0) {
                    stale.push({ layer, channels });
                }
            }

            defaultPalettes = { ...previous, ...palettes };

            if (stale.length === 0) {
                return;
            }

            if (options.reapply !== true) {
                const named = stale.map(({ layer }) => `"${layer.name}" (${layer.id})`).join(", ");
                console.warn(
                    `[graphty] setDefaultPalettes: ${named} took the previous default palette and keep it. ` +
                        "Call setDefaultPalettes before adding layers, or pass { reapply: true } to repaint them.",
                );
                return;
            }

            for (const { layer, channels } of stale) {
                const encode: Record<string, Binding> = { ...(layer.encode as Record<string, Binding>) };
                for (const { channel, kind } of channels) {
                    encode[channel] = { ...encode[channel], palette: defaultPalettes[kind] };
                    defaulted.add(`${layer.id}/${channel}`);
                }

                api.update(layer.id, { encode }).then(undefined, (error: unknown) => {
                    console.error(`[graphty] setDefaultPalettes could not reapply the layer "${layer.name}".`, error);
                });
            }
        },

        toDocument(): StyleDocument {
            const mine = current().filter((entry) => !entry.layer.locked);
            const layers = mine.map((entry) => specOf(entry.layer));
            const carried = carriedPalettes(layers);
            // Saved by place, since an opened document mints new layer ids.
            const tree = documentRows(rowsOf(current()), (key) => mine.findIndex((entry) => entry.layer.id === key));

            return Object.freeze({
                version: DOCUMENT_VERSION,
                layers: Object.freeze(layers),
                // Written only when there is something to write, so a look that uses nothing but
                // the element's own palettes saves byte for byte what it saved before.
                ...(carried.length === 0 ? {} : { palettes: Object.freeze(carried) }),
                ...(tree === undefined ? {} : { tree }),
            });
        },
    };

    return api;
}
