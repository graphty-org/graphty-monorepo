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
import { filterChange } from "../data-place/filterCards";
import { findTreeRow } from "../graph-place/rows";
import { count } from "../inspector/words";
import { runName } from "../runWords";
import { channelPhrase, SHADER_STEP_WORDS } from "../style/words";

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
 * A layer as its style tree row names it: a run's layer by its row ("Connections"), a part of a
 * row on both kinds by the row, any other layer by its own name.
 * @param session - the session.
 * @param params - the params, whose `layer` is the layer's name (or its id).
 * @returns its name.
 */
function layerWords(session: GraphSession, params: Params): string {
    const name = text(params, "layer", "a layer");
    // ponytail: the fact names a layer, not its id, so two layers of one name read as the first.
    const layer = session.styles.list().find((each) => each.name === name || each.id === name);
    return layer === undefined ? name : (findTreeRow(session.styles.tree(), layer.row ?? layer.id)?.row.name ?? name);
}

/**
 * Channels named with their kind: "node size", "node color and edge color".
 * @param value - the `channel` or `channels` param.
 * @returns the words, or "" for none.
 */
function channels(value: Params[string]): string {
    const list = (Array.isArray(value) ? value : [value]).filter((each) => typeof each === "string");
    return [...new Set(list.map((each) => channelPhrase(each as Channel)))].join(" and ");
}

/**
 * A shader by its id, as the catalog names it ("the shader Nebula"), never by its id.
 * @param session - the session, for the catalog.
 * @param id - the shader's id.
 * @returns its words, or "a shader" once the catalog no longer holds it.
 */
function shaderName(session: GraphSession, id: Params[string]): string {
    const name = session.catalog.shaders().find((shader) => shader.id === id)?.plainName;
    return name === undefined ? SHADER_STEP_WORDS.unknown : `the shader ${name}`;
}

/**
 * A settings change: "changing the background" when it changes only the background, else "changing settings".
 * @param params - the params, whose `keys` are the settings' paths.
 * @returns the words.
 */
function settingsWords(params: Params): string {
    const keys = Array.isArray(params.keys) ? params.keys : [];
    const background =
        keys.length > 0 && keys.every((key) => key === "background" || String(key).startsWith("background."));
    return background ? "changing the background" : "changing settings";
}

/**
 * A filter condition by its effect: "a select condition", "a hide condition" or "a filter condition".
 * @param params - the params, whose `effect` is the condition's effect.
 * @returns its words.
 */
