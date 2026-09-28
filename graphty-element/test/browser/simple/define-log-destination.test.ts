/**
 * @file The log destination guide's toy examples, run on a small real graph.
 *
 * Each example is the file the guide includes (docs/examples/simple-tier/), imported here as it
 * is written, so the guide cannot show code these tests did not run. Every assertion reads what
 * a reader would see: the requests the telemetry destination sent, the lines the panel shows,
 * the error a malformed definition gets, and the catalogue entry a settings panel renders.
 *
 * Owner decision 34 (delivery whatever the global `enabled` flag) is NOT taken, so a simple
 * destination follows today's rule: while logging is globally off it receives nothing. The
 * examples turn logging on themselves, and one test here proves the rule.
 */

import { afterEach, assert, beforeEach, describe, it, type MockInstance, vi } from "vitest";

import { LOG_SINK_DESCRIPTORS, logSinkDescriptor } from "../../../catalog";
import { showLayoutLog } from "../../../docs/examples/simple-tier/log-destination-panel";
import {
    clearRegisteredLogSinksForTesting,
    defineLogDestination,
    isGraphtyError,
    registerLogSink,
} from "../../../extend";
import { GraphtyLogger, LogLevel } from "../../../logging";
import { createGraphSession } from "../../../session";
import { Graph } from "../../../src/Graph";

/** A small real graph: a triangle. */
const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }];
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "a" },
];

/** One request the telemetry destination sent. */
interface Sent {
    readonly url: string;
    readonly method: string | undefined;
    readonly body: Record<string, unknown>;
}

/**
 * Put a graph on the page.
 * @returns The graph and a function that takes it away again.
 */
async function drawGraph(): Promise<{ graph: Graph; remove: () => void }> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);

    const graph = new Graph(container);
    await graph.init();
    await graph.addNodes(NODES);
    await graph.addEdges(EDGES);
    await graph.operationQueue.waitForCompletion();

    return {
        graph,
        remove: () => {
            graph.dispose();
            container.remove();
        },
    };
}

/**
 * What a call refused with.
 * @param call - The call.
 * @returns The code, the member at fault and the message.
 */
function refusalOf(call: () => unknown): { code: string; field: unknown; message: string } {
    try {
        call();
    } catch (error) {
        if (!isGraphtyError(error)) {
            return { code: `not a GraphtyError: ${String(error)}`, field: undefined, message: "" };
        }

        return { code: error.code, field: error.details.field, message: error.message };
    }

    return { code: "the call did not refuse at all", field: undefined, message: "" };
}

