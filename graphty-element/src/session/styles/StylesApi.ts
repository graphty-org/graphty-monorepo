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
 * READING IS SYNCHRONOUS, WRITING IS A COMMAND. `list`, `get`, `validate`, `legend`, `explain`
 * and `toDocument` answer from what the session already holds and cost nothing. `add`, `update`,
 * `remove`, `move`, `removeBySource`, `encode`, `highlight`, `applyTemplate` and
 * `resolveToStatic` VALIDATE AND REPAINT, and a repaint is a pass over the elements a layer
 * matches -- so they are commands, not properties, and each returns a `Run`. That is what lets a
 * layer edit on a large graph report progress, take an `AbortSignal`, and be fired from a click
 * handler and forgotten without an unhandled rejection. Awaiting one gives the layer.
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
 * THE MODEL MOVES ONLY AFTER THE PAINT SUCCEEDS. Each verb computes the stack it WOULD produce,
 * hands it to the repaint, and commits it only when the repaint resolves. A cancelled or failed
 * edit therefore leaves the list exactly as it was, rather than leaving the layer list saying one
 * thing and the screen showing another. The visible consequence is worth stating plainly: `add()`
 * followed immediately by `list()` does not show the new layer -- `await add()` does.
 *
 * AN ELEMENT-OWNED LAYER IS NOT THE CONSUMER'S. The base and selection layers are seeded at
 * construction with `source.by === "element"`, which makes them {@link Layer.locked}. Removing,
 * editing or moving one is `E_PROTECTED`, and `add()` refuses to mint an element source at all.
 * That replaces identifying them BY NAME, which is what the one consumer does today and which its
 * own comment admits breaks for a reader who calls their own layer "default".
 *
 * WHERE THE REPAINT PLUGS IN. `sources.repaint` is the seam, and nothing in this module
 * implements it: see {@link LayerRepaint} in `./Layer`. A session with no renderer hands none in
 * and paints nothing, which is not a degraded mode -- the stack is the session's and the paint is
 * the renderer's.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { knownPaletteIds, PALETTE_DESCRIPTORS, paletteDescriptor } from "../../catalog/palettes";
import type {
    Channel,
    EdgeId,
    FieldDescriptor,
    LayerId,
    LayerSource,
    LayerSpec,
    NodeId,
    PaletteDescriptor,
    Path,
    RunId,
    Scope,
    StaticStyle,
    StyleDocument,
} from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { nearestNames } from "../results/ResultsApi";
import { isHighlightShape, resultPath, resultShapeContract, type RunRef } from "../results/types";
import {
    type Caveats,
    createLocalRunQueue,
    deriveRunId,
    ENGINE_VERSIONS,
    type EngineVersions,
    ManagedRun,
    type ResolvedScope,
    type Run,
    type RunBody,
    type RunDefinition,
    type RunExecutionContext,
    type RunOptions,
    type RunQueue,
    type RunSurroundings,
    type RunTicket,
} from "../runs";
import { isChannel } from "./channels";
import type { PreparedBinding } from "./encoding";
import { type EncodingRun, type EncodingSource, type EncodingSpec, planEncoding } from "./EncodingSpec";
import {
    type ExplainSources,
    explainStyle,
    type ExplainTarget,
    resolveToStatic as resolveRule,
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
    type LayerEdit,
    type LayerPosition,
    type LayerRepaint,
    mintLayerId,
    type PathDirectory,
    type RepaintReason,
    type RepaintReport,
    sourceOf,
    specOf,
    type ValidationResult,
} from "./Layer";
import { buildLegend, type EncodingLookup, type FieldWords, type LegendBlock, type LegendSources } from "./legend";
import { quotePath, type SelectorSource, type SelectorTarget } from "./predicate";
import { createScaleRegistry, type ScaleRegistry } from "./scales";

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

