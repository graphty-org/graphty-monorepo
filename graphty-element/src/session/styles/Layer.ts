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

import { knownPaletteIds, paletteDescriptor } from "../../catalog/palettes";
import type {
    Binding,
    ChannelValue,
    Encoding,
    GraphtyErrorCode,
    LayerId,
    LayerKind,
    LayerSource,
    LayerSpec,
    Path,
    Rgba,
    StaticStyle,
} from "../../catalog/types";
import { isGraphtyError } from "../../errors";
import type { RunProgressReport } from "../runs";
import { type ChannelDescriptor, channelDescriptor, channelsFor, toColorValue } from "./channels";
import type { CompiledSelector, SelectorSource, SelectorTarget } from "./predicate";
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

/** The source a specification that named none is given. */
const USER_SOURCE: LayerSource = Object.freeze({ by: "user" });

/** No paths went unanswered. */
const NO_PATHS: readonly Path[] = Object.freeze([]);

/** Nothing was wrong. */
const NO_PROBLEMS: readonly LayerProblem[] = Object.freeze([]);

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
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^[^a-z]+/, "")
        .replace(/[-_]+$/, "");
    const base = slug === "" ? ID_FALLBACK : slug;

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
            return typeof value === "object" && value !== null && !Array.isArray(value)
                ? null
                : {
                      code: "E_BAD_LAYER",
                      message: `${descriptor.plainName} takes a label style, such as { sizePx: 14, weight: "bold" }.`,
                      path,
                  };
        default:
            return {
                code: "E_UNSUPPORTED",
                message: `${descriptor.plainName} accepts no value: ${descriptor.caveat ?? "the element draws nothing for it."}`,
                path,
            };
    }
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

    if (typeof value === "string" && values.includes(value)) {
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
        const available = (target === null ? [...channelsFor("node"), ...channelsFor("edge")] : channelsFor(target)).map(
            (entry) => entry.channel,
        );

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
    if (!("by" in binding)) {
        const problem = checkStaticValue(descriptor, binding.value, `${path}.value`);

        if (problem !== null) {
            report(log, problem);
        }

        return;
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

    if (universal && binding.by.startsWith(RUN_PATH_PREFIX)) {
        report(log, {
            code: "E_UNSCOPED_RUN_ENCODING",
            message:
                `This layer paints every ${descriptor.target} and encodes ${descriptor.channel} from "${binding.by}", ` +
                "which would paint elements the run never measured. Scope it to the elements that carry the result " +
                `with { match: "has", path: "${binding.by}" }.`,
            path: "selector",
        });
    }
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

    const targets = new Set(channels.map(targetOfChannelName).filter((entry): entry is SelectorTarget => entry !== null));

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
 */
function checkShape(spec: LayerSpec, channels: readonly string[], log: ProblemLog): void {
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

    if (channels.length === 0) {
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
        const compiled = compileSelector(spec.selector as Selector, target ?? "node", options.elements);

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
    for (const [channel, value] of Object.entries(spec.set ?? {})) {
        const path = `set.${channel}`;
        const descriptor = checkChannel(channel, target, path, log);

        if (descriptor !== null && value !== undefined) {
            const problem = checkStaticValue(descriptor, value, path);

            if (problem !== null) {
                report(log, problem);
            }
        }
    }

    for (const [channel, binding] of Object.entries(spec.encode ?? {})) {
        const path = `encode.${channel}`;
        const descriptor = checkChannel(channel, target, path, log);

        if (descriptor !== null && binding !== undefined) {
            checkBinding(descriptor, binding, path, options, universal, log);
        }
    }
}

/**
 * Check a layer specification, and compile it when it is sound.
 *
 * SYNCHRONOUS, AND IT WRITES NOTHING. This is what a form calls before a person presses Apply:
 * it parses, resolves and refuses, and the session it was asked about is exactly as it was
 * afterwards. Every problem is reported, not the first, because correcting one mistake per round
 * trip is how a form gets abandoned.
 * @param spec - The layer as it was authored, imported or exported.
 * @param options - The id to give it, what its selector compiles against, the scales it may name,
 *     and which paths this session answers.
 * @returns The verdict, and the compiled layer when the verdict is that it is sound.
 */
export function checkLayerSpec(spec: LayerSpec, options: LayerCheckOptions): LayerCheck {
    const log: ProblemLog = { problems: [], paths: [] };
    const channels = channelsWritten(spec);
    const target = resolveTarget(spec, channels, log);

    checkShape(spec, channels, log);

    const universal =
        typeof spec.selector === "object" && spec.selector !== null && spec.selector.match === "everything";
    const compiled = checkSelector(spec, target, options, log);

    checkChannels(spec, target, universal, options, log);

    const directory = options.paths;
    const unresolvedPaths =
        directory === undefined || target === null
            ? NO_PATHS
            : Object.freeze(log.paths.filter((path) => !directory.answers(path, target)));

    if (log.problems.length > 0 || compiled === null || target === null) {
        return {
            result: Object.freeze({
                ok: false,
                errors: Object.freeze([...log.problems]),
                unresolvedPaths,
            }),
            layer: null,
        };
    }

    return {
        result: Object.freeze({ ok: true, errors: NO_PROBLEMS, unresolvedPaths }),
        layer: buildLayer(spec, options.id, target, compiled),
    };
}

/**
 * Freeze a checked specification into the layer the stack holds.
 * @param spec - The specification, already checked.
 * @param id - The id the layer carries for the rest of its life.
 * @param target - What it paints.
 * @param selector - Its compiled selector.
 * @returns The compiled layer.
 */
function buildLayer(spec: LayerSpec, id: LayerId, target: SelectorTarget, selector: CompiledSelector): CompiledLayer {
    const source = sourceOf(spec);
    const layer: Layer = Object.freeze({
        id,
        name: spec.name,
        kind: spec.kind ?? "custom",
        source,
        locked: isElementSource(source),
        enabled: spec.enabled ?? true,
        target,
        selector: spec.selector as Selector,
        ...(spec.set === undefined ? {} : { set: Object.freeze({ ...spec.set }) }),
        ...(spec.encode === undefined ? {} : { encode: Object.freeze({ ...spec.encode }) }),
        // Stored by reference and never copied: "round-trips untouched" is not a figure of speech,
        // and a consumer keeping a live object in here gets the same object back.
        ...(spec.userData === undefined ? {} : { userData: spec.userData }),
    });

    return Object.freeze({ layer, selector });
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
        selector: layer.selector as LayerSpec["selector"],
        source: layer.source,
        enabled: layer.enabled,
        ...(layer.set === undefined ? {} : { set: layer.set }),
        ...(layer.encode === undefined ? {} : { encode: layer.encode }),
        ...(layer.userData === undefined ? {} : { userData: layer.userData }),
    };
}
