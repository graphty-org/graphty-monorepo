/**
 * @file `@graphty/graphty-element/commands`: the serialisable form of every verb.
 *
 * Every change a session makes is a command: plain data with an `op`, which `session.execute`
 * runs, a transaction groups into one undoable step, and a recipe, a journal or an agent's tool
 * call can carry. This entry point publishes the vocabulary as data:
 *
 * - `SessionCommand`, the union of every command, the same type `./session` publishes;
 * - `COMMANDS`, one entry per op saying whether it is undoable, or exempt from the history and
 *   why;
 * - `isSessionCommand`, which tells a value that names a known op from anything else.
 *
 * The typed builders, `parsePattern`, `formatCommand` and the JSON Schema generated from the
 * union are still to come (GitHub issue #337).
 *
 * What the element can do today is published as data by `@graphty/graphty-element/catalog`: the
 * algorithms, layouts, formats, palettes and scales that exist, with every option each accepts.
 */

import type { SessionCommand } from "./src/session/planning";

export type { SessionCommand } from "./src/session/planning";

/** How one op behaves under undo: a step in the history, or exempt from it and why. */
export type CommandMeta =
    | {
          /** A step in the history, which undo takes back. */
          readonly undo: "undoable";
      }
    | {
          /** Not a step in the history; `reason` says why. */
          readonly undo: "exempt";
          /** Why it changes nothing a project file saves. */
          readonly reason: string;
      };

/**
 * Every op in the vocabulary, and how it behaves under undo. An op missing here, or declaring
 * neither, is a compile error.
 */
export const COMMANDS = Object.freeze({
    /** `algo.run`: start an algorithm run. */
    "algo.run": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `algo.legacy`: run a plugin algorithm with no catalog descriptor, as one step. */
    "algo.legacy": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `algo.remove`: take a finished run, and every layer bound to it, out of the project. */
    "algo.remove": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `algo.move`: move every layer bound to a run, as one block, to sit below another layer. */
    "algo.move": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `algo.rename`: give a finished run a name of its own, or take it away. */
    "algo.rename": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `batch`: several commands run as one step: a serializable transaction. */
    batch: {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.apply`: apply one change to the graph's nodes, edges or attribute values. */
    "data.apply": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.issues`: replace the data issue state. */
    "data.issues": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.import`: load a graph from a data source or records. */
    "data.import": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.import-source`: the rows a network source load read, loaded as one step. */
    "data.import-source": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.expand`: the nodes and edges a double-click on a node fetched, kept so redo does not fetch again. */
    "data.expand": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.source-expand`: one expansion from a network source, its rows included. */
    "data.source-expand": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.collapse`: remove what a node's expansions alone brought. */
    "data.collapse": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.steps-set`: one change to the sources and steps the graph is rebuilt from (the source-steps experiment). */
    "data.steps-set": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.declare`: declare what a column measures, overriding what the element inferred. */
    "data.declare": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.setSource`: rename the source the graph was loaded from, or set the one a project file recorded. */
    "data.setSource": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.label`: give a value a display name, or take it away with null. */
    "data.label": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.columns`: replace the column settings, optionally moving a renamed column's declaration. */
    "data.columns": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `data.derive`: set the computed columns and write the values that change. */
    "data.derive": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `style.patch`: one change to the style layer stack. */
    "style.patch": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `style.encode`: paint a run's measurement onto a style channel. */
    "style.encode": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `style.template`: add the layers of a style document. */
    "style.template": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `shader.set`: set one shader's text in the project, or remove it with null. */
    "shader.set": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `visibility.set`: apply a filter, or clear it with null. */
    "visibility.set": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `visibility.window`: apply a time window, or clear it with null. */
    "visibility.window": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `visibility.context`: draw hidden nodes faintly, or not at all. */
    "visibility.context": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `visibility.steps`: replace the filter steps, combined with AND; an empty list clears them. */
    "visibility.steps": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `visibility.conditions`: replace the filter conditions (keep, exclude and select); an empty list clears them. */
    "visibility.conditions": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `visibility.playback`: set how `session.time` moves windows, or restore the defaults with null. */
    "visibility.playback": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `visibility.hide`: hide nodes from the drawing only, or show them again. */
    "visibility.hide": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `set.create`: keep a definition as a new set. */
    "set.create": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `set.rename`: give a set another name. */
    "set.rename": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `set.redefine`: change what a set holds, keeping its id, name and order. */
    "set.redefine": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `set.members`: add members to a fixed set, or take them out. */
    "set.members": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `set.remove`: forget a set; whatever names it becomes detached. */
    "set.remove": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `set.restore`: bring a removed set back with the record it had when it was removed. */
    "set.restore": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `note.add`: write a note. */
    "note.add": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `note.update`: change a note. */
    "note.update": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `note.remove`: delete a note. */
    "note.remove": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `note.merge`: add a saved member's notes. */
    "note.merge": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `view.save`: keep camera states under names, replacing any view already under one. */
    "view.save": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `annotations.set`: replace every annotation. */
    "annotations.set": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `annotations.patch`: add, change or remove one annotation. */
    "annotations.patch": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `view.remove`: forget saved views. */
    "view.remove": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `view.camera`: move the camera to a named view, or to a position and target. */
    "view.camera": {
        /** "exempt": not recorded in the history. */
        undo: "exempt",
        /** Why it changes nothing a project file saves. */
        reason: "Where the camera is looking is view state, not saved in a project file.",
    },
    /** `config.set`: write project settings. */
    "config.set": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `positions.set`: place nodes at coordinates. */
    "positions.set": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `positions.pin`: pin nodes, or release them. */
    "positions.pin": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `layout.set`: choose the layout that draws the graph. */
    "layout.set": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `layout.rerun`: run the current layout again from the start, keeping its engine, options and scope. */
    "layout.rerun": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `layout.scope`: change what layouts run over. */
    "layout.scope": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `view.dimension`: draw the graph in two or three dimensions. */
    "view.dimension": {
        /** "undoable": a step in the history. */
        undo: "undoable",
    },
    /** `layout.transport`: let the layout move, or hold it still. */
    "layout.transport": {
        /** "exempt": not recorded in the history. */
        undo: "exempt",
        /** Why it changes nothing a project file saves. */
        reason: "A moving layout is in-flight computation; where it comes to rest is sealed into the step on top.",
    },
    /** `view.immersive`: enter VR or AR, or leave it with null. */
    "view.immersive": {
        /** "exempt": not recorded in the history. */
        undo: "exempt",
        /** Why it changes nothing a project file saves. */
        reason: "Entering or leaving VR or AR is a device session, not the document.",
    },
} as const satisfies { readonly [Op in SessionCommand["op"]]: CommandMeta });

/**
 * Whether a value is a command: an object whose `op` names an op in {@link COMMANDS}. The
 * arguments are checked when the command runs.
 * @param value - Anything.
 * @returns True when it names a known op.
 */
export function isSessionCommand(value: unknown): value is SessionCommand {
    const op = (value as { op?: unknown } | null)?.op;
    return typeof value === "object" && typeof op === "string" && Object.hasOwn(COMMANDS, op);
}
