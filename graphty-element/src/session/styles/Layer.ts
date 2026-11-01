/**
 * @file The layer model: what a style layer is, what has to be true before one is accepted, and
 * the seam a repaint plugs into.
 *
 * A LAYER IS ADDRESSED BY ID, NEVER BY ITS PLACE IN THE STACK. {@link Layer.id} is minted by the
 * element and never changes; it survives every insertion, removal and reordering around it.
 * Nothing in the element or outside it may derive a layer's identity from its index. The defect
 * this removes is concrete: index addressing forced the one consumer to keep an index
 * reconciliation module beside the element and to delete its layers highest-index-first, and one
 * off-by-one took the element's own base layer with it -- after which the next load died in mesh
 * building, with nothing to say what had happened.
 *
 * AN ID IS OPAQUE. It is built from the layer's name so that a log line and a saved document are
 * legible, but nothing reads meaning back out of it: renaming a layer does not change its id, and
 * two layers with the same name get different ids. Parsing an id is a bug.
 *
 * EVERY LAYER NAMES ITS SOURCE, and that is what makes an element-owned layer safe. The base and
 * selection layers carry `{ by: "element" }` and are {@link Layer.locked}; a consumer may not
 * remove, edit or reorder one. The consumer that exists today identifies them BY NAME instead,
 * and its own comment admits that a reader who calls their layer "default" loses the suppression.
 * A source field is what ends that, so `source` is REQUIRED on a layer even though it is optional
 * on the spec that authored one -- an unstated source means `{ by: "user" }` and nothing else.
 *
 * A LAYER IS CHECKED BEFORE IT IS ACCEPTED, AND THE CHECK WRITES NOTHING. {@link checkLayerSpec}
 * is the one door: it parses the selector, resolves every channel against the table the renderer
 * actually reads, resolves every scale against the session's registry, and reports what it could
 * not answer -- with a path into the spec and, for an expression, the character offset. It
 * reports EVERY problem it finds rather than the first, because it is what a form calls before a
 * person presses Apply, and a form that corrects one mistake per round trip is a form nobody
 * finishes.
 *
 * A PATH THAT NOTHING ANSWERS IS NOT AN ERROR. A selector naming a run that has not been started
 * parses perfectly and matches nothing, and an empty screen reads exactly like a correct answer
 * of zero. So it is reported separately, in {@link ValidationResult.unresolvedPaths}, and the
 * caller decides: a form says "0 would match -- results.louvain.group is not in this session", an
 * import disables the layer with that reason, and a consumer that knows the run is coming carries
 * on.
 *
 * THE REPAINT IS NOT HERE. This file defines {@link LayerRepaint} -- the one function the styles
 * API calls when the stack has changed -- and nothing that implements it. The request it is
 * handed carries what rule 4 of the design's cost contract needs and nothing more: which layers
 * changed, what each of them was and now is, the prospective stack, and the lowest position in
 * that stack whose answer can differ. Everything else is the repaint's own business.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { LABEL_LOOKS, labelLook } from "../../catalog/label-looks";
import { knownPaletteIds, paletteDescriptor } from "../../catalog/palettes";
import { shaderDescriptor, shaderIdsFor } from "../../catalog/shaderRegistry";
import {
    isClockBinding,
    isShaderId,
    isShaderParamName,
    SHADER_CLOCKS,
    type ShaderClockBinding,
    type ShaderDescriptor,
    type ShaderPlace,
    shaderPlaceProblem,
    type ShaderProblem,
} from "../../catalog/shaders";
import type {
    Binding,
    BindingOverflow,
    ChannelValue,
    CombineMode,
    Encoding,
    GraphtyErrorCode,
    LabelStyle,
    LayerId,
    LayerKind,
    LayerSource,
    LayerSpec,
    LayerUnmatchedGroup,
    Path,
    Rgba,
    StaticStyle,
} from "../../catalog/types";
import { MIN_DRAWN_FONT_SIZE } from "../../config/RichTextStyle";
import { isGraphtyError } from "../../errors";
import type { GraphtyWarningCode } from "../../errors/codes";
import { deepFreeze } from "../project/draft";
import type { RunProgressReport } from "../runs";
import { trimTrailingSeparators } from "../runs/runId";
import type { CodedFact } from "../shared";
import {
    type ChannelDescriptor,
    channelDescriptor,
    channelsFor,
    isEnumCount,
    labelFieldOf,
    modelBindingProblem,
    parseShaderParamAddress,
    toColorValue,
} from "./channels";
import { type RuleBinding, stopsProblem } from "./encoding";
import type { FileStyleOrigin } from "./fileStyles/origin";
import { parseTemplate, TEMPLATE_CHANNELS } from "./labelTemplate";
import { colorsProblem } from "./palettes";
import { columnsFor, type CompiledSelector, type SelectorSource, type SelectorTarget } from "./predicate";
import type { ScaleRegistry } from "./scales";
import { compileSelector, type Selector } from "./selector";

// ---------------------------------------------------------------------------------------------
// The layer
// ---------------------------------------------------------------------------------------------

/**
 * One layer of the style stack: what it paints, where it paints it, and who put it there.
 *
 * Data, not an object with behaviour. Everything that happens to a layer happens through the
 * styles API, so a layer handed to a consumer can be read, kept, diffed and serialised without
 * any of it being able to change the picture behind the element's back.
 */
export interface Layer {
    /**
     * The layer's identity: element-minted, stable for the life of the layer, and never an array
     * index. Opaque -- nothing reads meaning back out of it.
     */
    readonly id: LayerId;
    /** What a person calls it. Free text, and not an identity: two layers may share a name. */
    readonly name: string;
    /** What the layer is for, which is what a layer list groups and sorts on. */
    readonly kind: LayerKind;
    /**
     * Who put the layer in the stack.
     *
     * REQUIRED, unlike on the spec that authored it: a layer whose origin is unknown is a layer
     * nothing can sweep up, protect or explain. An unstated source on a spec means `{by:"user"}`.
     */
    readonly source: LayerSource;
    /**
     * Whether the layer belongs to the element rather than to the consumer.
     *
     * Exactly `source.by === "element"`, never set on its own. A locked layer cannot be removed,
     * edited or moved by a consumer; the way past one is to add a layer above it.
     */
    readonly locked: boolean;
    /** Whether the layer paints at all. A disabled layer keeps its place in the stack. */
    readonly enabled: boolean;
    /** Whether the layer paints nodes or edges. One layer never paints both. */
    readonly target: SelectorTarget;
    /** Which elements it paints. */
    readonly selector: Selector;
    /** The literal values it writes, when it writes any. */
    readonly set?: StaticStyle;
    /** The declarative value-to-channel bindings it writes, when it has any. */
    readonly encode?: Encoding;
    /**
     * What the last re-run of a run it reads could not match to its groups: see
     * {@link LayerUnmatchedGroup}. Absent when everything matched.
     */
    readonly unmatched?: readonly LayerUnmatchedGroup[];
    /**
     * The consumer's own bag, carried untouched.
     *
     * The element never reads it, copies it, validates it or freezes it: what was handed in is
     * the object handed back, and it survives every update that does not replace it. It exists
     * so that a consumer keeping per-layer state of its own -- which row is expanded, which
     * control is pinned, where the layer came from in its own model -- has a documented place to
     * keep it. Without one, every consumer invents a place, and that place is a name collision
     * with the next release.
     */
    readonly userData?: Record<string, unknown>;
    /**
     * The row this layer is a part of, when it is one part of a row that paints nodes and edges:
     * the id of the row's node part. Absent, the layer is a row of its own. See `styles.addRow`.
     */
    readonly row?: LayerId;
    /**
     * Present, and true, while the layer's row or a folder holding it is hidden
     * (`styles.hideRow`): the layer paints nothing, whatever `enabled` says, and paints again
     * when the row is shown. Absent while the row is shown.
     */
    readonly hidden?: true;
    /**
     * Where a layer made from a file's styles came from, read with `fileStyleOf(layer)`; absent
     * on every other layer. The element's own facts, kept apart from `userData` so a consumer's
     * bag is never shared with them. Never used to paint.
     */
    readonly fileStyle?: FileStyleOrigin;
}

/**
 * Where a layer goes when it is added, said as a neighbour rather than as a number.
 *
 * Exactly one of the two, or neither for the top of the stack. A position expressed as an index
 * is a position that goes wrong the moment anything else moves.
 */
