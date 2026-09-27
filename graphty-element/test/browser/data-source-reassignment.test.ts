/**
 * Every load has an id, and assigning the data-source pair a second time starts a second load.
 *
 * A load started by assigning `dataSource` / `dataSourceConfig` used to latch for the element's
 * life: the second assignment set both properties, started nothing and reported nothing, while the
 * old graph stayed on screen. And no load event said which load it was about, so a host that
 * started a second load could not tell the first one's report from its own.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import { type BaseDataSourceConfig, DataSource, type DataSourceChunk, isGraphtyError } from "../../extend";
import type { Graphty } from "../../index.js";
import type { DataLoadingCompleteEvent, DataLoadingErrorEvent } from "../../src/events.js";

const FIRST_GRAPH = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ src: "a", dst: "b" }] });
const SECOND_GRAPH = JSON.stringify({ nodes: [{ id: "x" }, { id: "y" }, { id: "z" }], edges: [] });

/** Loads of the "gated" format below wait here, by name, until the test opens their gate. */
const gates = new Map<string, Promise<void>>();

interface GatedConfig extends BaseDataSourceConfig {
    name?: string;
    ids?: string[];
}

/** A format whose source finishes only when the test says so, to make two loads overlap. */
class GatedDataSource extends DataSource {
    static type = "gated";
    static descriptor = {
        id: "gated",
        plainName: "Gated test format",
        extensions: [".gated"],
        mimeTypes: ["application/x-graphty-gated-test"],
        canImport: true,
        canExport: false,
        options: [],
    };

    readonly #config: GatedConfig;

