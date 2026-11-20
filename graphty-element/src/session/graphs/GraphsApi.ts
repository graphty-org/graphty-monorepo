/**
 * @file `session.graphs`: several graphs in one session, one shown at a time. The graph shown is the
 * session itself; every other graph is held as the project file `project.save` wrote for it, and a
 * switch saves the one shown and opens the other, so each graph keeps its data, results, styles,
 * sets, views and notes.
 */

import type { ScopeInput } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { ProjectApi } from "../projectFile";
import type { ScopeApi } from "../scope/ScopeApi";
import type { SessionDataApi, SessionHistory } from "../types";

/** One graph of a session. Frozen. */
export interface SessionGraph {
    /** The graph's id, unique in the session: `graph-1` for the one a session starts with. */
    readonly id: string;
    /** The name the consumer gave it, or null. */
    readonly name: string | null;
    /** Whether it is the graph the session shows now. */
    readonly current: boolean;
}

/** What `graphs.create` makes the new graph from. */
export interface SessionGraphCreateOptions {
    /**
     * The nodes to copy, with the edges between them: a selection (`"selection"`), a kept set
     * (`{ set: id }`), a rule (`{ where }`) or any other scope. Default `"graph"`, a copy of the whole graph.
     */
    readonly from?: ScopeInput;
    /** The new graph's name. Default null. */
    readonly name?: string | null;
}

/**
 * Several graphs in one session. The session starts with one graph; `create` copies the graph shown,
 * or part of it, into a new graph and shows it, and `switch` shows another. Every graph keeps its own
 * attributes, results, styles, sets, views and notes. The graph shown is the session: every other
 * member of the session reads and writes it.
 *
 * A switch starts the shown graph's undo history afresh. A project file holds the graph shown.
 * @example
 * ```typescript
 * const session = createGraphSession();
 * await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
 * await session.data.addEdges([{ src: "a", dst: "b" }, { src: "b", dst: "c" }]);
 * await session.selection.apply({ ids: ["a", "b"] });
 *
 * // Copy the selected nodes, and the edges between them, into a new graph and show it.
 * const copy = await session.graphs.create({ from: "selection", name: "Picked" });
 * session.data.nodes().length; // 2
 *
 * // Back to the whole graph, and to the copy again.
 * await session.graphs.switch("graph-1");
 * await session.graphs.switch(copy.id);
 * session.graphs.list(); // [{ id: "graph-1", ... }, { id: "graph-2", name: "Picked", current: true }]
 * ```
 */
export interface SessionGraphs {
    /** The id of the graph shown now. */
    readonly currentId: string;
    /**
     * Every graph, in the order they were made.
     * @returns The graphs.
     */
    list(): readonly SessionGraph[];
    /**
     * Copy the graph shown, or the nodes `from` covers and the edges between them, into a new graph
     * with its attributes, results, styles and sets, and show it. Its undo history starts at the copy.
     * @param options - What to copy, and the new graph's name.
     * @returns The new graph.
     */
    create(options?: SessionGraphCreateOptions): Promise<SessionGraph>;
    /**
     * Show another graph. The graph shown until now is kept as it is, and comes back as it was.
     * Switching to the graph shown does nothing.
     * @param id - The graph's id.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` for an id no graph has;
     *     nothing changes then.
     */
    switch(id: string): Promise<void>;
}

/** The session members `session.graphs` works through. */
export interface GraphsHost {
    readonly project: Pick<ProjectApi, "save" | "open">;
    readonly scope: Pick<ScopeApi, "resolve">;
    readonly data: Pick<SessionDataApi, "nodes" | "removeNodes">;
    readonly history: Pick<SessionHistory, "clear">;
}

/** A graph as the session holds it: the saved file of one not shown, null for the one shown. */
interface HeldGraph {
    readonly name: string | null;
    text: string | null;
}

/**
 * Build a session's `graphs`.
 * @param host - The session.
 * @returns The graphs, starting with the one the session holds.
 */
export function graphsOf(host: GraphsHost): SessionGraphs {
    const graphs = new Map<string, HeldGraph>([["graph-1", { name: null, text: null }]]);
    let current = "graph-1";
    let made = 1;
    // One switch or create at a time, so a graph is never saved over another half-opened.
    let queue: Promise<unknown> = Promise.resolve();
    const serial = <T>(work: () => Promise<T>): Promise<T> => {
        const next = queue.then(work);
        queue = next.catch(() => undefined);
        return next;
    };
    const describe = (id: string): SessionGraph =>
        Object.freeze({ id, name: graphs.get(id)?.name ?? null, current: id === current });

    /**
     * Put the graph shown away as its file, and show `text` as `id`.
     * @param id - The graph to show.
     * @param text - Its file.
     */
    const show = async (id: string, text: string): Promise<void> => {
        const shown = (await host.project.save({ markSaved: false })).text;
        await host.project.open(text, { discard: true, ownWork: true });
        const held = graphs.get(current);
        if (held !== undefined) {
            held.text = shown;
        }

        current = id;
    };

    return Object.freeze({
        get currentId() {
            return current;
        },
        list: () => [...graphs.keys()].map((id) => describe(id)),
        create: (options: SessionGraphCreateOptions = {}) =>
            serial(async () => {
                const keep =
                    options.from === undefined || options.from === "graph"
                        ? null
                        : (await host.scope.resolve(options.from)).nodes;
                const id = `graph-${String(++made)}`;
                graphs.set(id, { name: options.name ?? null, text: null });
                // The copy starts as the whole graph shown, then loses what the scope leaves out.
                await show(id, (await host.project.save({ markSaved: false })).text);
                if (keep !== null) {
                    const drop = host.data
                        .nodes({ scope: "graph" })
                        .filter((node) => !keep.has(node.id))
                        .map((node) => node.id);
                    await host.data.removeNodes(drop);
                    host.history.clear({ pending: "keep" });
                }

                return describe(id);
            }),
        switch: (id: string) =>
            serial(async () => {
                const target = graphs.get(id);
                if (target === undefined) {
                    throw new GraphtyError({
                        code: "E_BAD_COMMAND",
                        message: `No graph has the id "${id}".`,
                        source: "data",
                        details: { id, available: [...graphs.keys()] },
                    });
                }

                if (id === current || target.text === null) {
                    return;
                }

                await show(id, target.text);
                target.text = null;
            }),
    });
}