function conditionName(params: Params): string {
    if (params.effect === "select") {
        return "a select condition";
    }
    return params.effect === "exclude" ? "a hide condition" : "a filter condition";
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
    "data.label": (p) =>
        p.label === null ? `removing the name of ${String(p.value)}` : `naming ${String(p.value)} ${String(p.label)}`,
    "data.set": () => "replacing the data",
    "data.replace-nodes": () => "replacing the nodes",
    "data.replace-edges": () => "replacing the edges",
    "data.import": (p) => `importing ${text(p, "name", "data")}`,
    "data.expand": (p) => `expanding ${text(p, "node", "a node")}`,
    "data.declare": (p) => `changing the column ${text(p, "column", "")}`.trimEnd(),
    "data.set-source": () => "renaming the source",
    "data.import-source": (p) => `importing ${text(p, "name", "data from a network source")}`,
    "data.source-expand": (p) => `expanding ${counted(p, "node", "nodes")} from a network source`,
    "data.collapse": (p) => `collapsing ${text(p, "node", "a node")}`,
    "data.set-file-styles": () => "choosing which file styles to use",
    "data.columns": () => "changing the columns",
    "data.join": (p) => `joining ${text(p, "name", "a table")}`,
    "data.edit-join": () => "editing a join",
    "data.issues": () => "changing the data issues",
    "data.fix-issue": () => "fixing a data issue",
    "data.ignore-issue": () => "ignoring a data issue",
    "data.ignore-issues": (p) =>
        `${p.ignored === false ? "restoring" : "ignoring"} ${Array.isArray(p.issues) ? p.issues.length : 0} data issues`,
    "data.remove-source": (p) => `removing ${text(p, "name", "a source")}`,
    "data.replace-source": (p) => `replacing ${text(p, "name", "a source")}`,
    "data.rename-column": () => "renaming a column",
    "data.set-role": () => "changing a column's role",
    "data.set-type": () => "changing a column's type",
    "data.hide-columns": () => "hiding columns",
    "data.show-columns": () => "showing columns",
    "style.add-layer": (p, s) => `adding the layer ${layerWords(s, p)}`,
    "style.update-layer": (p, s) => {
        const what = channels(p.channels);
        return what === "" ? `changing ${layerWords(s, p)}` : `changing ${what} on ${layerWords(s, p)}`;
    },
    "style.remove-layer": (p, s) => `removing the layer ${layerWords(s, p)}`,
    "style.move-layer": (p, s) => `moving the layer ${layerWords(s, p)}`,
    "style.remove-layers": (p) => `removing ${counted(p, "layer")}`,
    "style.highlight": (p, s) => `highlighting ${runWords(s, p.run)}`,
    "style.fix-channel": (p, s) => `fixing ${channels(p.channel)} on ${layerWords(s, p)}`,
    "style.encode": (p, s) => `${channels(p.channel)} by ${runWords(s, p.run)}`,
    "style.template": () => "applying a style template",
    "style.suggested": () => "applying suggested styles",
    "style.add-folder": (p) => `adding the folder ${text(p, "name", "")}`.trimEnd(),
    "style.rename-row": (p) => `renaming ${text(p, "row", "a layer")}`,
    "style.move-row": (p) => `moving ${text(p, "row", "a layer")}`,
    "style.pin-row": (p) => `${p.pin === "none" ? "unpinning" : "pinning"} ${text(p, "row", "a layer")}`,
    "style.lock-row": (p) => `${p.locked === true ? "locking" : "unlocking"} ${text(p, "row", "a layer")}`,
    "style.hide-row": (p) => `${p.hidden === true ? "hiding" : "showing"} ${text(p, "row", "a layer")}`,
    "style.delete-row": (p) => `deleting ${text(p, "row", "a layer")}`,
    "style.restore-starting-rows": () => "restoring the starting rows",
    "shader.add": (p, s) => `adding ${shaderName(s, p.id)}`,
    "shader.replace": (p, s) => `changing ${shaderName(s, p.id)}`,
    "shader.remove": (p, s) => `removing ${shaderName(s, p.id)}`,
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
    "visibility.condition-add": (p) => `adding ${conditionName(p)}`,
    "visibility.condition-edit": (p) => `editing ${conditionName(p)}`,
    "visibility.condition-on": (p) => `turning on ${conditionName(p)}`,
    "visibility.condition-off": (p) => `turning off ${conditionName(p)}`,
    "visibility.condition-remove": (p) => `deleting ${conditionName(p)}`,
    "visibility.steps": () => "changing the filter steps",
    "visibility.playback": () => "changing how time plays",
    "time.field": () => "setting the time field",
    "time.clear-field": () => "clearing the time field",
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
    "config.set": (p) => settingsWords(p),
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

/** A history step as Undo and Redo read it: its fact, and the ops of the commands it holds. */
interface Step {
    readonly fact: CodedFact<HistoryCode>;
    readonly ops: readonly string[];
}

/** Codes whose words say something only their params decide (on or off, 2D or 3D). */
const PARAM_WORDS: ReadonlySet<string> = new Set([
    "data.label",
    "style.encode",
    "style.fix-channel",
    "style.pin-row",
    "style.lock-row",
    "style.hide-row",
    "view.dimension",
    "view.immersive",
    "shader.add",
    "shader.replace",
    "shader.remove",
]);

/**
 * The words of a step's commands, read from their ops: "changing settings and importing data".
 * An op the words do not name (an op that is no step of its own, a code the element added since,
 * one whose words need its params) is left out.
 * @param session - the element's session.
 * @param ops - the ops, in the order they ran.
 * @returns the words, or null when none is named.
 */
function opWords(session: GraphSession, ops: readonly string[]): string | null {
    const named = [
        ...new Set(
            ops.flatMap((op) =>
                Object.hasOwn(WORDS, op) && !PARAM_WORDS.has(op) ? [WORDS[op as HistoryCode]({}, session)] : [],
            ),
        ),
    ];
    if (named.length === 0) {
        return null;
    }
    return named.length === 1 ? named[0] : `${named.slice(0, -1).join(", ")} and ${String(named.at(-1))}`;
}

/**
 * One history step as Undo and Redo name it: "Size by PageRank", `turning off the filter step "weight is at
 * least 4"`. A filter step change names the step's rule when the session holds the step; a batch
 * nobody named names what it holds rather than "2 changes".
 * @param session - the element's session.
 * @param step - the step.
 * @returns the words.
 */
function historyWords(session: GraphSession, step: Step): string {
    const { fact } = step;
    if (fact.code === "batch" && typeof fact.params.label !== "string") {
        const held = opWords(session, step.ops);
        if (held !== null) {
            return held;
        }
    }
    // A code the element adds in a minor release has no words yet: name it generically.
    const words = WORDS[fact.code] as (typeof WORDS)[HistoryCode] | undefined;
    return filterChange(session, fact) ?? words?.(fact.params, session) ?? "the last change";
}

/**
 * The step the next Undo (or Redo) takes back, or null when there is none.
 * @param session - the element's session.
 * @param undo - true for Undo, false for Redo.
 * @returns the step, or null.
 */
function nextStep(session: GraphSession, undo: boolean): Step | null {
    const { history } = session;
    if (!undo) {
        return history.steps.at(history.position) ?? null;
    }
    const next = history.nextUndo;
    if (next === null) {
        return null;
    }
    if (next.kind === "undo") {
        return next.step;
    }
    const pending = next.pending.at(-1);
    return pending === undefined ? null : { fact: pending.fact, ops: [] };
}

/**
 * The Undo or Redo tooltip's name: "Undo Size by PageRank", or just the verb with nothing to do.
 * @param session - the element's session, or null.
 * @param undo - true for Undo, false for Redo.
 * @returns the words.
 */
export function historyTip(session: GraphSession | null, undo: boolean): string {
    const verb = undo ? "Undo" : "Redo";
    const step = session === null ? null : nextStep(session, undo);
    return step === null || session === null ? verb : `${verb} ${historyWords(session, step)}`;
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
    const next = nextStep(session, undo);
    const before = next === null ? null : historyWords(session, next);
    const filterStep = next === null ? null : filterChange(session, next.fact);
    await (undo ? session.undo() : session.redo());
    if (next === null) {
        return null;
    }
    const words = filterStep ?? filterChange(session, next.fact) ?? before ?? "the last change";
    return `${undo ? "Undid" : "Redid"} ${words}.`;
}