export interface LayerPosition {
    /** Put the new layer immediately above this one. */
    readonly above?: LayerId;
    /** Put the new layer immediately below this one. */
    readonly below?: LayerId;
}

// ---------------------------------------------------------------------------------------------
// What a check answers with
// ---------------------------------------------------------------------------------------------

/**
 * One thing wrong with a layer specification.
 *
 * A code rather than a message is what a consumer switches on; the message is for the person who
 * typed the thing, and the `path` and `position` are what let an editor point at the character
 * rather than at the form.
 */
export interface LayerProblem {
    /** The machine-readable reason. */
    readonly code: GraphtyErrorCode;
    /** What is wrong, in a sentence. */
    readonly message: string;
    /** Where in the specification it is wrong, as a dotted path such as `set.node.color`. */
    readonly path?: string;
    /** The character offset inside an expression, when the problem is inside one. */
    readonly position?: number;
    /** The names that would have been right, nearest first. */
    readonly candidates?: readonly string[];
    /**
     * A refused shader use, as a code and its values: `shader.place-unsupported`
     * `{ shader, place, allowed }` or `shader.target-mismatch` `{ expected, found }`.
     * @since 3.36.0
     */
    readonly fact?: ShaderProblem;
}

/**
 * What checking a layer specification answered.
 *
 * There is deliberately no match count here. Counting what a selector matches is a pass over the
 * graph, which is the cost this whole design is arranged around; "how many would this match" is
 * `session.plan()`, which is a command and says so.
 */
export interface ValidationResult {
    /** Whether the specification can be added as it stands. */
    readonly ok: boolean;
    /** Everything wrong with it, all of it, so a form corrects a whole page in one round trip. */
    readonly errors: readonly LayerProblem[];
    /**
     * The paths that parsed but that nothing in this session answers.
     *
     * Not errors: a selector naming a run that has not been started yet is a correct selector
     * over a session that will answer it later. They are reported so that a consumer can say why
     * a layer paints nothing instead of showing a confident empty screen.
     */
    readonly unresolvedPaths: readonly Path[];
    /**
     * The bare `graphty.` paths read where the data also has a column of that name.
     *
     * Not errors: every path starting `graphty.` reads a value graphty-element provides, never a
     * column (`graphty.notes.count` is the note count). They are reported because the author may
     * have meant the column, which reads as `data.graphty.<name>`.
     */
    readonly shadowedPaths: readonly Path[];
    /**
     * What will paint nothing, or not as written, as codes. Not errors: the layer is still added.
     *
     * `W_UNKNOWN_ID`: a `{ match: "ids" }` selector names ids no element of the layer's target
     * answers to now, by either spelling of an integer id. `params.target` is `"node"` or
     * `"edge"`, `params.ids` those ids as the layer named them.
     *
     * `W_ALPHA_IGNORED`: a color with an alpha written to a channel that cannot draw it
     * translucent (`node.outline`), so it is drawn opaque. `params.channel` and `params.path`.
     *
     * `W_TEXT_TOO_SMALL`: a text size under 1 written to a label, tooltip or caption size, which
     * draws no text. `params.channel`, `params.path` and `params.value`.
     *
     * `W_LABEL_STYLE_BOUND`: a whole label style channel (`node.labelStyle`) bound to a path. No
     * scale produces a whole label style, so the binding paints nothing. `params.channel` is the
     * channel, `params.path` where in the specification (`encode.node.labelStyle`), and
     * `params.fieldChannels` the label field channels that can be bound instead
     * (`node.labelSize` ...), empty when the channel has none.
     *
     * New codes may be added in a minor release: word an unknown one generically.
     */
    readonly warnings: readonly CodedFact<GraphtyWarningCode>[];
}

/**
 * Whether this session answers a path, and what it would have answered instead.
 *
 * Optional everywhere it is accepted, and its absence means "this session cannot say". A session
 * with no directory reports NO unresolved path rather than reporting every path as unresolved:
 * claiming a path is wrong when nothing was asked would turn every correct layer into a warning.
 */
export interface PathDirectory {
    /**
     * Whether something in this session can answer a path for a kind of element.
     * @param path - The column path, such as `results.louvain.group`.
     * @param target - Whether the layer asking paints nodes or edges.
     * @returns True when the session holds a column for it.
     */
    answers(path: Path, target: SelectorTarget): boolean;
    /**
     * The nearest paths that would have been answered, for a "did you mean".
     * @param path - The path that was not answered.
     * @param target - Whether the layer asking paints nodes or edges.
     * @returns The nearest names, nearest first, or an empty list.
     */
    candidates?(path: Path, target: SelectorTarget): readonly Path[];
}

/** Everything {@link checkLayerSpec} reads beside the specification itself. */
export interface LayerCheckOptions {
    /** The id the layer would be given, so a compiled layer comes back ready to be stacked. */
    readonly id: LayerId;
    /** What the session can answer about one element, which is what a selector compiles against. */
    readonly elements: SelectorSource;
    /** The scales a binding may name. */
    readonly scales: ScaleRegistry;
    /** Which paths this session answers. Absent means it cannot say, and none are reported. */
    readonly paths?: PathDirectory;
    /**
     * A write door's check of a `{ match: "member" }` selector's scope: session edge ids to stable
     * members, set ids checked as issued. Absent, the scope is taken as given.
     * @param scope - The scope as given.
     * @returns The scope the layer holds.
     */
    readonly admitScope?: (scope: unknown) => unknown;
    /**
     * A `{ match: "rule" }` selector's rule as the layer stores it: every union leaf given its
     * branch and step ids and branch colors. Absent, the rule is stored as given.
     */
    readonly admitRule?: (rule: unknown) => unknown;
    /**
     * Whether the layer may write no channel: an edit asked to keep a layer whose last value it
     * takes away, which then stays in place painting nothing, as a starting row that writes
     * nothing does.
     */
    readonly mayBeEmpty?: boolean;
    /**
     * What a shader id the catalog does not list (or of the wrong kind) is: `"refuse"`, the
     * default, refuses the layer, as `styles.add` does; `"report"` accepts it, as a loaded style
     * document is, and `styles.counts` reports it as drawing nothing.
     */
    readonly shaders?: "refuse" | "report";
}

/**
 * What a check produced: the verdict, and the layer itself when there is one.
 *
 * The compiled layer comes back from the same call that checked it because compiling the selector
 * IS most of the check -- parsing it twice to answer the same question would be the cost this
 * file exists to avoid, paid for nothing.
 */
export interface LayerCheck {
    /** The verdict, which is what `styles.validate()` hands a consumer. */
    readonly result: ValidationResult;
    /** The layer, compiled and ready to stack, or null when the specification was refused. */
    readonly layer: CompiledLayer | null;
}

// ---------------------------------------------------------------------------------------------
// The seam the repaint plugs into
// ---------------------------------------------------------------------------------------------

/**
 * A layer with its selector already compiled: what a repaint reads, and the only form it reads.
 *
 * The predicate is built once, here, when the layer is added or updated. A repaint that compiled
 * a selector per element would reintroduce the 1,843 ns per call that the selector engine exists
 * to remove -- 92 ms of parsing for one layer at 50,000 nodes, against a 16 ms budget for a whole
 * single-layer edit.
 */
export interface CompiledLayer {
    /** The layer as a consumer sees it. */
    readonly layer: Layer;
    /** Its selector, reduced to a predicate and the columns that predicate reads. */
    readonly selector: CompiledSelector;
    /**
     * Every path the layer reads, its selector's and its bindings', without repeats: what a
     * change to a record's attributes has to name for the layer to paint anything differently.
     */
    readonly reads: readonly Path[];
}

/** Which edit asked for a repaint. */
export type RepaintReason = "add" | "update" | "remove" | "move" | "sweep";

/** One layer's before and after, which is what bounds the elements a repaint has to visit. */
export interface LayerEdit {
    /** The layer as it was, or null when it is being added. */
    readonly previous: CompiledLayer | null;
    /** The layer as it will be, or null when it is being removed. */
    readonly next: CompiledLayer | null;
}

