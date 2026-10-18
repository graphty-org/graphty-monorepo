/**
 * What Undo and Redo name: every history step's fact (graphty-element's `{ code, params }`) in
 * the app's words, for the buttons' tooltips and the status line after they run.
 */

import {
    type Channel,
    type CodedFact,
    type GraphSession,
    type HistoryCode,
    isRunId,
} from "@graphty/graphty-element/session";

import { wordsFor } from "../analyze/words";
import { stepChange } from "../data-place/filterSteps";
import { count } from "../inspector/words";
import { runName } from "../runWords";
import { channelWord } from "../style/words";

/** A fact's params, read as the element documents them. */
type Params = CodedFact<HistoryCode>["params"];

/**
 * A param as text, or a fallback when the element gave none.
 * @param params - the params.
 * @param key - the param.
 * @param fallback - the words without it.
 * @returns the text.
 */
function text(params: Params, key: string, fallback: string): string {
    const value = params[key];
    return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

/**
 * A count param as "3 nodes".
 * @param params - the params.
 * @param noun - the singular noun.
 * @param key - the param, `count` unless given.
 * @returns the words.
 */
function counted(params: Params, noun: string, key = "count"): string {
    const value = params[key];
    return typeof value === "number" ? count(value, noun) : `${noun}s`;
}

/**
 * An algorithm by its key, in the app's words.
 * @param session - the session, for the catalog.
 * @param key - the algorithm's key.
 * @returns its name.
 */
function algorithmName(session: GraphSession, key: Params[string]): string {
    const descriptor = session.catalog.algorithms().find((algorithm) => algorithm.key === key);
    return descriptor === undefined ? "a method" : wordsFor(descriptor).name;
}

/**
 * A run by its id, as its row names it.
 * @param session - the session.
 * @param id - the run's id.
 * @returns its name.
 */
function runWords(session: GraphSession, id: Params[string]): string {
    const run = isRunId(id) ? session.runs.get(id) : undefined;
    return run === undefined ? "a result" : runName(session, run);
}

/**
 * A layer as its paint-tree row names it: a run's layer by the run's name ("PageRank", not the
 * element's "Influence"), any other layer by its own.
 * @param session - the session.
 * @param params - the params, whose `layer` is the layer's name (or its id).
 * @returns its name.
 */
function layerWords(session: GraphSession, params: Params): string {
    const name = text(params, "layer", "a layer");
    // ponytail: the fact names a layer, not its id, so two layers of one name read as the first.
    const layer = session.styles.list().find((each) => each.name === name || each.id === name);
    const run =
        layer === undefined
            ? undefined
            : session.runs.list().find((each) => session.runs.bindings(each.id).includes(layer.id));
    return run === undefined ? name : runName(session, run);
}

/**
 * Channels as their lines name them: "Size", "Color and Size".
 * @param value - the `channel` or `channels` param.
 * @returns the words, or "" for none.
 */
function channels(value: Params[string]): string {
    const list = (Array.isArray(value) ? value : [value]).filter((each) => typeof each === "string");
    return [...new Set(list.map((each) => channelWord(each as Channel)))].join(" and ");
}

/** Each code's words, read from its params. Every code the element documents has one. */
const WORDS: Readonly<Record<HistoryCode, (params: Params, session: GraphSession) => string>> = {
    "algo.run": (p, s) => `running ${algorithmName(s, p.algorithm)}`,
    "algo.legacy": (p, s) => `running ${algorithmName(s, p.algorithm)}`,
    "algo.remove": (p, s) => `removing ${runWords(s, p.run)}`,
    "algo.move": (p, s) => `moving ${runWords(s, p.run)}`,
    "algo.batch": (p) => `running ${counted(p, "method")}`,
    "algo.template": () => "running the template's methods",
    batch: (p) => text(p, "label", counted(p, "change", "steps")),
    "data.add-nodes": (p) => `adding ${counted(p, "node")}`,
    "data.add-edges": (p) => `adding ${counted(p, "edge")}`,
    "data.remove-nodes": (p) => `removing ${counted(p, "node")}`,
    "data.remove-edges": (p) => `removing ${counted(p, "edge")}`,
    "data.edit": (p) => `editing ${counted(p, p.target === "edge" ? "edge" : "node")}`,
    "data.clear": () => "clearing the data",
    "data.set": () => "replacing the data",
    "data.replace-nodes": () => "replacing the nodes",
    "data.replace-edges": () => "replacing the edges",
    "data.import": (p) => `importing ${text(p, "name", "data")}`,
    "data.expand": (p) => `expanding ${text(p, "node", "a node")}`,
    "data.declare": (p) => `changing the column ${text(p, "column", "")}`.trimEnd(),
    "data.set-source": () => "renaming the source",
    "style.add-layer": (p, s) => `adding ${layerWords(s, p)}`,
    "style.update-layer": (p, s) => {
        const what = channels(p.channels);
        return what === "" ? `changing ${layerWords(s, p)}` : `changing ${what} on ${layerWords(s, p)}`;
    },
    "style.remove-layer": (p, s) => `removing ${layerWords(s, p)}`,
    "style.move-layer": (p, s) => `moving ${layerWords(s, p)}`,
    "style.remove-layers": (p) => `removing ${counted(p, "layer")}`,
    "style.highlight": (p, s) => `highlighting ${runWords(s, p.run)}`,
    "style.fix-channel": (p, s) => `fixing ${channels(p.channel)} on ${layerWords(s, p)}`,
    "style.encode": (p, s) => `${channels(p.channel)} by ${runWords(s, p.run)}`,
    "style.template": () => "applying a style template",
    "style.suggested": () => "applying suggested styles",
    "visibility.filter": () => "filtering",
    "visibility.clear-filter": () => "clearing the filter",
    "visibility.window": () => "setting the time window",
    "visibility.clear-window": () => "clearing the time window",
    "visibility.show-context": () => "showing context",
    "visibility.hide-context": () => "hiding context",
    "visibility.step-add": () => "adding a filter step",
    "visibility.step-edit": () => "editing a filter step",
    "visibility.step-on": () => "turning on a filter step",
    "visibility.step-off": () => "turning off a filter step",
    "visibility.step-remove": () => "deleting a filter step",
    "visibility.steps": () => "changing the filter steps",
    "set.create": (p) => `creating ${text(p, "name", "a set")}`,
    "set.rename": (p) => `renaming ${text(p, "set", "a set")}`,
    "set.redefine": (p) => `changing ${text(p, "set", "a set")}`,
    "set.members": (p) => `changing the members of ${text(p, "set", "a set")}`,
    "set.remove": (p) => `deleting ${text(p, "set", "a set")}`,
    "set.restore": (p) => `restoring ${text(p, "set", "a set")}`,
    "note.add": () => "adding a note",
    "note.update": () => "editing a note",
    "note.remove": () => "deleting a note",
    "note.merge": () => "merging notes",
    "view.save": () => "saving a view",
    "view.remove": () => "deleting a view",
    "view.dimension": (p) => `switching to ${p.dimension === "2d" ? "2D" : "3D"}`,
    "view.immersive": (p) => `entering ${p.mode === "ar" ? "AR" : "VR"}`,
    "config.set": () => "changing settings",
    "positions.set": (p) => `moving ${counted(p, "node")}`,
    "positions.pin": (p) => `pinning ${counted(p, "node")}`,
    "positions.release": (p) => `releasing ${counted(p, "node")}`,
    "node.drag": (p) => `moving ${text(p, "node", "a node")}`,
    "layout.set": () => "changing the layout",
    "layout.behavior": () => "changing how the layout runs",
    "layout.scope": () => "laying out part of the graph",
    "layout.whole-graph": () => "laying out the whole graph",
    "project.open": (p) => `opening ${text(p, "name", "a project")}`,
    "document.open": () => "opening a document",
    transaction: (p) => text(p, "label", "a change"),
};

/**
 * One history step as Undo and Redo name it: "Size by PageRank", `turning off "weight is at
 * least 4"`. A filter step change names the step's rule when the session holds the step.
 * @param session - the element's session.
 * @param fact - the step's fact.
 * @returns the words.
 */
function historyWords(session: GraphSession, fact: CodedFact<HistoryCode>): string {
    // A code the element adds in a minor release has no words yet: name it generically.
    const words = WORDS[fact.code] as (typeof WORDS)[HistoryCode] | undefined;
    return stepChange(session, fact) ?? words?.(fact.params, session) ?? "the last change";
}

/**
 * The fact the next Undo (or Redo) takes back, or null when there is none.
 * @param session - the element's session.
 * @param undo - true for Undo, false for Redo.
 * @returns the fact, or null.
 */
function nextFact(session: GraphSession, undo: boolean): CodedFact<HistoryCode> | null {
    const { history } = session;
    if (!undo) {
        return history.steps.at(history.position)?.fact ?? null;
    }
    const next = history.nextUndo;
    if (next === null) {
        return null;
    }
    return next.kind === "undo" ? next.step.fact : (next.pending.at(-1)?.fact ?? null);
}

/**
 * The Undo or Redo tooltip's name: "Undo Size by PageRank", or just the verb with nothing to do.
 * @param session - the element's session, or null.
 * @param undo - true for Undo, false for Redo.
 * @returns the words.
 */
export function historyTip(session: GraphSession | null, undo: boolean): string {
    const verb = undo ? "Undo" : "Redo";
    const fact = session === null ? null : nextFact(session, undo);
    return fact === null || session === null ? verb : `${verb} ${historyWords(session, fact)}`;
}

/**
 * Runs Undo or Redo and gives the status line's words: "Undid Size by PageRank." Named before it
 * runs, since what the step names (a run, a filter step) may be gone after; a filter step that
 * only exists after (a Redo of its adding) is named after.
 * @param session - the element's session.
 * @param undo - true for Undo, false for Redo.
 * @returns the words, or null when there was nothing to take back.
 */
export async function undoOrRedo(session: GraphSession, undo: boolean): Promise<string | null> {
    const fact = nextFact(session, undo);
    const before = fact === null ? null : historyWords(session, fact);
    const step = fact === null ? null : stepChange(session, fact);
    await (undo ? session.undo() : session.redo());
    if (fact === null) {
        return null;
    }
    return `${undo ? "Undid" : "Redid"} ${step ?? stepChange(session, fact) ?? before ?? "the last change"}.`;
}
