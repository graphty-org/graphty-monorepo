/**
 * How Analyze runs an algorithm, shared by its popover and by Quick actions' algorithm rows: what
 * Run will do, why an algorithm cannot run now, the parameters it runs with, and starting it.
 */

import type { AlgorithmDescriptor } from "@graphty/graphty-element/catalog";
import type { BatchResult, GraphSession, Run, RunStyle } from "@graphty/graphty-element/session";

import { groupPalettes } from "../style/row";
import { PATH_ALGORITHM } from "./PathForm";
import { runRefusalWords, wordsFor } from "./words";

/** What Analyze's button will do with an algorithm: run it, update its layer, or add its layer back. */
export interface RunPlan {
    readonly label: string;
    /** Ask the element to put back the kept run's missing layers, from the stored result. */
    readonly restoreLayer: boolean;
    /** Running it would change nothing: the element holds this answer and its layers show. */
    readonly current: boolean;
    /** The kept run was started by a selection's card and paints nothing: Run reuses it and adds its suggested layers. */
    readonly paint?: boolean;
}

/**
 * A grouping run's name for one group's layer: "Group <rank>", or the next number no layer in the
 * run's folder goes by, so a re-run never gives two layers one name.
 * @param group - the group, as graphty-element asks about it.
 * @param group.rank - its place by size, 1 for the largest.
 * @param group.taken - the names the folder's layers already go by.
 * @returns the name.
 */
function groupLayerName({ rank, taken }: { readonly rank: number; readonly taken: readonly string[] }): string {
    let n = rank;
    while (taken.includes(`Group ${String(n)}`)) {
        n += 1;
    }
    return `Group ${String(n)}`;
}

/**
 * The button's words, named for the kept run `start()` reuses (the algorithm's latest): "Run"
 * when there is none, "Update <name> layer" while its layer shows, "Add <name> layer" once its
 * layer was deleted ("layers" for a run that made several), which the element restores from the stored result without computing again
 * unless the settings changed. With the settings the element already answered and its layers
 * showing, it is current: the button would change nothing, so it is not offered.
 * @param session - The element's session
 * @param key - The algorithm
 * @param name - The algorithm's name in words
 * @param params - The settings the button would run with, when the form knows them
 * @returns The plan
 */
export function runPlan(session: GraphSession, key: string, name: string, params?: Record<string, unknown>): RunPlan {
    // Only a run that succeeded has a layer to update or put back: one still queued or running,
    // or one that failed or was canceled, made nothing, so Analyze offers a plain Run.
    const kept = session.runs.list().filter((run) => run.algorithm === key && run.status === "succeeded");
    const latest = kept.at(-1);
    if (latest === undefined) {
        return { label: "Run", restoreLayer: false, current: false };
    }
    const layers = session.runs.layers(latest.id);
    const gone = layers?.present.length === 0 && layers.missing.length > 0;
    // A card's run paints nothing; Analyze's Run with the same settings reuses it and adds its layers.
    const unpainted = session.runs.painting(latest.id)?.state === "opted-out" && (layers?.present.length ?? 0) === 0;
    // A run that made a folder of layers (one per group) names them in the plural. Once the folder
    // is deleted the element lists it as the one suggestion that makes it, so a run with groups
    // is plural whatever the count.
    const grouped = latest.result?.summary().groups !== undefined;
    const noun =
        grouped || (layers !== undefined && layers.present.length + layers.missing.length > 1) ? "layers" : "layer";
    if (unpainted) {
        return { label: `Add ${name} ${noun}`, restoreLayer: false, current: false, paint: true };
    }
    return gone
        ? { label: `Add ${name} ${noun}`, restoreLayer: true, current: false }
        : {
              label: `Update ${name} ${noun}`,
              restoreLayer: false,
              current: params !== undefined && session.runs.answered(key, params) !== undefined,
          };
}

/**
 * The start options Analyze's Run adds for its plan: put back deleted layers, or paint a card's
 * run that the same settings reuse.
 * @param session - The element's session
 * @param key - The algorithm
 * @param name - The algorithm's name in words
 * @param params - The settings it runs with
 * @returns The options
 */
export function planOptions(
    session: GraphSession,
    key: string,
    name: string,
    params: Record<string, unknown>,
): { restoreLayer: boolean; applySuggestedStyles?: true } {
    const plan = runPlan(session, key, name);
    const reused = plan.paint === true && session.runs.answered(key, params) !== undefined;
    return { restoreLayer: plan.restoreLayer, ...(reused ? { applySuggestedStyles: true as const } : {}) };
}

/**
 * The options an algorithm reads from the selection (a start node, a target): node ids, in
 * catalog order.
 * @param descriptor - the algorithm.
 * @returns the option names.
 */
function nodeOptions(descriptor: AlgorithmDescriptor): string[] {
    return descriptor.options
        .filter((o) => o.type === "node-id" && o.advanced !== true && o.internal !== true)
        .map((o) => o.name);
}

/**
 * The settings Analyze shows for an algorithm: its options a reader sets, never the nodes it reads
 * from the selection.
 * @param descriptor - the algorithm.
 * @returns the options.
 */
export function settingsOf(descriptor: AlgorithmDescriptor): AlgorithmDescriptor["options"] {
    return descriptor.options.filter((o) => o.internal !== true && o.type !== "node-id");
}

/**
 * Whether an algorithm runs as it is picked, with nothing to set: no settings and no Path form.
 * Quick actions runs such a row at once, and opens Analyze on any other.
 * @param descriptor - the algorithm.
 * @returns true when it has nothing to set.
 */