/**
 * What one edit asks a repaint to do.
 *
 * Plain data, deliberately: it can be logged, asserted on in a test and compared between two
 * runs without a live handle in it. The handles are in {@link RepaintContext}.
 *
 * The dirty set follows from the three fields together, and the repaint is what works it out: the
 * elements `next` matches, unioned with those `previous` matched, painted by the layers of
 * `stack` from `fromIndex` upwards. A layer that matches nothing repaints nothing, and an edit
 * near the top of the stack repaints fewer layers than one near the bottom.
 */
export interface RepaintRequest {
    /** Which edit this is. */
    readonly reason: RepaintReason;
    /** What changed. One entry for every verb but the sweep, which may carry several. */
    readonly edits: readonly LayerEdit[];
    /** The stack as it will stand once this edit is committed, index 0 the BOTTOM. */
    readonly stack: readonly CompiledLayer[];
    /**
     * The lowest position in `stack` whose painted answer can differ.
     *
     * Layers below it are untouched by this edit and must not be visited: they painted what they
     * painted, and nothing above a layer changes what that layer said.
     */
    readonly fromIndex: number;
}

/** The live handles a repaint needs, kept out of the request so the request stays plain data. */
export interface RepaintContext {
    /** Aborted when the edit is cancelled. Stop and throw; do not finish quietly. */
    readonly signal: AbortSignal;
    /**
     * Report how far along the pass is, so a large graph shows progress rather than a freeze.
     * @param progress - What changed.
     */
    report(progress: RunProgressReport): void;
}

/** How much a repaint actually painted, which is what the change announcement carries. */
export interface RepaintReport {
    /** How many nodes were repainted. */
    readonly nodes: number;
    /** How many edges were repainted. */
    readonly edges: number;
}

/**
 * The one function the styles API calls when the stack has changed.
 *
 * THIS IS THE SEAM, and nothing in this module implements it. A session with no renderer bound
 * hands none in, and that is not a degraded mode: the stack is the session's, the paint is the
 * renderer's, and a headless session legitimately has nothing to paint. What the styles API
 * guarantees is the order -- a repaint is awaited BEFORE the new stack is committed, so a
 * cancelled or failed repaint leaves the model exactly as it was rather than leaving the list
 * saying one thing and the screen showing another.
 * @param request - What changed, and what to paint from.
 * @param context - The signal to stop on, and where to report progress.
 * @returns How much was painted.
 */
export type LayerRepaint = (request: RepaintRequest, context: RepaintContext) => Promise<RepaintReport>;

// ---------------------------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------------------------

/** What an id is built from when the layer's name reduces to nothing usable. */
const ID_FALLBACK = "layer";

/** The path prefix a run's published result sits under, which is what makes an encoding run-bound. */
const RUN_PATH_PREFIX = "results.";

/** The overflow policies a binding may name. */
const OVERFLOW_POLICIES: readonly BindingOverflow[] = Object.freeze(["other", "shape", "pattern", "extend"]);

/** The source a specification that named none is given. */
const USER_SOURCE: LayerSource = Object.freeze({ by: "user" });

/** No paths went unanswered. */
const NO_PATHS: readonly Path[] = Object.freeze([]);

/** Nothing was wrong. */
const NO_PROBLEMS: readonly LayerProblem[] = Object.freeze([]);

/** Nothing to warn about. */
const NO_WARNINGS: readonly CodedFact<GraphtyWarningCode>[] = Object.freeze([]);

/**
 * The warnings a layer's selector earns: the ids an `ids` selector names that nothing answers to.
 * @param spec - The specification.
 * @param target - The layer's target, or null when it could not be settled.
 * @param elements - Where an id is looked up.
 * @returns The warnings; none when the session cannot look an id up.
 */
function selectorWarnings(
    spec: LayerSpec,
    target: SelectorTarget | null,
    elements: SelectorSource,
): readonly CodedFact<GraphtyWarningCode>[] {
    const selector = spec.selector as { match?: unknown; nodes?: unknown; edges?: unknown } | null | undefined;
    if (target === null || selector?.match !== "ids") {
        return NO_WARNINGS;
    }

    const named = (target === "node" ? selector.nodes : selector.edges) as readonly (string | number)[] | undefined;
    const { indexOf } = columnsFor(elements, target);
    if (named === undefined || indexOf === null) {
        return NO_WARNINGS;
    }

    const unknown = named.filter((id) => indexOf(id) === undefined);

    return unknown.length === 0
        ? NO_WARNINGS
        : Object.freeze([
              Object.freeze({ code: "W_UNKNOWN_ID" as const, params: Object.freeze({ target, ids: unknown }) }),
          ]);
}

/** The color channels that draw a color opaque whatever its alpha. See `NodeEffects.applyOutlineEffect`. */
const OPAQUE_COLOR_CHANNELS: readonly string[] = ["node.outline"];

/**
 * The warnings a layer's literal colors earn: an alpha written to a channel that cannot draw it.
 *
 * Every other color channel multiplies a color's alpha into its opacity (issue #2071); an
 * outline cannot be drawn translucent, so its alpha is dropped and this says so.
 * @param spec - The specification.
 * @returns The warnings; none when every literal color can be drawn as written.
 */
function alphaWarnings(spec: LayerSpec): readonly CodedFact<GraphtyWarningCode>[] {
    return OPAQUE_COLOR_CHANNELS.filter((channel) => {
        const color = toColorValue(asColorInput(spec.set?.[channel as keyof typeof spec.set]));

        return color !== null && color.a < 1;
    }).map((channel) =>
        Object.freeze({ code: "W_ALPHA_IGNORED" as const, params: Object.freeze({ channel, path: `set.${channel}` }) }),
    );
}

/** The text size channels: each draws no text under {@link MIN_DRAWN_FONT_SIZE}. */
const TEXT_SIZE_CHANNELS: readonly string[] = [
    "node.labelSize",
    "node.tooltipSize",
    "edge.labelSize",
    "edge.arrowHeadTextSize",
    "edge.arrowTailTextSize",
];

/**
 * The warnings a layer's literal text sizes earn: a size under 1 draws no text.
 * @param spec - The specification.
 * @returns The warnings; none when every literal size draws.
 */
function textSizeWarnings(spec: LayerSpec): readonly CodedFact<GraphtyWarningCode>[] {
    return TEXT_SIZE_CHANNELS.flatMap((channel) => {
        const value = spec.set?.[channel as keyof typeof spec.set];

        return typeof value === "number" && value < MIN_DRAWN_FONT_SIZE
            ? [
                  Object.freeze({
                      code: "W_TEXT_TOO_SMALL" as const,
                      params: Object.freeze({ channel, path: `set.${channel}`, value }),
                  }),
              ]
            : [];
    });
}

/**
 * Mint the id a new layer will carry.
 *
 * The name is reduced to the same character class a run id uses so that an id stays legible in a
 * log line, a saved document and an export filename, and a counter is appended until the id is
 * free. Nothing reads the name back out: renaming the layer later does not change its id, and
 * that is the point.
 * @param name - What the layer is called.
 * @param taken - The ids already in use in this session.
 * @returns An id that is not one of `taken`.
 */
export function mintLayerId(name: string, taken: ReadonlySet<LayerId>): LayerId {
    const slug = name
        .toLowerCase()
        .replaceAll(/[^a-z0-9_-]+/g, "-")
        .replace(/^[^a-z]+/, "");
    const base = trimTrailingSeparators(slug) || ID_FALLBACK;

    let suffix = 1;
    let id = `${base}_${String(suffix)}`;

    while (taken.has(id)) {
        suffix++;
        id = `${base}_${String(suffix)}`;
    }

    return id;
}

// ---------------------------------------------------------------------------------------------
// Reading a specification
// ---------------------------------------------------------------------------------------------

/**
 * The source a specification names, or the one an unstated source means.
 * @param spec - The specification.
 * @returns The source. Never undefined: a layer whose origin is unknown is unsweepable.
 */
export function sourceOf(spec: LayerSpec): LayerSource {
    return spec.source ?? USER_SOURCE;
}

/**
 * Whether a source is the element's own, which is what makes a layer locked.
 * @param source - The source to test.
 * @returns True when the element owns the layer.
 */
export function isElementSource(source: LayerSource): boolean {
    return source.by === "element";
}

/**
 * Which target a channel name belongs to, read from the name rather than from the table.
 *
 * Used only to guess a layer's target before the table has been consulted, so that a misspelled
 * channel still lands in the right half of the form. The table is what decides.
 * @param channel - The channel name, which may not be a channel at all.
 * @returns The target, or null when the name names neither.
 */
