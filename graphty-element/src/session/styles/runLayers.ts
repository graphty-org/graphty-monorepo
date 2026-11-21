/**
 * What a highlight or a mark of a run paints: the run it names, the field it reads, the style each
 * half of the graph takes and the layers it replaces.
 */
import type { Channel, RunId, StaticStyle } from "../../catalog/types";
import { EDGE_CONSTANTS } from "../../constants/meshConstants";
import { GraphtyError } from "../../errors";
import { nearestNames } from "../results/ResultsApi";
import { isHighlightShape, resultPath, resultShapeContract, type RunRef } from "../results/types";
import { isChannel } from "./channels";
import type { EncodingRun, EncodingSource } from "./EncodingSpec";
import type { Layer } from "./Layer";
import type { SelectorTarget } from "./predicate";
import { badCommand } from "./styleErrors";
import type { HighlightSpec } from "./StylesApi";

/**
 * What a highlight paints when its caller names no style and the consumer chose no color with
 * {@link StylesApi.setHighlightColor}.
 *
 * A highlight is drawn OVER the default indigo node, the default darkgray edge, the whitesmoke
 * background AND whatever a measurement or a group encoding painted the other nodes, so it is
 * chosen against all of them rather than on its own. Ultramarine `#0000AA` is at least Delta E 15
 * from the default node, the default edge, the background and every color of the default
 * measurement palette for every kind of color vision, 12:1 against the background, and at least
 * Delta E 20 from every color of the default group palette and its gray (8 or more under
 * protanopia and deuteranopia), so a route drawn over communities never reads as one of them.
 * Paul Tol's indigo, the color before it, is in the Tol muted group palette, and black, a common
 * choice for a route, is the default group palette's seventh; the Okabe-Ito vermilion before the
 * indigo sat inside the default measurement palette. `test/catalog/default-palette-quality.test.ts`
 * measures it.
 *
 * It is a neutral default, not the best color for every drawing: a group encoding that names
 * another palette may hold a color close to it. A consumer that wants a route to stand out more
 * on its own drawings chooses its color with {@link StylesApi.setHighlightColor}.
 *
 * Color alone is not enough for an edge: a thin line at the default width reads as a thin line
 * whatever its color, so a highlighted edge is also drawn three times as wide. A node gets no
 * size, because a size here would flatten whatever size encoding the layers beneath it drew.
 */
export const DEFAULT_HIGHLIGHT = {
    color: "#0000AA",
    edgeWidth: EDGE_CONSTANTS.DEFAULT_LINE_WIDTH * 3,
} as const;

/** Both halves of a graph, in the order a document and a report list them. */
const HALVES: readonly SelectorTarget[] = Object.freeze(["node", "edge"]);

/**
 * The run id behind any of the three ways a caller names a run.
 * @param ref - The run, its result, or its id.
 * @returns The run id.
 */
export function runIdOf(ref: RunRef): RunId {
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
export function requireRun(ref: RunRef, source: EncodingSource): EncodingRun {
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
export function isDerivedFor(layer: Layer, runId: RunId, channel: Channel): boolean {
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
 * @param set - The style, or undefined for the session's highlight color.
 * @param half - Whether the layer paints nodes or edges.
 * @param color - The session's highlight color, used when `set` is undefined.
 * @returns The channels for that half, or null when the style names none of them.
 */
export function halfOfStyle(set: StaticStyle | undefined, half: SelectorTarget, color: string): StaticStyle | null {
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

/**
 * The field a highlight or a mark paints from, refusing a run that chose nothing to paint.
 * @param run - The run.
 * @param spec - The highlight or mark.
 * @param exclusive - True for a highlight; false for a mark, which must name its channels.
 * @returns The field.
 * @throws `E_BAD_COMMAND` for a run that measured every element, or a mark naming no channel;
 *     `E_UNKNOWN_ATTRIBUTE` for a field the run did not publish on a node or an edge.
 */
export function chosenField(run: EncodingRun, spec: HighlightSpec, exclusive: boolean): string {
    const verb = exclusive ? "highlight" : "mark";

    if (!isHighlightShape(run.shape)) {
        throw badCommand(
            `A "${run.shape}" result measures every element rather than choosing some, so it is painted ` +
                `with encode() rather than with ${verb}().`,
            { run: run.id, shape: run.shape },
        );
    }

    if (!exclusive && spec.set === undefined) {
        throw badCommand(`mark() paints only the channels its set names, and this one names none.`, {
            run: run.id,
        });
    }

    const field = spec.field ?? resultShapeContract(run.shape).primaryField ?? "";

    if (!run.fields.some((entry) => entry.name === field && (entry.kind === "node" || entry.kind === "edge"))) {
        const published = run.fields.map((entry) => entry.name);

        throw new GraphtyError({
            code: "E_UNKNOWN_ATTRIBUTE",
            message: `The run "${run.id}" publishes no field called "${field}" on its nodes or its edges.`,
            source: "style",
            details: { run: run.id, field, available: published, candidates: nearestNames(field, published) },
        });
    }

    return field;
}

/**
 * What each half a run chose is painted: one entry per half the run chose AND the style has
 * something to say about, so a route styled with an edge color alone paints the route's edges and
 * leaves its nodes to the layers underneath.
 * @param run - The run.
 * @param field - The field that says what it chose.
 * @param set - The style, or undefined for the element's own highlight.
 * @param color - The highlight color the session paints with when the style names none.
 * @returns The style per half.
 * @throws `E_BAD_COMMAND` when the style paints no half the run chose.
 */
export function runPainting(
    run: EncodingRun,
    field: string,
    set: StaticStyle | undefined,
    color: string,
): Map<SelectorTarget, StaticStyle> {
    const chosen = run.fields.filter((entry) => entry.name === field);
    const painting = new Map<SelectorTarget, StaticStyle>();

    for (const half of HALVES) {
        const style = chosen.some((entry) => entry.kind === half) ? halfOfStyle(set, half, color) : null;

        if (style !== null) {
            painting.set(half, style);
        }
    }

    if (painting.size === 0) {
        throw badCommand(
            `The style names no channel that paints the ${chosen.map((entry) => entry.kind).join(" or ")} ` +
                `the run "${run.id}" chose, so it would paint nothing.`,
            { run: run.id, field, set },
        );
    }

    return painting;
}

/**
 * Which layers a new highlight or mark takes out of the stack. A highlight replaces every other
 * highlight. A mark replaces only this run's earlier mark of the same field, so marking it again
 * does not stack a copy, and every other layer -- another algorithm's mark among them -- stays.
 * @param exclusive - True for a highlight; false for a mark.
 * @param runId - The run.
 * @param where - The selector expression the new layers carry.
 * @returns Whether a layer is replaced.
 */
export function replacedBy(exclusive: boolean, runId: RunId, where: string): (layer: Layer) => boolean {
    if (exclusive) {
        return (layer) => layer.kind === "highlight";
    }

    return (layer) =>
        layer.kind !== "highlight" &&
        layer.source.by === "run" &&
        layer.source.runId === runId &&
        layer.selector.match === "expression" &&
        layer.selector.where === where;
}