export function runsAsPicked(descriptor: AlgorithmDescriptor): boolean {
    return descriptor.key !== PATH_ALGORITHM && settingsOf(descriptor).length === 0;
}

/**
 * Starts an algorithm as Analyze's Run does. The layers it adds go by the algorithm's name as the
 * reader picked it ("Closeness"); a grouping run's groups each become a layer in a folder of that
 * name, named "Group 1" for the largest (the reader renames them in the tree); a re-run's new group
 * takes the next number no layer in the folder has. More groups than eight take the first group
 * palette with a color for each, never an eight-color palette continued into near-identical oranges.
 * @param session - the element's session.
 * @param descriptor - the algorithm.
 * @param values - the values the reader set.
 * @returns the run, as `session.runs.start` returned it.
 */
export function startAlgorithm(
    session: GraphSession,
    descriptor: AlgorithmDescriptor,
    values: Readonly<Record<string, unknown>>,
): ReturnType<GraphSession["runs"]["start"]> {
    const runParams = paramsFor(session, descriptor, values);
    const run = session.runs.start(descriptor.key, runParams, {
        style: runStyle(session, descriptor),
        ...planOptions(session, descriptor.key, wordsFor(descriptor).name, runParams),
    });
    // A failed run is reported in the notice, on its row and in the inspector, from the run itself.
    run.then(undefined, () => undefined);
    return run;
}

/**
 * What a run Analyze starts paints: layers named for the algorithm, a grouping run's groups as a
 * folder of layers (see {@link startAlgorithm}).
 * @param session - the element's session.
 * @param descriptor - the algorithm.
 * @returns the style.
 */
function runStyle(session: GraphSession, descriptor: AlgorithmDescriptor): RunStyle {
    return {
        name: wordsFor(descriptor).name,
        groups: "layers",
        groupName: groupLayerName,
        groupPalettes: groupPalettes(session).map((palette) => palette.id),
    };
}

/** The batch Run all started for each heading, per session, so Analyze can offer to cancel it. */
const BATCHES = new WeakMap<GraphSession, Map<string, Run<BatchResult>>>();

/**
 * The methods Run all starts for a heading: those that can run now with their defaults, never the
 * Path form, which needs its ends picked.
 * @param session - the element's session.
 * @param descriptors - the heading's algorithms.
 * @returns the ones Run all runs.
 */
export function runAllMethods(
    session: GraphSession,
    descriptors: readonly AlgorithmDescriptor[],
): AlgorithmDescriptor[] {
    return descriptors.filter((d) => d.key !== PATH_ALGORITHM && unavailable(session, d) === null);
}

/**
 * The heading's Run all batch while it is still queued or running.
 * @param session - the element's session.
 * @param heading - the heading's id.
 * @returns the batch, or undefined.
 */
export function runningBatch(session: GraphSession, heading: string): Run<BatchResult> | undefined {
    const run = BATCHES.get(session)?.get(heading);
    return run?.status === "queued" || run?.status === "running" ? run : undefined;
}

/**
 * Run all: every method of a heading as one graphty-element batch (`runs.batch`), one cancel for
 * all of them, each method its own run and row.
 * @param session - the element's session.
 * @param heading - the heading's id.
 * @param label - the batch's name, as the history shows it.
 * @param descriptors - the methods, from {@link runAllMethods}.
 * @returns the batch.
 */
export function startAll(
    session: GraphSession,
    heading: string,
    label: string,
    descriptors: readonly AlgorithmDescriptor[],
): Run<BatchResult> {
    const run = session.runs.batch(
        descriptors.map((d) => ({
            algorithm: d.key,
            params: paramsFor(session, d, {}),
            style: runStyle(session, d),
        })),
        { label },
    );
    run.then(undefined, () => undefined);
    let started = BATCHES.get(session);
    if (started === undefined) {
        started = new Map();
        BATCHES.set(session, started);
    }
    started.set(heading, run);
    return run;
}

/**
 * Why an algorithm cannot run now, or null.
 * @param session - the element's session.
 * @param descriptor - the algorithm.
 * @returns the reason, or null.
 */
export function unavailable(session: GraphSession, descriptor: AlgorithmDescriptor): string | null {
    // The Path form picks its own ends, so it needs no selection.
    const needed = descriptor.key === PATH_ALGORITHM ? 0 : nodeOptions(descriptor).length;
    const selected = session.selection.nodes.length;
    if (needed > selected) {
        return needed === 1 ? "Select a node first" : `Select ${String(needed)} nodes first`;
    }
    // Its nodes come from the selection only when it holds exactly them: never the first few of a
    // larger selection, which the reader did not choose.
    if (needed > 0 && selected > needed) {
        const wanted = needed === 1 ? "1 node" : `${String(needed)} nodes`;
        return `Select only ${wanted}; ${String(selected)} are selected`;
    }
    const estimate = session.estimate({ op: "algo.run", algorithm: descriptor.key });
    return estimate.available ? null : runRefusalWords(estimate);
}

/**
 * The parameters to run with: what the reader set, plus the selected nodes for the options that
 * read them, when the selection holds exactly that many.
 * @param session - the element's session.
 * @param descriptor - the algorithm.
 * @param set - the values the reader set.
 * @returns the parameters.
 */
export function paramsFor(
    session: GraphSession,
    descriptor: AlgorithmDescriptor,
    set: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
    const params: Record<string, unknown> = { ...set };
    const names = nodeOptions(descriptor);
    // Filled only from a selection of exactly as many nodes as the options read.
    if (names.length === session.selection.nodes.length) {
        names.forEach((name, i) => {
            params[name] = session.selection.nodes[i];
        });
    }
    return params;
}