function targetOfChannelName(channel: string): SelectorTarget | null {
    if (channel.startsWith("node.")) {
        return "node";
    }

    return channel.startsWith("edge.") ? "edge" : null;
}

/**
 * Every channel a specification writes, literal and encoded together, without repeats.
 * @param spec - The specification.
 * @returns The channel names, in the order the specification names them.
 */
function channelsWritten(spec: LayerSpec): readonly string[] {
    const seen = new Set<string>();

    for (const channel of Object.keys(spec.set ?? {})) {
        seen.add(channel);
    }

    for (const channel of Object.keys(spec.encode ?? {})) {
        seen.add(channel);
    }

    return [...seen];
}

/**
 * A colour value as {@link toColorValue} takes one, or null when the value is not a colour at all.
 * @param value - Whatever the specification carried.
 * @returns The string or components, or null.
 */
function asColorInput(value: unknown): Rgba | string | null {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value !== "object" || value === null) {
        return null;
    }

    const candidate = value as Partial<Rgba>;
    const components = [candidate.r, candidate.g, candidate.b, candidate.a];

    return components.every((component) => typeof component === "number") ? (value as Rgba) : null;
}

// ---------------------------------------------------------------------------------------------
// Checking a specification
// ---------------------------------------------------------------------------------------------

/** A problem list being built up, with the helpers every check writes into it through. */
interface ProblemLog {
    /** The problems so far, in the order they were found. */
    readonly problems: LayerProblem[];
    /** The warnings so far, in the order they were found. */
    readonly warnings: CodedFact<GraphtyWarningCode>[];
    /** The paths the specification reads, in the order it names them, without repeats. */
    readonly paths: Path[];
}

/**
 * Add a problem to the log.
 * @param log - Where problems are collected.
 * @param problem - What is wrong.
 */
function report(log: ProblemLog, problem: LayerProblem): void {
    log.problems.push(problem);
}

/**
 * Record a path the specification reads, so it can be resolved once at the end.
 * @param log - Where paths are collected.
 * @param path - The path.
 */
function readsPath(log: ProblemLog, path: Path): void {
    if (path !== "" && !log.paths.includes(path)) {
        log.paths.push(path);
    }
}

/**
 * Turn a thrown refusal into a problem a form can point at.
 * @param error - What was thrown.
 * @param path - Where in the specification the refusal came from.
 * @returns The problem.
 */
function problemFrom(error: unknown, path: string): LayerProblem {
    if (!isGraphtyError(error)) {
        return {
            code: "E_BAD_LAYER",
            message: error instanceof Error ? error.message : String(error),
            path,
        };
    }

    const { position } = error.details;

    return {
        code: error.code,
        message: error.message,
        path,
        ...(typeof position === "number" ? { position } : {}),
    };
}

/**
 * Check one literal value against what its channel actually accepts.
 * @param descriptor - The channel, as the renderer describes it.
 * @param value - The value the specification carried.
 * @param path - Where in the specification the value sits.
 * @returns The problem, or null when the value is one the channel takes.
 */
function checkStaticValue(descriptor: ChannelDescriptor, value: ChannelValue, path: string): LayerProblem | null {
    // An effect's off value is a value of the channel, whatever kind it otherwise takes.
    if (descriptor.off !== undefined && value === descriptor.off) {
        return null;
    }

    switch (descriptor.accepts) {
        case "color":
            return toColorValue(asColorInput(value)) === null
                ? {
                      code: "E_BAD_LAYER",
                      message: `${descriptor.plainName} takes a colour, such as "#ff9900" or "orange".`,
                      path,
                  }
                : null;
        case "number":
            return checkNumber(descriptor, value, path);
        case "text":
            return typeof value === "string"
                ? null
                : { code: "E_BAD_LAYER", message: `${descriptor.plainName} takes text.`, path };
        case "boolean":
            return typeof value === "boolean"
                ? null
                : { code: "E_BAD_LAYER", message: `${descriptor.plainName} is on or off.`, path };
        case "enum":
            return checkEnum(descriptor, value, path);
        case "labelStyle":
            return checkLabelStyle(descriptor, value, path);
        default:
            return {
                code: "E_UNSUPPORTED",
                message: `${descriptor.plainName} accepts no value: ${descriptor.caveat ?? "the element draws nothing for it."}`,
                path,
            };
    }
}

/**
 * Check a label style: an object, naming no look the catalog lacks.
 * @param descriptor - The channel.
 * @param value - The value.
 * @param path - Where it sits in the specification.
 * @returns The problem, or null.
 */
function checkLabelStyle(descriptor: ChannelDescriptor, value: ChannelValue, path: string): LayerProblem | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return {
            code: "E_BAD_LAYER",
            message: `${descriptor.plainName} takes a label style, such as { sizePx: 14, weight: "bold" }.`,
            path,
        };
    }

    const { look } = value as LabelStyle;

    if (look === undefined || labelLook(look) !== undefined) {
        return null;
    }

    const candidates = LABEL_LOOKS.map((entry) => entry.id);

    return {
        code: "E_OPTION_RANGE",
        message: `${descriptor.plainName} names no look "${look}"; the looks are ${candidates.join(", ")}.`,
        path: `${path}.look`,
        candidates,
    };
}

/**
 * Check a number against the range the renderer actually draws.
 * @param descriptor - The channel.
 * @param value - The value.
 * @param path - Where it sits in the specification.
 * @returns The problem, or null.
 */
function checkNumber(descriptor: ChannelDescriptor, value: ChannelValue, path: string): LayerProblem | null {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return { code: "E_BAD_LAYER", message: `${descriptor.plainName} takes a number.`, path };
    }

    const { min, max } = descriptor;
    const belowFloor = min !== undefined && value < min;
    const aboveCeiling = max !== undefined && value > max;

    if (!belowFloor && !aboveCeiling) {
        return null;
    }

    const bounds = `${min === undefined ? "any" : String(min)} to ${max === undefined ? "any" : String(max)}`;

    return {
        code: "E_OPTION_RANGE",
        message: `${descriptor.plainName} is drawn from ${bounds}, and ${String(value)} is outside that.`,
        path,
    };
}

/**
 * Check a value against the list its channel enumerates.
 * @param descriptor - The channel.
 * @param value - The value.
 * @param path - Where it sits in the specification.
 * @returns The problem, or null.
 */
function checkEnum(descriptor: ChannelDescriptor, value: ChannelValue, path: string): LayerProblem | null {
    const values = descriptor.values ?? [];

    // A boolean is read by its name, for a channel such as `node.modelTint` that takes true,
    // false or a word.
    if ((typeof value === "string" || typeof value === "boolean") && values.includes(String(value))) {
        return null;
    }

    // An enum with a `min` also takes a whole number from there up (a segment count).
    if (isEnumCount(descriptor, value)) {
        return null;
    }

    return {
        code: "E_OPTION_RANGE",
        message: `${descriptor.plainName} takes one of ${values.join(", ")}.`,
        path,
        candidates: values,
    };
}

/**
 * Check one channel name, whatever it was written on.
 * @param channel - The name the specification used.
 * @param target - The layer's target, or null when it could not be settled.
 * @param path - Where in the specification the channel sits.
 * @param log - Where problems are collected.
 * @returns The descriptor when the channel is usable here, otherwise null.
 */
function checkChannel(
    channel: string,
    target: SelectorTarget | null,
    path: string,
    log: ProblemLog,
): ChannelDescriptor | null {
    const descriptor = channelDescriptor(channel);

    if (descriptor === undefined) {
        const available = (
            target === null ? [...channelsFor("node"), ...channelsFor("edge")] : channelsFor(target)
        ).map((entry) => entry.channel);

        report(log, {
            code: "E_UNKNOWN_CHANNEL",
            message: `There is no channel called "${channel}".`,
            path,
            candidates: available,
        });

        return null;
    }

    if (target !== null && descriptor.target !== target) {
        report(log, {
            code: "E_BAD_LAYER",
            message: `${descriptor.channel} paints ${descriptor.target}s, and this layer paints ${target}s. One layer paints one kind of element.`,
            path,
        });

        return null;
    }

    if (!descriptor.renderable) {
        report(log, {
            code: "E_UNSUPPORTED",
            message: `The element draws nothing for ${descriptor.channel}: ${descriptor.caveat ?? "no renderer reads it."}`,
            path,
        });

        return null;
    }

    return descriptor;
}

