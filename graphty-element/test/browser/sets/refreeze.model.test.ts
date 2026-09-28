/**
 * @file The re-freeze model driven through the real `DataManager` of a rendered `Graph`
 * (design/sets/sets-design.md sections 4.2, 4.4 and 12.3): 100 sequences of JSON imports (additive
 * and replacing), re-imports, record pushes, removals, `edgeIdPath` changes and set writes through
 * the session's own doors, after which every kept set must resolve as the model says.
 *
 * The model is `test/session/sets/refreeze-model.ts`, the same one the Node run drives over
 * `TestGraph`. A file that embeds the graph has no loader yet, and a JSON file declares no
 * direction, so those two ops are left out here.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import fc from "fast-check";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { EdgeId, NodeId } from "../../../src/catalog/types";
import { EDGE_ID_COLUMN, edgeIdOf } from "../../../src/data/edgeIdentity";
import { isGraphtyError } from "../../../src/errors";
import { Graph, operationQueueOf } from "../../../src/Graph";
import type { DataManager } from "../../../src/managers/DataManager";
import { setsOfSession } from "../../../src/session/GraphSession";
import { setsStoreOf } from "../../../src/session/sets/SetsApi";
import type { SetsStore } from "../../../src/session/sets/store";
import type { SetsApi } from "../../../src/session/sets/types";
import { fcParams } from "../../helpers/fc-params";
import type { EdgeRecord, LoadOptions } from "../../session/sets/graphs";
import { type Driver, Model, opsFor, Step } from "../../session/sets/refreeze-model";

/** The model's driver over a rendered graph's data manager and session. */
class DataManagerDriver implements Driver {
    readonly sets: SetsApi;
    readonly setsStore: SetsStore;
    lastLoadRead = 0;
    lastLoadRolledBack = false;
    lastLoadSources: number[] = [];
    private replacing = false;
    private readonly created: unknown[] = [];

    /**
     * @param graph - The graph.
     */
    constructor(private readonly graph: Graph) {
        this.sets = setsOfSession(graph.getSession());
        this.setsStore = setsStoreOf(this.sets);
        // Each edge the manager builds, in counter order, with the record it was built from.
        graph.eventManager.addListener("edge-add-before", (event) => {
            this.created.push((event as { metadata?: { rid?: unknown } }).metadata?.rid);
        });
    }

    /**
     * The data manager.
     * @returns It.
     */
    private get data(): DataManager {
        return this.graph.getDataManager();
    }

    /**
     * The configured `edgeIdPath`.
     * @returns It.
     */
    get path(): string | null {
        return this.graph.styles.config.data.knownFields.edgeIdPath;
    }

    /**
     * Configure `edgeIdPath`, as the element's property does.
     * @param path - The path.
     */
    set path(path: string | null) {
        void this.graph.getSession().config.set({ data: { knownFields: { edgeIdPath: path } } });
    }

    snapshot(): GraphSnapshot {
        return this.data.getSnapshot();
    }

    storeTag(): object {
        return this.data;
    }

    counterAt(row: number): number {
        return this.snapshot().edges.requireTyped(EDGE_ID_COLUMN, "u32").data[row];
    }

    rowOf(counter: number): number {
        return this.snapshot().edgeIndexOf(counter);
    }

    counters(): number[] {
        return [...this.snapshot().edges.requireTyped(EDGE_ID_COLUMN, "u32").data].sort((a, b) => a - b);
    }

    bag(counter: number): Readonly<Record<string, unknown>> | undefined {
        return this.data.getEdge(edgeIdOf(counter))?.data as Readonly<Record<string, unknown>> | undefined;
    }

    edgeId(counter: number): EdgeId {
        return edgeIdOf(counter);
    }

    addNode(id: NodeId): void {
        this.data.addNodes([{ id }]);
    }

    removeNode(id: NodeId): void {
        // Exactly that id: the manager's lookup would also take 1 for "1" when only one is held.
        if (this.data.getNode(id)?.id === id) {
            this.data.removeNodeAndIncidentEdges(id);
        }
    }