describe("defineLogDestination on a real graph", () => {
    let consoleSpies: MockInstance[] = [];
    let sent: Sent[] = [];
    const detachers: (() => void)[] = [];

    beforeEach(() => {
        // Logging on means the element's console destination prints too; keep the run quiet.
        consoleSpies = (["debug", "info", "warn", "error", "log"] as const).map((level) =>
            vi.spyOn(console, level).mockImplementation(() => undefined),
        );

        sent = [];
        vi.stubGlobal(
            "fetch",
            vi.fn((url: string, init?: RequestInit) => {
                sent.push({
                    url,
                    method: init?.method,
                    body: JSON.parse(init?.body as string) as Record<string, unknown>,
                });
                return Promise.resolve(new Response(null, { status: 204 }));
            }),
        );
    });

    afterEach(async () => {
        for (const detach of detachers.splice(0)) {
            detach();
        }

        GraphtyLogger.removeSink("acme-telemetry");
        // After every test, so one test's registration (the telemetry example's) is not another's.
        clearRegisteredLogSinksForTesting();
        await GraphtyLogger.configure({ enabled: false, level: LogLevel.INFO });
        vi.unstubAllGlobals();
        for (const spy of consoleSpies) {
            spy.mockRestore();
        }
    });

    it("sends the element's own errors to the telemetry endpoint, and nothing less severe (telemetry example)", async () => {
        await import("../../../docs/examples/simple-tier/log-destination-telemetry");
        const { graph, remove } = await drawGraph();

        // A load that cannot parse: the element logs "Data source loading failed" as an error.
        const failed = await graph.addDataFromSource("json", { data: "{ this is not json" }).then(
            () => false,
            () => true,
        );
        await GraphtyLogger.flush();
        remove();

        assert.isTrue(failed, "the load failed, which is what produced the error record");
        assert.isAbove(sent.length, 0, "the error reached the endpoint");
        for (const request of sent) {
            assert.strictEqual(request.url, "https://telemetry.acme.example/v1/errors");
            assert.strictEqual(request.method, "POST");
            assert.strictEqual(request.body.level, "error", "only errors: the info records of the load stayed home");
        }

        const failure = sent.find((request) => request.body.message === "Data source loading failed");
        assert.isDefined(
            failure,
            `the load failure was sent; sent: ${sent.map((r) => String(r.body.message)).join(" | ")}`,
        );
        assert.strictEqual(failure.body.category, "graphty.data", "the category is one dotted string");
        assert.isString(failure.body.time, "the time survives JSON as an ISO string");
        const error = failure.body.error as Record<string, unknown> | undefined;
        assert.isDefined(error, "the failure itself survives JSON.stringify as plain data");
        assert.isString(error.name);
        assert.isString(error.message);
    });

    it("shows layout records at info and above, and nothing from the rest of the element (panel example)", async () => {
        const panel = document.createElement("pre");
        detachers.push(await showLayoutLog(panel));
        await GraphtyLogger.configure({ level: LogLevel.TRACE });

        const { graph, remove } = await drawGraph();
        await graph.addDataFromSource("json", { data: JSON.stringify({ nodes: [{ id: "d" }], edges: [] }) });
        await graph.setLayout("circular");
        await graph.operationQueue.waitForCompletion();
        remove();

        const lines = (panel.textContent ?? "").split("\n").filter((line) => line !== "");

        assert.include(lines, "info: Setting layout", "the layout change is on the panel");
        assert.isTrue(
            lines.every((line) => /^(info|warn|error): /.test(line)),
            `no debug or trace line, though the global level is TRACE: ${lines.join(" | ")}`,
        );
        assert.notInclude(lines, "info: Loading data source", "a data record is not a layout record");
        assert.notInclude(lines, "info: Initializing managers", "nor is a lifecycle record");
    });

    it("stops receiving once the function it returned is called", async () => {
        const panel = document.createElement("pre");
        const stop = await showLayoutLog(panel);
        const { graph, remove } = await drawGraph();

        stop();
        const before = panel.textContent;
        await graph.setLayout("circular");
        await graph.operationQueue.waitForCompletion();
        remove();

        assert.strictEqual(panel.textContent, before, "nothing arrived after it was stopped");
        assert.isFalse(
            GraphtyLogger.getSinks().some((sink) => sink.name === "acme-layout-panel"),
            "and it is no longer attached",
        );
    });

    it("receives nothing while logging is globally off (today's rule; owner decision 34 not taken)", async () => {
        const records: string[] = [];
        detachers.push(
            defineLogDestination({
                id: "acme-quiet",
                level: "trace",
                write: (record) => {
                    records.push(record.message);
                },
            }),
        );
        await GraphtyLogger.configure({ enabled: false });

        const { graph, remove } = await drawGraph();
        await graph.setLayout("circular");
        await graph.addDataFromSource("json", { data: "{ this is not json" }).catch(() => undefined);
        await graph.operationQueue.waitForCompletion();
        remove();

        assert.deepStrictEqual(records, [], "not one record, not even the load failure");
    });

    it("refuses a destination with no write function, naming the member, before anything is attached", () => {
        const refusal = refusalOf(() =>
            defineLogDestination({ id: "acme-telemetry" } as unknown as Parameters<typeof defineLogDestination>[0]),
        );

        assert.strictEqual(refusal.code, "E_BAD_COMMAND");
        assert.strictEqual(refusal.field, "write");
        assert.strictEqual(
            refusal.message,
            'defineLogDestination("acme-telemetry"): "write" must be a function; got undefined.',
        );
        assert.isUndefined(logSinkDescriptor("acme-telemetry"), "nothing was registered");
    });

    it("refuses a level that is not a level word, and a name the element keeps for itself", () => {
        const level = refusalOf(() =>
            defineLogDestination({
                id: "acme-loud",
                level: "warning" as "warn",
                write: () => undefined,
            }),
        );
        assert.strictEqual(level.code, "E_BAD_COMMAND");
        assert.strictEqual(level.field, "level");
        assert.match(
            level.message,
            /^defineLogDestination\("acme-loud"\): "level" must be one of "error", "warn", "info", "debug" or "trace"/,
        );

        const reserved = refusalOf(() => defineLogDestination({ id: "console", write: () => undefined }));
        assert.strictEqual(reserved.code, "E_DUPLICATE_PLUGIN", "the console destination cannot be replaced by id");
    });

    it("shows up exactly like a destination registered through the advanced tier", async () => {
        registerLogSink({
            descriptor: { id: "acme-advanced", plainName: "Acme advanced", description: "", options: [] },
            create: () => ({ name: "acme-advanced", write: () => undefined }),
        });
        const records: string[] = [];
        defineLogDestination({
            id: "acme-simple-sink",
            attach: false,
            write: (record) => {
                records.push(record.message);
            },
        });

        const session = createGraphSession();
        const offered = session.catalog.logSinks();
        session.dispose();

        const simple = offered.find((descriptor) => descriptor.id === "acme-simple-sink");
        const advanced = offered.find((descriptor) => descriptor.id === "acme-advanced");
        assert.isDefined(simple, "the catalogue offers it beside the others");
        assert.isDefined(advanced);
        assert.deepStrictEqual(Object.keys(simple).sort(), Object.keys(advanced).sort(), "the same descriptor shape");
        assert.deepStrictEqual(simple, {
            id: "acme-simple-sink",
            plainName: "Acme simple sink",
            description: "",
            options: [],
        });
        assert.deepStrictEqual(logSinkDescriptor("acme-simple-sink"), simple, "the same lookup finds it");
        assert.deepStrictEqual(
            offered.slice(0, LOG_SINK_DESCRIPTORS.length),
            [...LOG_SINK_DESCRIPTORS],
            "the element's own destinations come first, unchanged",
        );

        // attach: false only registered it; a configuration turns it on by id, as for any destination.
        assert.isFalse(GraphtyLogger.getSinks().some((sink) => sink.name === "acme-simple-sink"));
        await GraphtyLogger.configure({ enabled: true, sinks: [{ use: "acme-simple-sink" }] });
        detachers.push(() => GraphtyLogger.removeSink("acme-simple-sink"));
        assert.isTrue(
            GraphtyLogger.getSinks().some((sink) => sink.name === "acme-simple-sink"),
            "attached under its id",
        );

        GraphtyLogger.getLogger(["graphty", "acme"]).warn("turned on by name");
        assert.deepStrictEqual(records, ["turned on by name"]);
    });

    it("flushes every destination when the page is hidden", async () => {
        let flushes = 0;
        GraphtyLogger.addSink({
            name: "acme-flush-counter",
            write: () => undefined,
            flush: () => {
                flushes += 1;
                return Promise.resolve();
            },
        });
        detachers.push(() => GraphtyLogger.removeSink("acme-flush-counter"));
        detachers.push(defineLogDestination({ id: "acme-hidden", write: () => Promise.resolve() }));

        window.dispatchEvent(new PageTransitionEvent("pagehide"));
        await GraphtyLogger.flush();

        assert.isAtLeast(flushes, 2, "the page going away flushed it, beside the explicit flush above");
    });
});
