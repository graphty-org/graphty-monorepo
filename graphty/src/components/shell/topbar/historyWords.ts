/**
 * What each history step is called in the History pop-out and the Undo tooltip.
 *
 * graphty-element says what a step did as a coded fact (`HistoryStep.fact`: a `HistoryCode` and
 * its params) and writes no words for it; this table is where the app words every code.
 */

import type { CodedFact, HistoryCode } from "@graphty/graphty-element/session";

/** A fact's params. */
type Params = CodedFact["params"];

/** One param. */
type CodedFactParam = Params[string];

/**
 * A param as text.
 * @param value - the param.
 * @returns it, or an empty string for null.
 */
function text(value: CodedFactParam | undefined): string {
    if (Array.isArray(value)) {
        return value.map(String).join(", ");
    }

    return value === null || value === undefined ? "" : String(value);
}

/**
 * A count and its noun, "a node" for one.
 * @param value - the count param.
 * @param noun - the singular noun.
 * @param article - the word for one.
 * @returns such as "a node" or "3 nodes".
 */
function some(value: CodedFactParam | undefined, noun: string, article = "a"): string {
    const n = Number(value);
    return n === 1 ? `${article} ${noun}` : `${text(value)} ${noun}s`;
}

/**
 * How many names a list param holds.
 * @param value - the list param.
 * @returns its length, or 1 for a single value.
 */
function lengthOf(value: CodedFactParam | undefined): number {
    return Array.isArray(value) ? value.length : 1;
}

/** The words for every code the element documents. */
const WORDS: Readonly<Record<HistoryCode, (params: Params) => string>> = {
    "algo.run": (p) => `Ran ${text(p.algorithm)}`,
    "algo.legacy": (p) => `Ran ${text(p.algorithm)}`,
    "algo.remove": (p) => (p.algorithm === null ? `Removed run ${text(p.run)}` : `Removed ${text(p.algorithm)}`),
    "algo.move": (p) => (p.algorithm === null ? `Moved run ${text(p.run)}` : `Moved ${text(p.algorithm)}`),
    "algo.batch": (p) => (p.label === null ? `Ran ${some(p.count, "algorithm", "an")}` : text(p.label)),
    "algo.template": () => "Ran the template's algorithms",
    batch: (p) => (p.label === null ? some(p.steps, "change", "1") : text(p.label)),
    "data.add-nodes": (p) => `Added ${some(p.count, "node")}`,
    "data.add-edges": (p) => `Added ${some(p.count, "edge", "an")}`,
    "data.remove-nodes": (p) => `Removed ${some(p.count, "node")}`,
    "data.remove-edges": (p) => `Removed ${some(p.count, "edge", "an")}`,
    "data.edit": (p) => `Edited ${some(p.count, text(p.target), "1")}`,
    "data.clear": () => "Cleared the graph",
    "data.set": () => "Set the graph data",
    "data.replace-nodes": () => "Replaced the nodes",
    "data.replace-edges": () => "Replaced the edges",
    "data.import": (p) => {
        if (p.name !== null) {
            return `Loaded ${text(p.name)}`;
        }

        return p.type === null ? "Set the data source" : `Loaded ${text(p.type)}`;
    },
    "data.expand": (p) => `Expanded ${text(p.node)}`,
    "data.declare": (p) => `Declared ${text(p.column)}`,
    "data.set-source": (p) => (p.name === null ? "Named the source" : `Named the source ${text(p.name)}`),
    "style.add-layer": (p) => `Added layer "${text(p.layer)}"`,
    "style.update-layer": (p) => `Changed layer "${text(p.layer)}"`,
    "style.remove-layer": (p) => `Removed layer "${text(p.layer)}"`,
    "style.move-layer": (p) => `Moved layer "${text(p.layer)}"`,
    "style.remove-layers": (p) => `Removed ${some(p.count, "layer", "1")}`,
    "style.highlight": (p) => `Highlighted ${text(p.run)}`,
    "style.fix-channel": (p) => `Fixed ${text(p.channel)} on layer "${text(p.layer)}"`,
    "style.encode": (p) => `Encoded ${text(p.channel)} from ${text(p.run)}`,
    "style.template": () => "Applied a style document",
    "style.suggested": () => "Applied suggested styles",
    "visibility.filter": (p) => `Filtered (${text(p.kind)})`,
    "visibility.clear-filter": () => "Cleared the filter",
    "visibility.window": () => "Set the time window",
    "visibility.clear-window": () => "Cleared the time window",
    "visibility.show-context": () => "Showed hidden nodes faintly",
    "visibility.hide-context": () => "Stopped showing hidden nodes",
    "visibility.step-add": (p) => `Added filter step ${text(p.id)}`,
    "visibility.step-edit": (p) => `Changed filter step ${text(p.id)}`,
    "visibility.step-on": (p) => `Turned on filter step ${text(p.id)}`,
    "visibility.step-off": (p) => `Turned off filter step ${text(p.id)}`,
    "visibility.step-remove": (p) => `Removed filter step ${text(p.id)}`,
    "visibility.steps": () => "Changed the filter steps",
    "set.create": (p) => (p.name === null ? "Created a set" : `Created the set "${text(p.name)}"`),
    "set.rename": (p) => `Renamed the set "${text(p.set)}" to "${text(p.name)}"`,
    "set.redefine": (p) => `Changed the set "${text(p.set)}"`,
    "set.members": (p) => `Changed the members of "${text(p.set)}"`,
    "set.remove": (p) => `Removed the set "${text(p.set)}"`,
    "set.restore": (p) => `Restored the set "${text(p.set)}"`,
    "note.add": () => "Added note",
    "note.update": () => "Edited note",
    "note.remove": () => "Removed note",
    "note.merge": (p) => (p.source === null ? "Added notes" : `Added notes from ${text(p.source)}`),
    "view.save": (p) =>
        lengthOf(p.names) === 1 ? `Saved the view "${text(p.names)}"` : `Saved ${lengthOf(p.names)} views`,
    "view.remove": (p) =>
        lengthOf(p.names) === 1 ? `Removed the view "${text(p.names)}"` : `Removed ${lengthOf(p.names)} views`,
    "view.dimension": (p) => `Switched to ${text(p.dimension).toUpperCase()}`,
    "view.immersive": (p) => `Switched to 3D for ${text(p.mode).toUpperCase()}`,
    "config.set": (p) =>
        lengthOf(p.keys) === 1 ? `Changed the setting "${text(p.keys)}"` : `Changed ${lengthOf(p.keys)} settings`,
    "positions.set": (p) => `Moved ${some(p.count, "node")}`,
    "positions.pin": (p) => `Pinned ${some(p.count, "node")}`,
    "positions.release": (p) => `Released ${some(p.count, "node")}`,
    "node.drag": (p) => `Dragged node ${text(p.node)}`,
    "layout.set": (p) => `Changed the layout to ${text(p.layout)}`,
    "layout.behavior": () => "Changed the layout behaviour",
    "layout.scope": () => "Changed what the layout runs over",
    "layout.whole-graph": () => "Laid out the whole graph",
    "project.open": () => "Open project",
    "document.open": () => "Open document",
    transaction: (p) => (p.label === null ? "Batch of changes" : text(p.label)),
};

/**
 * What a history step is called.
 * @param fact - the step's fact (`HistoryStep.fact` or `PendingStep.fact`).
 * @returns its title, e.g. `Added 3 nodes`; `Change` for a code this app does not know yet.
 */
export function historyTitle(fact: CodedFact<HistoryCode>): string {
    return Object.hasOwn(WORDS, fact.code) ? WORDS[fact.code](fact.params) : "Change";
}