    removeEdge(counter: number): void {
        this.data.removeEdge(edgeIdOf(counter));
    }

    replaceStore(): void {
        this.replacing = true;
    }

    /**
     * Ingest records: a JSON import (replacing when asked), or a record push for session edges.
     * @param records - The records.
     * @param options - The policy, and whether this is a load.
     * @returns The counters created, in counter order.
     */
    async load(records: readonly EdgeRecord[], options: LoadOptions = {}): Promise<number[]> {
        const policy = options.policy ?? "keep";
        const before = new Set(this.counters());
        const nodes = [...new Set(records.flatMap((record) => [record.s, record.t]))].map((id) => ({ id }));
        const edges = records.map((record, rid) => ({
            source: record.s,
            target: record.t,
            weight: record.w ?? 1,
            rid,
            ...record.fields,
        }));
        this.created.length = 0;
        this.lastLoadRead = records.length;
        this.lastLoadRolledBack = false;
        this.lastLoadSources = [];
        if (records.length === 0 && options.asLoad !== false) {
            // The element refuses an empty file; replacing the graph with nothing is a Clear.
            if (this.replacing) {
                this.replacing = false;
                this.data.clear();
            }

            return [];
        }

        try {
            if (options.asLoad === false) {
                this.data.addNodes(nodes);
                this.data.addEdges(edges, { repeated: policy });
            } else {
                void this.graph.getSession().config.set({ data: { knownFields: { repeatedEdges: policy } } });
                const replace = this.replacing;
                this.replacing = false;
                await this.graph.addDataFromSource("json", { data: JSON.stringify({ nodes, edges }) }, { replace });
            }
        } catch (error) {
            if (!isGraphtyError(error) || error.code !== "E_DUPLICATE_EDGE") {
                throw error;
            }

            // The `error` policy refuses a repeat. An import is one step, so the refused load is
            // rolled back whole: nothing of it was read into the graph, and the render objects its
            // first chunk built went with it. A record push adds the nodes in a step of its own and
            // refuses the edges whole, so every record's nodes were read.
            if (options.asLoad !== false) {
                this.lastLoadRead = 0;
                this.lastLoadRolledBack = true;
                this.created.length = 0;
            }
        }

        await operationQueueOf(this.graph).waitForCompletion();
        const created = this.counters().filter((counter) => !before.has(counter));
        if (this.created.length !== created.length) {
            throw new Error(`${created.length} edges created but ${this.created.length} announced`);
        }

        this.lastLoadSources = this.created.map(Number);

        return created;
    }

    rebuildEmbedded(): void {
        throw new Error("no loader for a file that embeds the graph yet");
    }
}

describe("every kept set survives the data manager's edits and re-freezes", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("matches the model after every command, over 100 sequences", async () => {
        // A derivation hook that throws -- a redraw of an edge the layout engine lost -- rejects
        // no command the model awaits, so it would pass here and fail only the run as a whole.
        const escaped: unknown[] = [];
        const onRejection = (event: PromiseRejectionEvent): void => {
            escaped.push(event.reason);
        };
        const onError = (event: ErrorEvent): void => {
            escaped.push(event.error);
        };
        window.addEventListener("unhandledrejection", onRejection);
        window.addEventListener("error", onError);
        const driver = new DataManagerDriver(graph);
        const ops = opsFor({ embed: false, declared: false }).map((arb) => arb.map((op) => new Step(op)));
        await fc
            .assert(
                fc.asyncProperty(fc.commands(ops, { maxCommands: 25, size: "+1" }), async (commands) => {
                    graph.getDataManager().clear();
                    driver.path = null;
                    await fc.asyncModelRun(() => ({ model: new Model(), real: driver }), commands);
                }),
                fcParams(100),
            )
            .finally(() => {
                window.removeEventListener("unhandledrejection", onRejection);
                window.removeEventListener("error", onError);
            });
        assert.deepEqual(escaped.map(String), [], "no error escaped a command");
    });
});