/** What applying a style document did, per layer. */
export interface TemplateReport {
    /** The layers that bound and now paint, bottom first. */
    readonly applied: readonly LayerId[];
    /**
     * The layers that read nothing this session answers.
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
     *     `E_PROTECTED` for an element-owned layer.
     */
    update(id: LayerId, patch: Partial<LayerSpec>, options?: RunOptions): Run<Layer>;
    /**
     * Take a layer out of the stack.
     * @param id - The layer to remove.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves when the layer is gone, and rejects with `E_PROTECTED` for an
     *     element-owned layer.
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
     *     an element-owned layer.
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
     * @param spec - The run, the channel and the taste.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns A run that resolves with the layer, and rejects with `E_UNKNOWN_RUN` for a run this
     *     session does not hold, `E_UNKNOWN_ATTRIBUTE` for a field it does not publish, and
     *     `E_BAD_COMMAND` when the result has nothing per element to bind a channel to.
     */
    encode(spec: EncodingSpec, options?: RunOptions): Run<Layer>;
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
     *     for an element-owned layer and `E_BAD_COMMAND` when that layer works the channel out
     *     from nothing.
     */
    resolveToStatic(id: LayerId, channel: Channel, at?: ExplainTarget, options?: RunOptions): Run<Layer>;
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
    /** How much was repainted, or null when no renderer is bound to this session. */
    readonly painted: RepaintReport | null;
    /**
     * The paths the changed layers read that nothing in this session answers.
     *
     * Not a failure: a selector naming a run that has not been started is a correct selector over
     * a session that will answer it later. It is reported so a consumer can say why a layer
     * paints nothing instead of showing a confident empty screen.
     */
    readonly unresolvedPaths: readonly Path[];
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
     * What paints the elements a change touched.
     *
     * THE SEAM, and the one thing this module does not do. Absent, an edit changes the stack and
     * paints nothing, which is exactly right for a headless session.
     */
    readonly repaint?: LayerRepaint;
    /**
     * The queue an edit takes its turn in. Absent builds a sequential one of its own, which is
     * right for a headless session and wrong for a rendered graph -- a rendered graph hands in
     * the element's own operation queue so a repaint does not interleave with a load.
     */
    readonly queue?: RunQueue;
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

/** A layer nothing prepared has no bindings to read. */
const NO_BINDINGS: readonly PreparedBinding[] = Object.freeze([]);

/**
 * The index of an element in a session that cannot resolve ids.
 * @returns Undefined, always: no id names an element here.
 */
const NO_INDEX = (): number | undefined => undefined;

/**
 * The palette the element's own highlight colour comes from.
 *
 * Its first colour is the highlighted state and its second the muted one, and it is safe for all
 * three kinds of colour blindness -- which is why the highlight default is taken from here rather
 * than written as a hex string somebody once liked.
 */
const HIGHLIGHT_PALETTE = "blue-highlight";

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

/** Nothing qualifies a style edit's work: it is exact, it reads no weights, it samples nothing. */
const EDIT_CAVEATS: Caveats = Object.freeze({
    direction: "as-loaded",
    exact: true,
    method: "layer-stack",
    notes: NO_NOTES,
    precision: "f64",
    seed: null,
    weight: null,
});

/** The stack an edit would produce, worked out before anything is committed. */
interface EditPlan<T> {
    /** The stack as it would stand, bottom first. */
    readonly stack: readonly CompiledLayer[];
    /** What changed, for the repaint's dirty set. */
    readonly edits: readonly LayerEdit[];
    /** The lowest position in `stack` whose painted answer can differ. */
    readonly fromIndex: number;
    /** What the run resolves to. */
    readonly result: T;
    /** The layers the edit touched, for the change announcement. */
    readonly layers: readonly LayerId[];
    /** The paths those layers read that nothing answers. */
    readonly unresolvedPaths: readonly Path[];
    /**
     * What the repaint is told this edit was, when that is not the verb's usual one.
     *
     * Worked out by the plan rather than by the caller, because an `encode()` only knows whether
     * it is adding a layer or replacing one once it has looked at the stack it is about to change.
     */
    readonly reason?: RepaintReason;
}

/** One layer of a style document, in both the form it was written in and the form it compiled to. */
interface ImportedLayer {
    /** The specification the document carried, kept so the layer can be re-checked disabled. */
    readonly spec: LayerSpec;
    /** The layer it compiled to, carrying the id it will keep. */
    readonly compiled: CompiledLayer;
}

/**
 * A scope of no elements, for a session that hands in no resolver.
 * @returns The resolved scope.
 */
function emptyScope(): ResolvedScope {
    return Object.freeze({
        digest: "",
        edgeCount: 0,
        edges: new Set<never>(),
        nodeCount: 0,
        nodes: new Set<never>(),
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
        code: "E_BAD_COMMAND",
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
 * The refusal a call the session cannot make sense of gets.
 * @param message - What is wrong, in a sentence.
 * @param details - The offending values, for an editor that points at them.
 * @returns The error to reject with.
 */
function badCommand(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "style", details });
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
    if (typeof ref === "string") {
        return ref;
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
 * @param set - The style, or undefined for the element's own highlight colour.
 * @param half - Whether the layer paints nodes or edges.
 * @returns The channels for that half, or null when the style names none of them.
 */
function halfOfStyle(set: StaticStyle | undefined, half: SelectorTarget): StaticStyle | null {
    if (set === undefined) {
        const [highlighted] = paletteDescriptor(HIGHLIGHT_PALETTE)?.colors ?? [];

        return highlighted === undefined ? null : { [`${half}.color`]: highlighted };
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
 * Build the style stack one session holds.
 * @param sources - What a selector compiles against, the element's own layers, the scales, the
 *     repaint seam, the queue and the change hook.
 * @returns The stack, including the compiled form a renderer reads.
 * @throws A `GraphtyError` with code `E_INTERNAL` when one of the element's own layers is
 *     malformed, which is a bug in the element rather than in the call.
 */
export function createStylesApi(sources: StylesSources): SessionStylesApi {
    const queue = sources.queue ?? createLocalRunQueue();
    const engine = sources.engine ?? ENGINE_VERSIONS;
    const scales = sources.scales ?? createScaleRegistry();

    let stack: readonly CompiledLayer[] = Object.freeze([]);
    let byId = new Map<LayerId, CompiledLayer>();
    let listCache: readonly Layer[] | null = null;
    let edits = 0;

    /**
     * Take a prospective stack as the one the session now holds.
     * @param next - The stack the edit produced.
     */
    const commit = (next: readonly CompiledLayer[]): void => {
        stack = Object.freeze([...next]);
        byId = new Map(stack.map((entry) => [entry.layer.id, entry]));
        listCache = null;
    };

    /**
     * The stack as data, cached until it changes.
     * @returns The layers, bottom first.
     */
    const listLayers = (): readonly Layer[] => {
        listCache ??= Object.freeze(stack.map((entry) => entry.layer));

        return listCache;
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
        const entry = byId.get(layerId);

        return entry === undefined || sources.encoding === undefined ? NO_BINDINGS : sources.encoding(entry);
    };

    /** What an explanation, an unbound report and a resolved rule are read from. */
    const explainSources: ExplainSources = {
        stack: () => stack,
        encoding: encodingOf,
        elements: sources.elements,
        nodeIndex: sources.nodeIndex ?? NO_INDEX,
        edgeIndex: sources.edgeIndex ?? NO_INDEX,
        ...(sources.paths === undefined ? {} : { paths: sources.paths }),
    };

    /** What a legend is read from. */
    const legendSources: LegendSources = {
        layers: listLayers,
        encoding: encodingOf,
        scales,
        ...(sources.field === undefined ? {} : { field: sources.field }),
    };

    /**
     * Check one layer specification against this session.
     * @param spec - The specification.
     * @param id - The id it would carry.
     * @returns The verdict and, when it is sound, the compiled layer.
     */
    const check = (spec: LayerSpec, id: LayerId): LayerCheck => {
        const options: LayerCheckOptions = {
            id,
            elements: sources.elements,
            scales,
            ...(sources.paths === undefined ? {} : { paths: sources.paths }),
        };

        return checkLayerSpec(spec, options);
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
        const taken = new Set(byId.keys());

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
     * @throws A `GraphtyError` with code `E_BAD_COMMAND` when the stack holds none with that id.
     */
    const require = (id: LayerId): CompiledLayer => {
        const found = byId.get(id);

        if (found === undefined) {
            throw unknownLayer(
                id,
                stack.map((entry) => entry.layer.id),
            );
        }

        return found;
    };

    /**
     * Where a layer sits in the stack now.
     * @param id - The layer id.
     * @returns The index, bottom first.
     */
    const positionOf = (id: LayerId): number => stack.findIndex((entry) => entry.layer.id === id);

    /**
     * Paint what an edit touched, when there is anything bound to paint it.
     * @param reason - Which verb produced the edit.
     * @param plan - The stack it would produce, and what changed.
     * @param context - The run's signal and progress channel.
     * @returns How much was painted, or null when no renderer is bound.
     */
    const paint = async (
        reason: RepaintReason,
        plan: EditPlan<unknown>,
        context: RunExecutionContext,
    ): Promise<RepaintReport | null> => {
        const { repaint } = sources;

        if (repaint === undefined) {
            return null;
        }

        return repaint(
            { reason, edits: plan.edits, stack: plan.stack, fromIndex: plan.fromIndex },
            {
                signal: context.signal,
                report: (progress) => {
                    context.report(progress);
                },
            },
        );
    };

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
        enqueue: (body: RunBody): RunTicket => {
            // `style-edit`, NOT `algorithm-run`, and the difference is whether the edit survives
            // a load. A `data-add` obsoletes an `algorithm-run` -- correctly, because a
            // computation's answer describes the data it read -- and a style write is not one of
            // those: it says how to paint whatever the graph holds next. While it shared that
            // category, the one order a render function can use (issue the edits, then set the
            // data, because it cannot await a run) aborted every edit before its body ran, and an
            // operation dropped from the batch settles nothing: no commit, no refusal, no
            // problem recorded, and a forgotten promise that never resolves.
            const id = queue.queueOperation("style-edit", body, { description: label });

            return {
                cancel: () => {
                    queue.cancelOperation(id);
                },
            };
        },
    });

    /**
     * Start one edit: work out the stack it would produce, paint it, then commit it.
     *
     * The order is the contract. The repaint is awaited BEFORE the stack moves, so a cancelled or
     * failed edit leaves the list exactly as it was rather than describing a picture that was
     * never drawn.
     * @param verb - Which door the edit came through, which is what the run is called.
     * @param fallback - What to tell the repaint, unless the plan works out something better.
     * @param label - What to call it.
     * @param plan - Works out the prospective stack. Throws a `GraphtyError` to refuse the edit.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns The run.
     */
    const startEdit = <T>(
        verb: StyleVerb,
        fallback: RepaintReason,
        label: string,
        plan: () => EditPlan<T>,
        options: RunOptions,
    ): Run<T> => {
        edits++;
        const params: Readonly<Record<string, unknown>> = Object.freeze({ edit: edits, verb });
        const definition: RunDefinition<T> = {
            algorithm: `styles.${verb}`,
            caveats: EDIT_CAVEATS,
            engine,
            exact: null,
            fields: NO_FIELDS,
            id: deriveRunId({ algorithm: `styles.${verb}`, exact: null, params, sample: null, scope: WHOLE_GRAPH, seed: null }),
            params,
            sample: null,
            seed: null,
            // "fact" rather than a per-element shape: an edit publishes what changed about the
            // stack, not a column of values to rank or bin.
            shape: "fact",
            style: false,
            timeBoxMs: null,
            execute: async (context) => {
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

                const planned = plan();
                const reason = planned.reason ?? fallback;
                const painted = await paint(reason, planned, context);

                // A cancel that landed while the repaint was running settles the run without
                // touching the stack, and a repaint that did not notice its own signal must not
                // be able to commit anyway: the model moving after the edit was called off is
                // exactly the "list says one thing, screen shows another" this order prevents.
                context.signal.throwIfAborted();
                commit(planned.stack);
                sources.onChange?.({
                    reason,
                    layers: planned.layers,
                    painted,
                    unresolvedPaths: planned.unresolvedPaths,
                });

                return { result: planned.result };
            },
            ...(options.signal === undefined ? {} : { signal: options.signal }),
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
     * @throws A `GraphtyError` with code `E_BAD_COMMAND` when both neighbours were named, or when
     *     the named one is not in the stack.
     */
    const insertionIndex = (at: LayerPosition | undefined): number => {
        if (at === undefined) {
            return stack.length;
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

            return positionOf(at.above) + 1;
        }

        if (at.below !== undefined) {
            require(at.below);

            return positionOf(at.below);
        }

        return stack.length;
    };

    /**
     * The runs this session can look up, or the refusal a session that cannot look one up gives.
     * @param verb - What was being attempted, for the refusal.
     * @returns Where a run is looked up.
     * @throws A `GraphtyError` with code `E_UNSUPPORTED` when no lookup was handed in.
     */
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

        const next = [...stack];
        next.splice(index, 0, checked.layer);

        return {
            stack: next,
            edits: [{ previous: null, next: checked.layer }],
            fromIndex: index,
            result: checked.layer.layer,
            layers: [checked.layer.layer.id],
            unresolvedPaths: checked.result.unresolvedPaths,
        };
    };

    /**
     * The plan for changing one layer, keeping its id and its place in the stack.
     * @param id - The layer to change.
     * @param patch - What to change about it.
     * @returns The plan.
     * @throws A `GraphtyError` with code `E_PROTECTED` for an element-owned layer, and whatever
     *     the check refuses the merged specification with.
     */
    const planUpdate = (id: LayerId, patch: Partial<LayerSpec>): EditPlan<Layer> => {
        const current = require(id);

        if (current.layer.locked) {
            throw protectedLayer(current.layer, "changed");
        }

        const merged: LayerSpec = { ...specOf(current.layer), ...patch };

        if (isElementSource(sourceOf(merged))) {
            throw protectedLayer(current.layer, "given an element source");
        }

        const checked = check(merged, id);

        if (checked.layer === null) {
            throw refusedSpec(merged.name, checked.result);
        }

        const index = positionOf(id);
        const next = [...stack];
        next[index] = checked.layer;

        return {
            stack: next,
            edits: [{ previous: current, next: checked.layer }],
            fromIndex: index,
            result: checked.layer.layer,
            layers: [id],
            unresolvedPaths: checked.result.unresolvedPaths,
        };
    };

    /**
     * Seed one of the element's own layers, at construction and never afterwards.
     * @param spec - The specification.
     * @throws A `GraphtyError` with code `E_INTERNAL` when it is malformed.
     */
    const seed = (spec: ElementLayerSpec): void => {
        const checked = check(spec, mint(spec.name));

        if (checked.layer === null) {
            throw new GraphtyError({
                code: "E_INTERNAL",
                message: `The element's own style layer "${spec.name}" is malformed.`,
                source: "style",
                details: { errors: checked.result.errors },
            });
        }

        commit([...stack, checked.layer]);
    };

    for (const spec of sources.base ?? []) {
        seed(spec);
    }

    return {
        list(): readonly Layer[] {
            return listLayers();
        },

        compiled(): readonly CompiledLayer[] {
            return stack;
        },

        get(id: LayerId): Layer | undefined {
            return byId.get(id)?.layer;
        },

        validate(spec: LayerSpec): ValidationResult {
            return check(spec, mint(spec.name)).result;
        },

        add(spec: LayerSpec, at?: LayerPosition, options: RunOptions = {}): Run<Layer> {
            return startEdit<Layer>("add", "add", `Add layer "${spec.name}"`, () => {
                if (isElementSource(sourceOf(spec))) {
                    throw new GraphtyError({
                        code: "E_PROTECTED",
                        message:
                            "Only the element mints an element-owned layer. Leave the source unstated for a layer " +
                            'of your own, or name the template or plugin it came from.',
                        source: "style",
                        details: { source: spec.source },
                    });
                }

                return planInsert(spec, insertionIndex(at), mint(spec.name));
            }, options);
        },

        update(id: LayerId, patch: Partial<LayerSpec>, options: RunOptions = {}): Run<Layer> {
            return startEdit<Layer>("update", "update", `Update layer ${id}`, () => planUpdate(id, patch), options);
        },

        remove(id: LayerId, options: RunOptions = {}): Run<void> {
            return startEdit("remove", "remove", `Remove layer ${id}`, () => {
                const current = require(id);

                if (current.layer.locked) {
                    throw protectedLayer(current.layer, "removed");
                }

                const index = positionOf(id);
                const next = stack.filter((entry) => entry.layer.id !== id);

                return {
                    stack: next,
                    edits: [{ previous: current, next: null }],
                    fromIndex: index,
                    result: undefined,
                    layers: [id],
                    unresolvedPaths: NO_PATHS,
                };
            }, options);
        },

        move(id: LayerId, before: LayerId | null, options: RunOptions = {}): Run<void> {
            return startEdit("move", "move", `Move layer ${id}`, () => {
                const current = require(id);

                if (current.layer.locked) {
                    throw protectedLayer(current.layer, "moved");
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

                const from = positionOf(id);
                const without = stack.filter((entry) => entry.layer.id !== id);
                let to = without.length;

                if (before !== null) {
                    require(before);
                    to = without.findIndex((entry) => entry.layer.id === before);
                }

                const next = [...without];
                next.splice(to, 0, current);

                return {
                    stack: next,
                    edits: [{ previous: current, next: current }],
                    fromIndex: Math.min(from, to),
                    result: undefined,
                    layers: [id],
                    unresolvedPaths: NO_PATHS,
                };
            }, options);
        },

        removeBySource(predicate: (source: LayerSource) => boolean, options: RunOptions = {}): Run<readonly LayerId[]> {
            return startEdit<readonly LayerId[]>("sweep", "sweep", "Remove layers by source", () => {
                const doomed = stack.filter((entry) => !entry.layer.locked && predicate(entry.layer.source));
                const ids = doomed.map((entry) => entry.layer.id);
                const removing = new Set(ids);
                const next = stack.filter((entry) => !removing.has(entry.layer.id));
                const lowest = stack.findIndex((entry) => removing.has(entry.layer.id));

                return {
                    stack: next,
                    edits: doomed.map((entry) => ({ previous: entry, next: null })),
                    fromIndex: lowest === -1 ? next.length : lowest,
                    result: Object.freeze(ids),
                    layers: ids,
                    unresolvedPaths: NO_PATHS,
                };
            }, options);
        },

        encode(spec: EncodingSpec, options: RunOptions = {}): Run<Layer> {
            return startEdit<Layer>("encode", "add", `Encode ${spec.channel}`, () => {
                const planned = planEncoding(spec, requireRuns("encode"));
                const source = sourceOf(planned);
                const previous =
                    source.by === "run"
                        ? stack.find((entry) => isDerivedFor(entry.layer, source.runId, spec.channel))
                        : undefined;

                if (previous === undefined) {
                    return planInsert(planned, stack.length, mint(planned.name));
                }

                // The one place a locked layer is written rather than refused, and it is what the
                // replacement rule is for: the layer being taken over is the one the element
                // derived from this very run, and what replaces it says so in its source. A layer
                // somebody wrote by hand is never this layer -- `isDerivedFor` asks what the layer
                // paints, not what it is called.
                const { id } = previous.layer;
                const checked = check(planned, id);

                if (checked.layer === null) {
                    throw refusedSpec(planned.name, checked.result);
                }

                const index = positionOf(id);
                const next = [...stack];
                next[index] = checked.layer;

                return {
                    stack: next,
                    edits: [{ previous, next: checked.layer }],
                    fromIndex: index,
                    result: checked.layer.layer,
                    layers: [id],
                    unresolvedPaths: checked.result.unresolvedPaths,
                    reason: "update",
                };
            }, options);
        },

        highlight(spec: HighlightSpec, options: RunOptions = {}): Run<readonly Layer[]> {
            return startEdit<readonly Layer[]>("highlight", "add", "Highlight a result", () => {
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

                // One entry per half the run chose AND the style has something to say about, so a
                // route styled with an edge colour alone paints the route's edges and leaves its
                // nodes to the layers underneath.
                const painting = new Map<SelectorTarget, StaticStyle>();

                for (const half of HALVES) {
                    const set = chosen.some((entry) => entry.kind === half) ? halfOfStyle(spec.set, half) : null;

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
                const called = spec.name ?? run.label;
                const id = minter();
                const added: CompiledLayer[] = [];
                const unresolved = new Set<Path>();

                for (const [half, set] of painting) {
                    const layerSpec: LayerSpec = {
                        name: painting.size > 1 ? `${called} (${half}s)` : called,
                        target: half,
                        kind: "highlight",
                        // The membership column carries FALSE for the elements the run looked at
                        // and did not choose, so a presence test would paint the whole
                        // neighbourhood of a route in the colour of the route. The value is what
                        // says "chosen", so the value is what is asked about.
                        selector: { match: "expression", where: `${quotePath(path)} == \`true\`` },
                        set,
                        source: { by: "run", runId: run.id, algorithm: run.algorithm, params: run.params },
                    };
                    const checked = check(layerSpec, id(layerSpec.name));

                    if (checked.layer === null) {
                        throw refusedSpec(layerSpec.name, checked.result);
                    }

                    for (const unanswered of checked.result.unresolvedPaths) {
                        unresolved.add(unanswered);
                    }

                    added.push(checked.layer);
                }

                const doomed = stack.filter((entry) => !entry.layer.locked && entry.layer.kind === "highlight");
                const removing = new Set(doomed.map((entry) => entry.layer.id));
                const kept = stack.filter((entry) => !removing.has(entry.layer.id));
                const lowest = stack.findIndex((entry) => removing.has(entry.layer.id));
                const edits: LayerEdit[] = [
                    ...doomed.map((entry): LayerEdit => ({ previous: entry, next: null })),
                    ...added.map((entry): LayerEdit => ({ previous: null, next: entry })),
                ];

                return {
                    stack: [...kept, ...added],
                    edits,
                    fromIndex: lowest === -1 ? kept.length : Math.min(lowest, kept.length),
                    result: Object.freeze(added.map((entry) => entry.layer)),
                    layers: [...removing, ...added.map((entry) => entry.layer.id)],
                    unresolvedPaths: Object.freeze([...unresolved]),
                };
            }, options);
        },

        resolveToStatic(id: LayerId, channel: Channel, at?: ExplainTarget, options: RunOptions = {}): Run<Layer> {
            return startEdit<Layer>("resolve", "update", `Fix ${channel} on layer ${id}`, () => {
                // The value and the patch are worked out by the same reading that reported the
                // channel uneditable, and applied by the same update any other patch goes through.
                const resolution = resolveRule(id, channel, explainSources, at);

                return planUpdate(id, resolution.patch);
            }, options);
        },

        applyTemplate(document: StyleDocument, options: TemplateOptions = {}): Run<TemplateReport> {
            return startEdit<TemplateReport>("template", "add", "Apply a style document", () => {
                checkDocument(document);

                const id = minter();
                const imported: ImportedLayer[] = [];
                const unresolved = new Set<Path>();

                for (const spec of document.layers) {
                    const authored = stamped(spec, options.templateId);

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

                    const checked = check(authored, id(authored.name));

                    if (checked.layer === null) {
                        throw refusedSpec(authored.name, checked.result);
                    }

                    for (const unanswered of checked.result.unresolvedPaths) {
                        unresolved.add(unanswered);
                    }

                    imported.push({ spec: authored, compiled: checked.layer });
                }

                // Asked of the imported layers ALONE, so a layer that was already in the stack and
                // has been waiting for its run is not reported as this import's problem.
                const unbound = unboundLayers({
                    ...explainSources,
                    stack: () => imported.map((entry) => entry.compiled),
                });
                const disabled = new Set(unbound.map((entry) => entry.layerId));
                const final = imported.map((entry): CompiledLayer => {
                    if (!disabled.has(entry.compiled.layer.id)) {
                        return entry.compiled;
                    }

                    const off = check({ ...entry.spec, enabled: false }, entry.compiled.layer.id);

                    if (off.layer === null) {
                        throw refusedSpec(entry.spec.name, off.result);
                    }

                    return off.layer;
                });

                return {
                    stack: [...stack, ...final],
                    edits: final.map((entry): LayerEdit => ({ previous: null, next: entry })),
                    fromIndex: stack.length,
                    result: Object.freeze({
                        applied: Object.freeze(
                            final
                                .filter((entry) => !disabled.has(entry.layer.id))
                                .map((entry) => entry.layer.id),
                        ),
                        unbound,
                    }),
                    layers: final.map((entry) => entry.layer.id),
                    unresolvedPaths: Object.freeze([...unresolved]),
                };
            }, options);
        },

        legend(): readonly LegendBlock[] {
            return buildLegend(legendSources);
        },

        settled(): Promise<void> {
            // A stack with no queue behind it runs its edits inline, so there is never anything
            // in flight for a caller to wait on and "already settled" is the true answer.
            return sources.queue?.settled() ?? Promise.resolve();
        },

        explain(target: ExplainTarget): StyleExplanation {
            return explainStyle(target, explainSources);
        },

        toDocument(): StyleDocument {
            const layers = stack.filter((entry) => !entry.layer.locked).map((entry) => specOf(entry.layer));
            const carried = carriedPalettes(layers);

            return Object.freeze({
                version: DOCUMENT_VERSION,
                layers: Object.freeze(layers),
                // Written only when there is something to write, so a look that uses nothing but
                // the element's own palettes saves byte for byte what it saved before.
                ...(carried.length === 0 ? {} : { palettes: Object.freeze(carried) }),
            });
        },
    };
}