    constructor(opts: GatedConfig) {
        super();
        this.#config = opts;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.#config;
    }

    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        await gates.get(this.#config.name ?? "");
        yield* this.chunkData(DataSource.toRecords((this.#config.ids ?? []).map((id) => ({ id }))), []);
    }
}

DataSource.register(GatedDataSource);

/** Hold loads named `name` until the returned function is called. */
function gate(name: string): () => void {
    let open = (): void => undefined;
    gates.set(
        name,
        new Promise((resolve) => {
            open = resolve;
        }),
    );
    return open;
}

/** Record the promise of every load the element starts from here on. */
function captureLoads(element: Graphty): Promise<unknown>[] {
    const { graph } = element;
    assert.isDefined(graph);
    const started: Promise<unknown>[] = [];
    const original = graph.addDataFromSource.bind(graph);
    graph.addDataFromSource = (...args) => {
        const load = original(...args);
        started.push(load);
        return load;
    };
    return started;
}

let mounted: Graphty | null = null;

async function mount(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    mounted = element;
    return element;
}

function next<T>(element: Graphty, type: string): Promise<T> {
    return new Promise((resolve) => {
        element.addEventListener(
            type,
            (event) => {
                resolve((event as CustomEvent<T>).detail);
            },
            { once: true },
        );
    });
}

function nodeIds(element: Graphty): string[] {
    return [...(element.graph?.getDataManager().nodes.keys() ?? [])].map(String).sort();
}

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

describe("the data-source pair", () => {
    test("a second assignment without clearData loads the second dataset, in place of the first", async () => {
        const element = await mount();

        const first = next<DataLoadingCompleteEvent>(element, "data-loading-complete");
        element.dataSource = "json";
        element.dataSourceConfig = { data: FIRST_GRAPH };
        const firstReport = await first;
        assert.deepStrictEqual(nodeIds(element), ["a", "b"]);

        const second = next<DataLoadingCompleteEvent>(element, "data-loading-complete");
        element.dataSourceConfig = { data: SECOND_GRAPH };
        const secondReport = await second;

        assert.deepStrictEqual(nodeIds(element), ["x", "y", "z"]);
        assert.isNumber(firstReport.loadId);
        assert.isNumber(secondReport.loadId);
        assert.notStrictEqual(firstReport.loadId, secondReport.loadId, "each load has its own id");
    });

    test("assigning both halves in one tick starts one load, not two", async () => {
        const element = await mount();
        let completions = 0;
        element.addEventListener("data-loading-complete", () => completions++);

        const done = next(element, "data-loaded");
        element.dataSource = "json";
        element.dataSourceConfig = { data: FIRST_GRAPH };
        await done;
        await new Promise((resolve) => setTimeout(resolve, 50));

        assert.strictEqual(completions, 1);
    });

    test("re-assigning the pair already loaded starts no load; a new config object does", async () => {
        const element = await mount();
        const config = { data: FIRST_GRAPH };
        const done = next(element, "data-loaded");
        element.dataSource = "json";
        element.dataSourceConfig = config;
        await done;

        const { graph } = element;
        assert.isDefined(graph);
        let started = 0;
        const original = graph.addDataFromSource.bind(graph);
        graph.addDataFromSource = (...args) => {
            started++;
            return original(...args);
        };

        // A host re-rendering with the same props.
        element.dataSource = "json";
        element.dataSourceConfig = config;
        await Promise.resolve();
        assert.strictEqual(started, 0);

        const reloaded = next(element, "data-loaded");
        element.dataSourceConfig = { data: FIRST_GRAPH };
        await Promise.resolve();
        assert.strictEqual(started, 1);
        await reloaded;
    });

    test("the pair assigned last wins, even when an earlier pair's source finishes after it", async () => {
        const element = await mount();
        const first = next(element, "data-loaded");
        element.dataSource = "json";
        element.dataSourceConfig = { data: FIRST_GRAPH };
        await first;

        const loads = captureLoads(element);
        const openSlow = gate("slow");
        element.dataSource = "gated";
        element.dataSourceConfig = { name: "slow", ids: ["p", "q"] };
        await Promise.resolve();

        const fast = next<DataLoadingCompleteEvent>(element, "data-loading-complete");
        element.dataSourceConfig = { name: "fast", ids: ["x", "y", "z"] };
        await fast;
        assert.deepStrictEqual(nodeIds(element), ["x", "y", "z"]);

        openSlow();
        const [slow] = await Promise.allSettled(loads);
        assert.strictEqual(slow.status, "rejected");
        const reason: unknown = slow.status === "rejected" ? slow.reason : undefined;
        assert.isTrue(isGraphtyError(reason) && reason.code === "E_SUPERSEDED");
        assert.deepStrictEqual(nodeIds(element), ["x", "y", "z"], "the abandoned load left the graph alone");
    });

    test("re-assigning a pair whose load failed retries it", async () => {
        const element = await mount();
        const config = { data: "{ not json" };
        const loads = captureLoads(element);
        element.dataSource = "json";
        element.dataSourceConfig = config;
        await Promise.resolve();
        await Promise.allSettled(loads);

        element.dataSourceConfig = config;
        await Promise.resolve();
        assert.strictEqual(loads.length, 2);
        await Promise.allSettled(loads);
    });

    test("a failing load's data-loading-error carries its id", async () => {
        const element = await mount();

        const failed = next<DataLoadingErrorEvent>(element, "data-loading-error");
        element.dataSource = "json";
        element.dataSourceConfig = { data: "{ not json" };
        const report = await failed;

        assert.isNumber(report.loadId);
    });
});

describe("the awaited load methods", () => {
    test("loadFromFile resolves to the id its events carry", async () => {
        const element = await mount();
        const complete = next<DataLoadingCompleteEvent>(element, "data-loading-complete");
        const loaded = next<{ details: { loadId?: number } }>(element, "data-loaded");

        const { loadId } = await element.loadFromFile(new File([FIRST_GRAPH], "g.json"));

        assert.isNumber(loadId);
        assert.strictEqual((await complete).loadId, loadId);
        assert.strictEqual((await loaded).details.loadId, loadId);
    });

    test("a load started before a replacing load is superseded, whichever finishes first", async () => {
        const element = await mount();
        const openAdditive = gate("slow-additive");
        const openReplacing = gate("slow-replacing");

        const additive = element.addDataFromSource("gated", { name: "slow-additive", ids: ["a1", "a2"] });
        const replacing = element.addDataFromSource(
            "gated",
            { name: "slow-replacing", ids: ["r1"] },
            { replace: true },
        );
        const latest = element.addDataFromSource("gated", { name: "latest", ids: ["n1", "n2"] }, { replace: true });

        await latest;
        openReplacing();
        openAdditive();
        const [first, second] = await Promise.allSettled([additive, replacing]);

        for (const settled of [first, second]) {
            const reason: unknown = settled.status === "rejected" ? settled.reason : undefined;
            assert.isTrue(isGraphtyError(reason) && reason.code === "E_SUPERSEDED");
        }

        assert.deepStrictEqual(nodeIds(element), ["n1", "n2"]);
    });

    test("addDataFromSource resolves to a new id per load", async () => {
        const element = await mount();

        const a = await element.addDataFromSource("json", { data: FIRST_GRAPH });
        const b = await element.addDataFromSource("json", { data: SECOND_GRAPH });

        assert.isAbove(b.loadId, a.loadId);
    });
});