/** The combine modes a binding may name. */
const COMBINE_MODES: readonly CombineMode[] = ["replace", "multiply", "add"];

/**
 * Check a binding's combine mode: one of the three, and only "replace" on a channel that is not a
 * number, since only numbers multiply or add.
 * @param descriptor - The channel it writes.
 * @param binding - The binding.
 * @param path - Where in the specification it sits.
 * @param log - Where problems are collected.
 */
function checkCombine(descriptor: ChannelDescriptor, binding: Binding, path: string, log: ProblemLog): void {
    const combine = "combine" in binding ? binding.combine : undefined;

    if (combine === undefined || combine === "replace") {
        return;
    }

    if (!COMBINE_MODES.includes(combine)) {
        report(log, {
            code: "E_BAD_LAYER",
            message: `"${combine}" is not a combine mode.`,
            path: `${path}.combine`,
            candidates: COMBINE_MODES,
        });
    } else if (descriptor.accepts !== "number") {
        report(log, {
            code: "E_BAD_LAYER",
            message: `${descriptor.channel} is not a number, so it can only replace what lies beneath.`,
            path: `${path}.combine`,
            candidates: ["replace"],
        });
    }
}

/**
 * Check a template binding: a text channel, and lines whose placeholders parse.
 * @param descriptor - The channel it writes.
 * @param template - The lines, as authored.
 * @param path - Where in the specification it sits.
 * @param log - Where problems and paths are collected.
 */
function checkTemplate(descriptor: ChannelDescriptor, template: unknown, path: string, log: ProblemLog): void {
    if (!TEMPLATE_CHANNELS.includes(descriptor.channel)) {
        report(log, {
            code: "E_BAD_LAYER",
            message: `${descriptor.plainName} is not text, so it cannot be built from a template.`,
            path,
            candidates: TEMPLATE_CHANNELS,
        });

        return;
    }

    try {
        for (const read of parseTemplate(template).paths) {
            readsPath(log, read);
        }
    } catch (thrown) {
        report(log, problemFrom(thrown, path));
    }
}

/**
 * Check a binding's overflow policy.
 * @param descriptor - The channel it writes.
 * @param overflow - The policy, as authored.
 * @param path - Where the binding sits in the specification.
 * @param log - Where problems are collected.
 */
function checkOverflow(
    descriptor: ChannelDescriptor,
    overflow: BindingOverflow | undefined,
    path: string,
    log: ProblemLog,
): void {
    if (overflow !== undefined && !OVERFLOW_POLICIES.includes(overflow)) {
        report(log, {
            code: "E_BAD_LAYER",
            message: `"${overflow}" is not an overflow policy.`,
            path: `${path}.overflow`,
            candidates: OVERFLOW_POLICIES,
        });
    } else if (overflow === "shape" && descriptor.target === "edge") {
        report(log, {
            code: "E_BAD_LAYER",
            message: `overflow "shape" draws the groups past the palette in other node shapes, and an edge has no shape, so ${descriptor.channel} cannot use it. Use "other" or "extend".`,
            path: `${path}.overflow`,
            candidates: ["pattern", "other", "extend"],
        });
    } else if (overflow === "pattern" && descriptor.target === "node") {
        report(log, {
            code: "E_BAD_LAYER",
            message: `overflow "pattern" draws the groups past the palette in other edge line patterns, and a node has no line, so ${descriptor.channel} cannot use it. Use "shape", "other" or "extend".`,
            path: `${path}.overflow`,
            candidates: ["shape", "other", "extend"],
        });
    }
}

/**
 * Check a binding's list of values not to paint.
 * @param hidden - The list, as authored.
 * @param path - Where the binding sits in the specification.
 * @param log - Where problems are collected.
 */
function checkHidden(hidden: unknown, path: string, log: ProblemLog): void {
    if (
        hidden !== undefined &&
        (!Array.isArray(hidden) || !hidden.every((value) => ["string", "number", "boolean"].includes(typeof value)))
    ) {
        report(log, {
            code: "E_BAD_LAYER",
            message: "hidden lists the values not to paint, such as [0, 3]: strings, numbers or booleans.",
            path: `${path}.hidden`,
        });
    }
}

/**
 * Check one encoded binding.
 * @param descriptor - The channel it writes.
 * @param binding - The binding.
 * @param path - Where in the specification it sits.
 * @param options - The scales a binding may name.
 * @param universal - Whether the layer's selector matches everything.
 * @param log - Where problems and paths are collected.
 */
function checkBinding(
    descriptor: ChannelDescriptor,
    binding: Binding,
    path: string,
    options: LayerCheckOptions,
    universal: boolean,
    log: ProblemLog,
): void {
    if ("template" in binding) {
        checkTemplate(descriptor, binding.template, `${path}.template`, log);

        return;
    }

    checkCombine(descriptor, binding, path, log);

    if (!("by" in binding)) {
        if (descriptor.accepts === "number" && (binding.combine === "multiply" || binding.combine === "add")) {
            if (typeof binding.value !== "number" || !Number.isFinite(binding.value)) {
                report(log, {
                    code: "E_BAD_LAYER",
                    message: `${descriptor.plainName} is multiplied or added by a number.`,
                    path: `${path}.value`,
                });
            }

            return;
        }

        const problem = checkStaticValue(descriptor, binding.value, `${path}.value`);

        if (problem !== null) {
            report(log, problem);
        }

        return;
    }

    if (descriptor.accepts === "labelStyle") {
        warnLabelStyleBound(descriptor, path, log);
    }

    if (typeof binding.by !== "string" || binding.by.trim() === "") {
        report(log, {
            code: "E_BAD_LAYER",
            message: `${descriptor.plainName} is encoded from a path, such as "results.betweenness.score".`,
            path: `${path}.by`,
        });

        return;
    }

    readsPath(log, binding.by);
    checkBindingOptions(descriptor, binding, path, options, log);

    // Only a binding that paints a MISSING value reaches an element the run never measured: an
    // element with no value is otherwise not painted at all (encoding.ts), so a layer matching
    // everything already paints just the measured ones, and refusing it only turned a fitting
    // field into a failed edit.
    if (universal && binding.by.startsWith(RUN_PATH_PREFIX) && typeof binding.missing === "object") {
        report(log, {
            code: "E_UNSCOPED_RUN_ENCODING",
            message:
                `This layer paints every ${descriptor.target} and encodes ${descriptor.channel} from "${binding.by}" ` +
                "with a value for a missing result, which would paint elements the run never measured. Scope it to " +
                `the elements that carry the result with { match: "has", path: "${binding.by}" }, or drop missing.`,
            path: "selector",
        });
    }
}

/**
 * Reports a binding of a whole label style channel. Accepted, because refusing would reject stacks that load today,
 * saved projects among them; reported, because no scale produces a whole label style, so it paints nothing.
 * @param descriptor - The channel.
 * @param path - Where in the specification the binding sits.
 * @param log - Where warnings are collected.
 */
function warnLabelStyleBound(descriptor: ChannelDescriptor, path: string, log: ProblemLog): void {
    log.warnings.push({
        code: "W_LABEL_STYLE_BOUND",
        params: {
            channel: descriptor.channel,
            path,
            fieldChannels: channelsFor(descriptor.target)
                .map((entry) => entry.channel)
                .filter((channel) => labelFieldOf(channel)?.into === descriptor.channel),
        },
    });
}

/**
 * Check what a binding says besides its path: its scale, palette, overflow, unmapped values, stops and hidden values.
 * @param descriptor - The channel it writes.
 * @param binding - The binding.
 * @param path - Where in the specification it sits.
 * @param options - The scales a binding may name.
 * @param log - Where problems are collected.
 */
