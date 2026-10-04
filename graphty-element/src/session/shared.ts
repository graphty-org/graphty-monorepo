/**
 * @file The small shapes every session API names things with: a data column, a run's result
 * column, a coded fact in place of a sentence, and a progress report.
 *
 * They live in one place so that every verb that takes a column takes it the same way, and every
 * read that has something to say about the graph says it the same way. Types only.
 */

import type { RunId } from "../catalog/types";
import type { RunRef } from "./results/types";

/**
 * A data column, named literally: whether it is on nodes or on edges, and the key the records
 * carry it under.
 *
 * The name is the column's own name, exactly as the file spelled it -- `shared chapters`,
 * `a.b` and `w || x` are all ordinary names here -- and never an expression. An
 * `AttributeDescriptor` from `session.data.attributes()` has both fields, so it can be passed
 * wherever a `ColumnRef` is asked for.
 *
 * ```ts
 * const department = session.data.attributes().find((a) => a.kind === "node" && a.name === "department");
 * ```
 */
export interface ColumnRef {
    /** Whether the column is carried by nodes or by edges. A node and an edge column may share a name. */
    readonly kind: "node" | "edge";
    /** The column's name, literally. */
    readonly name: string;
}

/**
 * One column of a run's result: the run, and optionally which of its fields.
 *
 * With no `field` the run's primary field is meant -- `value` for a metric, `group` for a
 * partition -- so a caller who just ran something never has to know what that algorithm calls its
 * number. `run` is anything that names a run: the handle `runs.start()` returned, its awaited
 * result, or its id.
 *
 * ```ts
 * const run = session.runs.start("pagerank");
 * await session.selection.apply({ top: { run, n: 10 } });
 * ```
 */
export interface ResultRef {
    /** The run. */
    readonly run: RunRef;
    /** One of the fields the run publishes; the run's primary field when absent. */
    readonly field?: string;
}

/** One parameter of a {@link CodedFact}: a plain value, or a list of them. */
export type CodedFactParam = string | number | boolean | null | readonly (string | number | boolean | null)[];

/**
 * Something the element has to say, as a code and the values it is about -- never as words.
 *
 * graphty-element does not write sentences, headings or labels for a reader: how a fact is worded,
 * in which language, and whether it is shown at all is the application's decision. Every API that
 * reports such a fact hands it over in this shape, and documents its codes and what each
 * parameter holds. Switch on `code`; treat an unknown code as something to leave out, because
 * new codes may be added in a minor release.
 *
 * Every parameter is a plain value, so a fact survives `structuredClone` and `JSON.stringify`.
 * A parameter that came from the data (a column name, a value) is the data's own text: escape it
 * before putting it into HTML.
 */
export interface CodedFact<Code extends string = string> {
    /** What kind of fact this is. Stable: a code is renamed or removed only in a major release. */
    readonly code: Code;
    /** The values the fact is about, by name. Each code documents its own names. */
    readonly params: Readonly<Record<string, CodedFactParam>>;
}

/**
 * How far a piece of the element's work has got, published as `progress:changed` on the session
 * and as `graphty-progress-change` on the element.
 *
 * A load is sent once as it begins (`phase: "start"`, before it reads anything), while it runs
 * (`phase: "progress"`) and once when it stops (`phase: "end"`), with `outcome` saying how it
 * stopped. A run is sent while it runs and once when it stops; the call that started it says how.
 * A session with no view reports progress exactly as one with a view does.
 */
export interface ProgressChange {
    /**
     * What is making progress: `"load"` for a data import and `"run"` for an algorithm run.
     *
     * OPEN UNION: later releases add tasks. Show a generic bar for one you do not know.
     */
    readonly task: "load" | "run";
    /** The run, when `task` is `"run"`. */
    readonly run?: RunId;
    /**
     * Whether the work has just begun, is still going, or has stopped.
     *
     * OPEN UNION: treat a phase you do not know like `"progress"`.
     */
    readonly phase: "start" | "progress" | "end";
    /**
     * How many units are done. For a load, the records read so far (nodes and edges); for a run,
     * whatever unit the algorithm counts in.
     */
    readonly completed: number;
    /** How many units there are in all, or null when that is not known in advance. */
    readonly total: number | null;
    /** How far along, from 0 to 1, or null when the total is not known. Never an invented number. */
    readonly fraction: number | null;
    /**
     * What is being read, on every change of a load: the name the source was given or its file's
     * name or URL's last part, and the URL when it was read from one. Absent for a run.
     */
    readonly source?: { readonly name?: string; readonly url?: string };
    /**
     * How a load stopped, on its `phase: "end"` change only.
     *
     * OPEN UNION: later releases may add outcomes.
     */
    readonly outcome?: "succeeded" | "failed" | "cancelled";
    /**
     * Why a load failed, on its `phase: "end"` change when `outcome` is `"failed"` and the failure
     * carried a code: the code and the details the rejection carries (for `E_TOO_LARGE`, its
     * `limit`, `count` and `of`).
     */
    readonly error?: { readonly code: string; readonly details: Readonly<Record<string, unknown>> };
}