function checkBindingOptions(
    descriptor: ChannelDescriptor,
    binding: RuleBinding,
    path: string,
    options: LayerCheckOptions,
    log: ProblemLog,
): void {
    if (binding.scale !== undefined && options.scales.get(binding.scale) === undefined) {
        report(log, {
            code: "E_UNKNOWN_SCALE",
            message: `There is no scale called "${binding.scale}".`,
            path: `${path}.scale`,
            candidates: options.scales.names(),
        });
    }

    /* A PALETTE IS CHECKED HERE, WHERE THE SCALE IS, AND FOR THE SAME REASON. Without this a
       layer naming a palette nothing registered was accepted at the edit, written onto the layer,
       and then failed one repaint later as a layer that paints nothing -- with the failure
       arriving somewhere a settings form is not listening. The list of candidates is read from
       the catalogue, so a reader who registered their own palette and mistyped it is shown their
       own palette among the near misses rather than only the element's seventeen. */
    if (binding.palette !== undefined && paletteDescriptor(binding.palette) === undefined) {
        report(log, {
            code: "E_UNKNOWN_PALETTE",
            message: `There is no palette called "${binding.palette}".`,
            path: `${path}.palette`,
            candidates: knownPaletteIds(),
        });
    }

    if (binding.colors !== undefined) {
        const problem =
            binding.palette === undefined
                ? colorsProblem(binding.colors)
                : "A binding names a palette or carries its own colors, not both.";
        if (problem !== null) {
            report(log, { code: "E_BAD_LAYER", message: problem, path: `${path}.colors` });
        }
    }

    checkOverflow(descriptor, binding.overflow, path, log);

    if (binding.unmapped !== undefined && binding.unmapped !== "skip") {
        report(log, {
            code: "E_BAD_LAYER",
            message: `"${String(binding.unmapped)}" is not what an unmapped value does.`,
            path: `${path}.unmapped`,
            candidates: ["skip"],
        });
    }

    const stops = binding.stops === undefined ? null : stopsProblem(descriptor, binding);
    if (stops !== null) {
        report(log, { code: "E_BAD_LAYER", message: stops, path: `${path}.stops` });
    }

    checkHidden(binding.hidden, path, log);
}

/**
 * Work out whether a layer paints nodes or edges.
 * @param spec - The specification.
 * @param channels - The channels it writes.
 * @param log - Where problems are collected.
 * @returns The target, or null when the specification does not settle it.
 */
function resolveTarget(spec: LayerSpec, channels: readonly string[], log: ProblemLog): SelectorTarget | null {
    if (spec.target === "node" || spec.target === "edge") {
        return spec.target;
    }

    if (spec.target !== undefined) {
        report(log, {
            code: "E_BAD_LAYER",
            message: 'A layer paints "node" or "edge".',
            path: "target",
        });

        return null;
    }

    const targets = new Set(
        channels.map(targetOfChannelName).filter((entry): entry is SelectorTarget => entry !== null),
    );

    if (targets.size === 1) {
        return [...targets][0] ?? null;
    }

    if (targets.size > 1) {
        report(log, {
            code: "E_BAD_LAYER",
            message: "A layer paints nodes or edges, not both. Name the target and split the layer in two.",
            path: "target",
        });
    }

    return null;
}

/**
 * Check the parts of a specification that are neither channels nor a selector.
 * @param spec - The specification.
 * @param channels - The channels it writes.
 * @param log - Where problems are collected.
 * @param mayBeEmpty - Whether it may write no channel.
 */
function checkShape(spec: LayerSpec, channels: readonly string[], log: ProblemLog, mayBeEmpty = false): void {
    if (typeof spec.name !== "string" || spec.name.trim() === "") {
        report(log, {
            code: "E_BAD_LAYER",
            message: "A layer needs a name, which is what a layer list shows and what an id is built from.",
            path: "name",
        });
    }

    if (spec.kind !== undefined && !["base", "encoding", "highlight", "custom"].includes(spec.kind)) {
        report(log, {
            code: "E_BAD_LAYER",
            message: `"${spec.kind}" is not a layer kind.`,
            path: "kind",
            candidates: ["base", "encoding", "highlight", "custom"],
        });
    }

    // A starting row (Everything, Hovered) is there to be written into, so it may start empty, and
    // so may a part of a row, which a row write adds empty when it changes what the row paints.
    const starting = spec.source?.by === "template" && spec.source.templateId.startsWith("graphty:starting-");
    if (channels.length === 0 && !starting && spec.row === undefined && !mayBeEmpty) {
        report(log, {
            code: "E_BAD_LAYER",
            message: "A layer with neither a set nor an encode writes no channel and would paint nothing.",
            path: "set",
        });
    }

    for (const channel of Object.keys(spec.set ?? {})) {
        if (channel in (spec.encode ?? {})) {
            report(log, {
                code: "E_BAD_LAYER",
                message: `${channel} is written twice, once as a literal and once as an encoding. One layer writes a channel one way.`,
                path: `encode.${channel}`,
            });
        }
    }
}

/**
 * Compile the selector, collecting what it reads and whatever it refuses.
 * @param spec - The specification.
 * @param target - The layer's target, or null when it could not be settled.
 * @param options - What the selector compiles against.
 * @param log - Where problems and paths are collected.
 * @returns The compiled selector, or null when it was refused.
 */
function checkSelector(
    spec: LayerSpec,
    target: SelectorTarget | null,
    options: LayerCheckOptions,
    log: ProblemLog,
): CompiledSelector | null {
    try {
        // A selector's parse errors do not depend on which kind of element it speaks about, so an
        // unsettled target is compiled as a node selector to get the rest of the report out. The
        // layer itself is refused either way, because `target` is what decides what it paints.
        const compiled = compileSelector(spec.selector, target ?? "node", options.elements);

        for (const path of compiled.paths) {
            readsPath(log, path);
        }

        return compiled;
    } catch (error) {
        report(log, problemFrom(error, "selector"));

        return null;
    }
}

/**
 * The specification with a `{ match: "member" }` selector's scope admitted, so the layer holds,
 * lists and persists the stable form. A refusal is reported like any selector problem.
 * @param spec - The specification as given.
 * @param options - Where the admission is.
 * @param log - Where a refusal is collected.
 * @returns The specification to check and build from.
 */
function admitSelectorScope(spec: LayerSpec, options: LayerCheckOptions, log: ProblemLog): LayerSpec {
    const selector = spec.selector as { match?: unknown; of?: unknown; where?: unknown } | undefined;
    if (options.admitRule !== undefined && typeof selector === "object" && selector?.match === "rule") {
        try {
            const where = options.admitRule(selector.where);
            return where === selector.where ? spec : ({ ...spec, selector: { ...selector, where } } as LayerSpec);
        } catch (error) {
            report(log, problemFrom(error, "selector"));

            return spec;
        }
    }

    if (options.admitScope === undefined || typeof selector !== "object" || selector?.match !== "member") {
        return spec;
    }

    try {
        const of = options.admitScope(selector.of);
        return of === selector.of ? spec : ({ ...spec, selector: { ...selector, of } } as LayerSpec);
    } catch (error) {
        report(log, problemFrom(error, "selector"));

        return spec;
    }
}

/**
 * Check one channel the specification sets: its name, then its value -- a shader value or a
 * static one.
 * @param channel - The channel's name.
 * @param value - The value it is set to.
 * @param target - The layer's target, or null when it could not be settled.
 * @param catalog - Whether shader ids are checked against the catalog.
 * @param log - Where problems and paths are collected.
 */
function checkSetChannel(
    channel: string,
    value: ChannelValue | undefined,
    target: SelectorTarget | null,
    catalog: boolean,
    log: ProblemLog,
): void {
    const path = `set.${channel}`;
    const descriptor = checkChannel(channel, target, path, log);

    if (descriptor?.shaderTarget !== undefined && value !== undefined) {
        checkShaderValue(descriptor, value, path, catalog, log);
    } else if (descriptor !== null && value !== undefined) {
        const problem = checkStaticValue(descriptor, value, path);

        if (problem !== null) {
            report(log, problem);
        }
    }
}

/**
 * Report a binding `node.model` or `node.texture` cannot take.
 * @param descriptor - The channel's descriptor.
 * @param binding - The binding.
 * @param path - Where the binding sits in the specification.
 * @param log - Where problems are collected.
 */
function checkModelBinding(descriptor: ChannelDescriptor, binding: Binding, path: string, log: ProblemLog): void {
    if (descriptor.channel !== "node.model" && descriptor.channel !== "node.texture") {
        return;
    }

    const blocked = modelBindingProblem(binding, path);
    if (blocked !== null) {
        report(log, blocked);
    }
}

/**
 * Check every channel the specification writes.
 * @param spec - The specification.
 * @param target - The layer's target, or null when it could not be settled.
 * @param universal - Whether the selector matches everything.
 * @param options - The scales a binding may name.
 * @param log - Where problems and paths are collected.
 */
function checkChannels(
    spec: LayerSpec,
    target: SelectorTarget | null,
    universal: boolean,
    options: LayerCheckOptions,
    log: ProblemLog,
): void {
    const catalog = options.shaders !== "report";
    for (const [channel, value] of Object.entries(spec.set ?? {})) {
        checkSetChannel(channel, value, target, catalog, log);
    }

    for (const [channel, binding] of Object.entries(spec.encode ?? {})) {
        const path = `encode.${channel}`;
        const address = parseShaderParamAddress(channel);
        if (address !== null && binding !== undefined) {
            checkParamBinding(channel, binding, target, path, catalog, log);
            continue;
        }

        const descriptor = checkChannel(channel, target, path, log);

        if (descriptor !== null && binding !== undefined) {
            checkBinding(descriptor, binding, path, options, universal, log);
            checkModelBinding(descriptor, binding, path, log);
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Shaders: ids from the catalog, maps keyed by id, parameters each shader declares
// ---------------------------------------------------------------------------------------------

/**
 * Whether a value is a map a layer may write: a plain object, or one with no prototype.
 * @param value - Anything.
 * @returns True for a plain map.
 */
function isPlainMap(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value) as unknown;

    return prototype === Object.prototype || prototype === null;
}

/**
 * Check one shader id against the catalog: it must be listed, drawn on the list's target (a node
 * list also takes group outlines), and allowed at the place the use asks for.
 * @param id - The id.
 * @param target - The list's target.
 * @param place - The place the use asks for, or undefined for the shader's own.
 * @param path - Where it sits in the specification.
 * @param log - Where problems are collected.
 * @returns The shader, or null when it was refused.
 */
function checkShaderRef(
    id: string,
    target: "node" | "edge",
    place: ShaderPlace | undefined,
    path: string,
    log: ProblemLog,
): ShaderDescriptor | null {
    const descriptor = shaderDescriptor(id);
    if (descriptor === undefined) {
        report(log, {
            code: "E_UNKNOWN_SHADER",
            message: `There is no shader called "${id}".`,
            path,
            candidates: shaderIdsFor(target),
        });

        return null;
    }

    const takes = target === "node" ? ["node", "group"] : ["edge"];
    if (!takes.includes(descriptor.target)) {
        report(log, {
            code: "E_SHADER_KIND",
            message: `"${id}" draws on the ${descriptor.target}, and this list takes ${target} shaders.`,
            path,
            candidates: shaderIdsFor(target),
            fact: { code: "shader.target-mismatch", params: { expected: target, found: descriptor.target } },
        });

        return null;
    }

    const problem = shaderPlaceProblem(descriptor, place);
    if (problem !== null) {
        report(log, {
            code: "E_SHADER_KIND",
            message: `"${id}" cannot draw at "${String(place)}".`,
            path: `${path.replace(/\.shader$/, "")}.place`,
            candidates: [...(descriptor.places ?? [])],
            fact: problem,
        });

        return null;
    }

    return descriptor;
}

/**
 * Check one parameter value against what its shader declares.
 * @param shader - The shader, or null when the catalog was not consulted.
 * @param name - The parameter's id.
 * @param value - Its value.
 * @param path - Where it sits in the specification.
 * @param log - Where problems are collected.
 */
function checkParamValue(
    shader: ShaderDescriptor | null,
    name: string,
    value: unknown,
    path: string,
    log: ProblemLog,
): void {
    if (isClockBinding(value)) {
        checkClockBinding(shader, name, value, path, log);

        return;
    }

    if (!isShaderParamName(name) || !["number", "string", "boolean"].includes(typeof value)) {
        report(log, { code: "E_BAD_LAYER", message: `"${name}" is not a parameter a shader can take.`, path });

        return;
    }

    if (shader === null) {
        return;
    }

    const param = shader.params.find((entry) => entry.name === name);
    if (param === undefined) {
        report(log, {
            code: "E_UNKNOWN_SHADER_PARAM",
            message: `The shader "${shader.id}" declares no parameter "${name}".`,
            path,
            candidates: shader.params.map((entry) => entry.name),
        });

        return;
    }

    if (!paramValueFits(param, value)) {
        report(log, {
            code: "E_OPTION_RANGE",
            message: `${String(value)} is not a value "${name}" of "${shader.id}" takes.`,
            path,
            ...(param.values === undefined ? {} : { candidates: param.values.map((choice) => choice.value) }),
        });
    }
}

/**
 * Check a parameter bound to a clock: a clock the element keeps, a domain of two increasing
 * numbers, and a number or color parameter.
 * @param shader - The shader, or null when the catalog was not consulted.
 * @param name - The parameter's id.
 * @param binding - The binding.
 * @param path - Where it sits in the specification.
 * @param log - Where problems are collected.
 */
function checkClockBinding(
    shader: ShaderDescriptor | null,
    name: string,
    binding: ShaderClockBinding,
    path: string,
    log: ProblemLog,
): void {
    const [from, to] = Array.isArray(binding.domain) ? binding.domain : [];
    const param = shader?.params.find((entry) => entry.name === name);
    const sound =
        SHADER_CLOCKS.includes(binding.by) &&
        typeof from === "number" &&
        typeof to === "number" &&
        from < to &&
        (param === undefined || param.type === "number" || param.type === "color");
    if (!sound) {
        report(log, {
            code: "E_BAD_LAYER",
            message: `"${name}" is bound to a clock as { by: "since.matched", domain: [0, 0.3] }, on a number or color.`,
            path,
        });
    } else if (shader !== null && param === undefined) {
        checkParamValue(shader, name, 0, path, log);
    }
}

/**
 * Whether a value is one a parameter takes.
 * @param param - The parameter.
 * @param value - The value.
 * @returns True when it fits its type and range.
 */
function paramValueFits(param: ShaderDescriptor["params"][number], value: unknown): boolean {
    switch (param.type) {
        case "number":
        case "integer": {
            const { min, max } = param;
            return (
                typeof value === "number" &&
                Number.isFinite(value) &&
                (param.type === "number" || Number.isInteger(value)) &&
                (typeof min !== "number" || value >= min) &&
                (typeof max !== "number" || value <= max)
            );
        }
        case "boolean":
            return typeof value === "boolean";
        case "color":
            return typeof value === "string" && toColorValue(value) !== null;
        default:
            return typeof value === "string" && (param.values ?? []).some((choice) => choice.value === value);
    }
}

/**
 * Check one parameter set: a map of parameter values.
 * @param shader - The shader it belongs to, or null when the catalog was not consulted.
 * @param params - The set.
 * @param path - Where it sits in the specification.
 * @param log - Where problems are collected.
 */
function checkParamSet(shader: ShaderDescriptor | null, params: unknown, path: string, log: ProblemLog): void {
    if (!isPlainMap(params)) {
        report(log, { code: "E_BAD_LAYER", message: "A shader's parameters are a map, such as { speed: 2 }.", path });

        return;
    }

    for (const [name, value] of Object.entries(params)) {
        checkParamValue(shader, name, value, `${path}.${name}`, log);
    }
}

/** The members a shader use may carry. */
const USE_KEYS: ReadonlySet<string> = new Set(["shader", "place", "params", "groupBy", "off"]);

/**
 * Check one use of a shader list: its shape, its shader and place against the catalog, its
 * parameters, and `groupBy` (place `group` only).
 * @param use - The entry.
 * @param target - The list's target.
 * @param path - Where it sits in the specification.
 * @param catalog - Whether to consult the catalog, which a loaded document does not.
 * @param log - Where problems and paths are collected.
 */
function checkShaderUse(use: unknown, target: "node" | "edge", path: string, catalog: boolean, log: ProblemLog): void {
    if (!isPlainMap(use) || !isShaderId(use.shader) || Object.keys(use).some((key) => !USE_KEYS.has(key))) {
        report(log, {
            code: "E_BAD_LAYER",
            message: 'A shader use is { shader: "<id>", place?, params?, groupBy?, off? }.',
            path,
        });

        return;
    }

    const place = use.place as ShaderPlace | undefined;
    if (use.off !== undefined && use.off !== true) {
        report(log, { code: "E_BAD_LAYER", message: "off is true, or left out.", path: `${path}.off` });
    }

    const checkedPlace = use.off === true ? undefined : place;
    const shader = catalog ? checkShaderRef(use.shader, target, checkedPlace, `${path}.shader`, log) : null;
    if (use.params !== undefined) {
        checkParamSet(shader, use.params, `${path}.params`, log);
    }

    if (use.groupBy === undefined) {
        return;
    }

    const at = place ?? shader?.place;
    if (typeof use.groupBy !== "string" || use.groupBy.trim() === "" || (at !== undefined && at !== "group")) {
        report(log, {
            code: "E_BAD_LAYER",
            message: 'groupBy is a path, such as "data.community", on a use at the place "group".',
            path: `${path}.groupBy`,
        });
    } else {
        readsPath(log, use.groupBy);
    }
}

/**
 * Check a value written to a shader list channel: a list of uses.
 * @param descriptor - The channel.
 * @param value - The value.
 * @param path - Where it sits in the specification.
 * @param catalog - Whether to consult the catalog, which a loaded document does not.
 * @param log - Where problems are collected.
 */
function checkShaderValue(
    descriptor: ChannelDescriptor,
    value: unknown,
    path: string,
    catalog: boolean,
    log: ProblemLog,
): void {
    if (!Array.isArray(value)) {
        report(log, {
            code: "E_BAD_LAYER",
            message: `${descriptor.plainName} takes a list of shader uses, such as [{ shader: "lock-on-reticle" }].`,
            path,
        });

        return;
    }

    const target = descriptor.shaderTarget ?? "node";
    value.forEach((use: unknown, at) => {
        checkShaderUse(use, target, `${path}.${String(at)}`, catalog, log);
    });
}

/**
 * Check an `encode` key that binds one shader parameter per element.
 * @param name - The key: `<channel>.<shader>.<parameter>`.
 * @param binding - Its binding.
 * @param target - The layer's target, or null when it could not be settled.
 * @param path - Where it sits in the specification.
 * @param catalog - Whether to consult the catalog.
 * @param log - Where problems and paths are collected.
 */
function checkParamBinding(
    name: string,
    binding: Binding,
    target: SelectorTarget | null,
    path: string,
    catalog: boolean,
    log: ProblemLog,
): void {
    const address = parseShaderParamAddress(name);
    const descriptor = address === null ? null : checkChannel(address.channel, target, path, log);
    if (address === null || descriptor === null) {
        return;
    }

    if ("by" in binding && typeof binding.by === "string") {
        readsPath(log, binding.by);
    }

    if (!isShaderId(address.shader)) {
        report(log, { code: "E_BAD_LAYER", message: "The address does not name a shader id.", path });

        return;
    }

    const shader = catalog
        ? checkShaderRef(address.shader, descriptor.shaderTarget ?? "node", undefined, path, log)
        : null;
    if (shader === null) {
        return;
    }

    const param = shader.params.find((entry) => entry.name === address.param);
    if (param?.varies !== true) {
        report(log, {
            code: "E_UNKNOWN_SHADER_PARAM",
            message: `The shader "${shader.id}" declares no parameter "${address.param}" that varies per element.`,
            path,
            candidates: shader.params.filter((entry) => entry.varies === true).map((entry) => entry.name),
        });
    }
}

/**
 * Check a layer specification, and compile it when it is sound.
 *
 * SYNCHRONOUS, AND IT WRITES NOTHING. This is what a form calls before a person presses Apply:
 * it parses, resolves and refuses, and the session it was asked about is exactly as it was
 * afterwards. Every problem is reported, not the first, because correcting one mistake per round
 * trip is how a form gets abandoned.
 * @param given - The layer as it was authored, imported or exported.
 * @param options - The id to give it, what its selector compiles against, the scales it may name,
 *     and which paths this session answers.
 * @returns The verdict, and the compiled layer when the verdict is that it is sound.
 */
export function checkLayerSpec(given: LayerSpec, options: LayerCheckOptions): LayerCheck {
    const log: ProblemLog = { problems: [], warnings: [], paths: [] };
    const spec = admitSelectorScope(given, options, log);
    const channels = channelsWritten(spec);
    const target = resolveTarget(spec, channels, log);

    checkShape(spec, channels, log, options.mayBeEmpty === true);

    const universal =
        typeof spec.selector === "object" && spec.selector !== null && spec.selector.match === "everything";
    const compiled = checkSelector(spec, target, options, log);

    checkChannels(spec, target, universal, options, log);

    const directory = options.paths;
    const unresolvedPaths =
        directory === undefined || target === null
            ? NO_PATHS
            : Object.freeze(log.paths.filter((path) => !directory.answers(path, target)));
    const shadowedPaths =
        directory === undefined || target === null
            ? NO_PATHS
            : Object.freeze(
                  log.paths.filter((path) => path.startsWith("graphty.") && directory.answers(`data.${path}`, target)),
              );

    if (log.problems.length > 0 || compiled === null || target === null) {
        return {
            result: Object.freeze({
                ok: false,
                errors: Object.freeze([...log.problems]),
                unresolvedPaths,
                shadowedPaths,
                warnings: log.warnings.length === 0 ? NO_WARNINGS : Object.freeze([...log.warnings]),
            }),
            layer: null,
        };
    }

    const warnings = [
        ...log.warnings,
        ...selectorWarnings(spec, target, options.elements),
        ...alphaWarnings(spec),
        ...textSizeWarnings(spec),
    ];

    return {
        result: Object.freeze({
            ok: true,
            errors: NO_PROBLEMS,
            unresolvedPaths,
            shadowedPaths,
            warnings: warnings.length === 0 ? NO_WARNINGS : Object.freeze(warnings),
        }),
        layer: buildLayer(spec, options.id, target, compiled, log.paths),
    };
}

/**
 * Freeze a checked specification into the layer the stack holds.
 * @param spec - The specification, already checked.
 * @param id - The id the layer carries for the rest of its life.
 * @param target - What it paints.
 * @param selector - Its compiled selector.
 * @param reads - Every path it reads.
 * @returns The compiled layer.
 */
function buildLayer(
    spec: LayerSpec,
    id: LayerId,
    target: SelectorTarget,
    selector: CompiledSelector,
    reads: readonly Path[],
): CompiledLayer {
    const source = sourceOf(spec);
    // A copy, deep-frozen, of everything but `userData`: the caller's objects stay theirs to
    // change, and nothing reachable from a layer in the stack can change under it.
    const frozen = <T>(value: T): T => deepFreeze(structuredClone(value));
    const layer: Layer = Object.freeze({
        id,
        name: spec.name,
        kind: spec.kind ?? "custom",
        source: frozen(source),
        locked: isElementSource(source),
        enabled: spec.enabled ?? true,
        target,
        selector: frozen(spec.selector as Selector),
        ...(spec.set === undefined ? {} : { set: frozen(spec.set) }),
        ...(spec.encode === undefined ? {} : { encode: frozen(spec.encode) }),
        ...(spec.unmatched === undefined ? {} : { unmatched: frozen(spec.unmatched) }),
        // Stored by reference and never copied: "round-trips untouched" is not a figure of speech,
        // and a consumer keeping a live object in here gets the same object back.
        ...(spec.userData === undefined ? {} : { userData: spec.userData }),
        ...(spec.row === undefined ? {} : { row: spec.row }),
        ...(spec.fileStyle === undefined ? {} : { fileStyle: frozen(spec.fileStyle) }),
    });

    return Object.freeze({ layer, selector, reads: Object.freeze([...reads]) });
}

/**
 * The specification a layer came from, so an update can be expressed as a patch over it.
 * @param layer - The layer.
 * @returns Its specification, carrying everything the layer holds that a specification can.
 */
export function specOf(layer: Layer): LayerSpec {
    return {
        name: layer.name,
        target: layer.target,
        kind: layer.kind,
        selector: layer.selector,
        source: layer.source,
        enabled: layer.enabled,
        ...(layer.unmatched === undefined ? {} : { unmatched: layer.unmatched }),
        ...(layer.set === undefined ? {} : { set: layer.set }),
        ...(layer.encode === undefined ? {} : { encode: layer.encode }),
        ...(layer.userData === undefined ? {} : { userData: layer.userData }),
        ...(layer.row === undefined ? {} : { row: layer.row }),
        ...(layer.fileStyle === undefined ? {} : { fileStyle: layer.fileStyle }),
    };
}
