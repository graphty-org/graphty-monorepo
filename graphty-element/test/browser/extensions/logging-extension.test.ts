/**
 * @file A log destination written by somebody outside this package, driven through everything
 * the element's own two destinations can do.
 *
 * WHAT A LOGGING EXTENSION IS FOR. The element writes down what it is doing -- fourteen modules
 * of it, from the data importer to the XR session -- and publishes an extension point so those
 * records can be sent somewhere other than the developer console: a panel in the page, a
 * collector in a test, a crash reporter, a file. What a third party brings is a destination: a
 * plain object with a name and a `write`, which is exactly what the element's own console and
 * remote destinations are.
 *
 * WHY THAT NEEDS A TEST. A destination that receives only some of what the element says is
 * useless in the way that is hardest to notice: nothing fails, the records simply are not there.
 * Before this point was brought to parity, three things were kept back from a third party and
 * from nobody else. The element's own remote destination was turned on by a STRING in a config
 * object, so a settings panel could store it and a URL could name it, while a third party's was
 * reachable only by holding a live JavaScript object -- no key, nothing a saved configuration
 * could write down. The element's PRIMARY destination, the console, was not a destination at
 * all: it was wired somewhere else, `getSinks()` did not list it and `removeSink("console")` did
 * not detach it, so a consumer who wanted records to go only to their own collector could not
 * have that. And one record object was handed to every destination in turn with nothing
 * stopping the first from editing what the second saw.
 *
 * WHAT THIS FILE PROVES. One dummy destination, written the way a customer would write one, put
 * through what it receives, what it can refuse, how it is turned on, and how it behaves beside
 * the element's own. Every assertion reads an OUTCOME -- what the collector is holding, what the
 * console printed, what the catalogue offers, which error code came back -- rather than checking
 * that a call did not throw.
 *
 * THE DUMMY. `acme-collector` keeps the most recent records in memory and renders each one
 * through the element's own published formatter, so a page can show a log panel with no server
 * anywhere. It is deliberately neither of the element's two destinations: it prints nothing and
 * posts nothing. It is registered by name, so a configuration can say
 * `{ use: "acme-collector", options: { capacity: 3 } }` and get one -- which is the half of this
 * extension point that did not exist.
 *
 * WHAT A CUSTOMER WOULD IMPORT. The imports below are the package's published entry points --
 * `@graphty/graphty-element`, `/logging`, `/extend`, `/catalog` and `/session` -- reached here
 * through the entry-point source files at the package root rather than through the built
 * `dist`. No deep `src/` path is used anywhere in this file, which is the point: a customer has
 * none available. The vocabulary comes from `/logging` and the registration verb from
 * `/extend`, because each name is published from exactly one address.
 */

import { afterAll, afterEach, assert, beforeEach, describe, it, type MockInstance, vi } from "vitest";

import { LOG_SINK_DESCRIPTORS, logSinkDescriptor } from "../../../catalog";
import {
    clearRegisteredLogSinksForTesting,
    isGraphtyError,
    type LogSinkDescriptor,
    registerLogSink,
} from "../../../extend";
import { Graph } from "../../../index.js";
import { GraphtyLogger, lazy, LogLevel, type LogRecord, type Sink } from "../../../logging";
import { createGraphSession } from "../../../session";

// ---------------------------------------------------------------------------------------------
// The dummy extension
// ---------------------------------------------------------------------------------------------

/** One record as the collector keeps it: the record itself, and the element's own line for it. */
interface Collected {
    /** Exactly the object the element handed over. */
    readonly record: LogRecord;
    /** The same record rendered the way the element renders its own console line. */
    readonly line: string;
}

/** What a collector is built with, once its options have been read. */
interface CollectorSpec {
    /** The name it is filed under, and the name that detaches it. */
    readonly name: string;
    /** How many of the most recent records it keeps. */
    readonly capacity: number;
    /** Whether it keeps everything the element emits, or only failures. */
    readonly only: "everything" | "errors";
    /** The parts of the element it wants to hear from, when it does not want all of them. */
    readonly categories?: readonly string[];
}

/** A destination that keeps records in memory rather than printing or posting them. */
interface Collector extends Sink {
    /** What it is holding, oldest first. */
    readonly kept: readonly Collected[];
    /** How many times it has been asked to flush. */
    readonly flushes: number;
    /** Whether the element has told it to let go of what it holds. */
    readonly closed: boolean;
    /**
     * The option values the element handed the factory, exactly as they arrived.
     *
     * The interesting half of "configured through the one options mechanism" is what the element
     * supplies for an option the caller did NOT mention. A factory that falls back to its own
     * default -- as the one below does, because it is handed plain `unknown` values and has to
     * narrow them -- would answer correctly even if the element resolved nothing at all, so the
     * arriving values are kept and asserted on directly.
     */
    readonly built: Readonly<Record<string, unknown>>;
}

/**
 * Every collector this module has built, by the name it was filed under.
 *
 * A configuration that names a destination gets one built for it, and the page never sees the
 * object -- so the module that registered the factory is what hands it back, which is what a
 * third party shipping a log panel would do.
 */
const collectors = new Map<string, Collector>();

/**
 * Build a collector.
 * @param spec - What it is called, how much it keeps, and what it keeps.
 * @param built - The option values the element handed the factory, when a configuration named
 *   this destination rather than a test constructing it directly.
 * @returns The destination, also filed under its name for {@link collectorNamed}.
 */
function createCollector(spec: CollectorSpec, built: Readonly<Record<string, unknown>> = {}): Collector {
    const kept: Collected[] = [];
    let flushes = 0;
    let closed = false;

    const collector: Collector = {
        name: spec.name,

        // The element's own destinations have no filter of their own, so this is the narrowing
        // one: it takes less than the configuration allows and can never take more.
        level: spec.only === "errors" ? LogLevel.ERROR : undefined,
        categories: spec.categories,

        write(record: LogRecord): void {
            kept.push({ record, line: GraphtyLogger.formatRecord(record) });

            if (kept.length > spec.capacity) {
                kept.shift();
            }
        },

        async flush(): Promise<void> {
            flushes += 1;
            await Promise.resolve();
        },

        dispose(): void {
            closed = true;
        },

        get kept(): readonly Collected[] {
            return kept;
        },

        get flushes(): number {
            return flushes;
        },

        get closed(): boolean {
            return closed;
        },

        built,
    };

    collectors.set(spec.name, collector);

    return collector;
}

/** What the catalogue publishes about the collector, and what a settings panel would render. */
const ACME_COLLECTOR: LogSinkDescriptor = {
    id: "acme-collector",
    plainName: "Acme in-page collector",
    description: "Keeps the most recent records in memory so a page can show them without a log server.",
    options: [
        {
            name: "name",
            plainName: "Filed under",
            type: "string",
            default: "acme-collector",
            description: "The name this destination is filed under, so a page can keep more than one.",
        },
        {
            name: "capacity",
            plainName: "Records kept",
            type: "integer",
            default: 20,
            min: 1,
            max: 500,
            description: "How many of the most recent records to hold on to.",
        },
        {
            name: "only",
            plainName: "What to keep",
            type: "enum",
            default: "everything",
            values: [
                { value: "everything", label: "Everything" },
                { value: "errors", label: "Failures only" },
            ],
            description: "Whether to keep every record or only the failures.",
        },
    ],
};

/**
 * Register the collector so a configuration can turn it on by name.
 *
 * The factory receives plain values the element has already checked against the descriptor
 * above, so it reads them and never validates them.
 */
function registerAcmeCollector(): void {
    registerLogSink({
        descriptor: ACME_COLLECTOR,
        create: (options) =>
            createCollector(
                {
                    name: typeof options.name === "string" ? options.name : "acme-collector",
                    capacity: typeof options.capacity === "number" ? options.capacity : 20,
                    only: options.only === "errors" ? "errors" : "everything",
                },
                options,
            ),
    });
}

registerAcmeCollector();

// ---------------------------------------------------------------------------------------------
// Reading the outcome
// ---------------------------------------------------------------------------------------------

/**
 * The collector a configuration built, by the name it was filed under.
 * @param name - The name.
 * @returns The collector.
 */
function collectorNamed(name: string): Collector {
    const found = collectors.get(name);
    if (!found) {
        throw new Error(`nothing built a collector named "${name}"`);
    }

    return found;
}

/**
 * What a call refused with.
 *
 * A call that did not refuse comes back saying so rather than as a null, so that an assertion
 * about the code reads the same either way and reports what actually happened.
 * @param call - The call.
 * @returns The code and the facts behind it.
 */
function refusalOf(call: () => void): { code: string; details: Readonly<Record<string, unknown>> } {
    try {
        call();
    } catch (error) {
        if (!isGraphtyError(error)) {
            return { code: `not a GraphtyError: ${String(error)}`, details: {} };
        }

        return { code: error.code, details: error.details };
    }

    return { code: "the call did not refuse at all", details: {} };
}

/** The messages a collector is holding, which is what most assertions below read. */
function messagesIn(collector: Collector): string[] {
    return collector.kept.map((entry) => entry.record.message);
}

// ---------------------------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------------------------

/** Everything attached during one test, detached afterwards so the next one starts clean. */
let attached: string[] = [];

/**
 * Attach a destination for the duration of one test.
 * @param sink - The destination.
 * @returns The same destination, so a test can read it back.
 */
function attach<T extends Sink>(sink: T): T {
    GraphtyLogger.addSink(sink);
    attached.push(sink.name);

    return sink;
}

/** A known configuration, written out in full so no test inherits another's settings. */
async function configureLoudly(): Promise<void> {
    await GraphtyLogger.configure({
        enabled: true,
        level: LogLevel.TRACE,
        modules: "*",
        moduleLevels: {},
        format: { timestamp: true, module: true, colors: true },
    });
}

describe("a third party's log destination", () => {
    let consoleDebug: MockInstance;
    let consoleInfo: MockInstance;
    let consoleWarn: MockInstance;
    let consoleError: MockInstance;

    beforeEach(async () => {
        // The element's console destination is real now, so it prints during these tests. The
        // spies both silence it and are how the tests below read what it printed.
        consoleDebug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
        consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
        consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

        collectors.clear();
        await configureLoudly();
    });

    afterEach(async () => {
        for (const name of attached) {
            GraphtyLogger.removeSink(name);
        }

        attached = [];
        collectors.clear();
        await GraphtyLogger.configure({ enabled: false });
        vi.restoreAllMocks();
    });

    afterAll(() => {
        // The registry is global and there is no unregister, so a suite that registers something
        // owes the next suite the registry it found.
        clearRegisteredLogSinksForTesting();
    });

    // -----------------------------------------------------------------------------------------
    // What it receives
    // -----------------------------------------------------------------------------------------

    it("receives every record the element emits, at every level", () => {
        const collector = attach(createCollector({ name: "acme-levels", capacity: 20, only: "everything" }));
        const logger = GraphtyLogger.getLogger(["graphty", "test"]);

        logger.trace("a trace");
        logger.debug("a debug");
        logger.info("an info");
        logger.warn("a warn");
        logger.error("an error");

        assert.deepStrictEqual(
            collector.kept.map((entry) => entry.record.level),
            [LogLevel.TRACE, LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR],
            "all five severities, in the order they were said",
        );
    });

    it("receives the records the element makes about its own work, from more than one of its modules", async () => {
        const collector = attach(createCollector({ name: "acme-element", capacity: 500, only: "everything" }));
        const container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);

        const graph = new Graph(container);
        await graph.init();
        await graph.addNodes([{ id: "a" }, { id: "b" }]);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await graph.operationQueue.waitForCompletion();

        const categories = new Set(collector.kept.map((entry) => entry.record.category.join(".")));

        graph.dispose();
        container.remove();

        assert.isAbove(collector.kept.length, 0, "the element's own work reached a third party's destination");
        assert.isAbove(categories.size, 1, "and from more than one module inside the element");
        assert.isTrue(
            [...categories].every((category) => category.startsWith("graphty")),
            `every record came from the element: ${[...categories].join(", ")}`,
        );
    });

    it("receives the whole record: when it happened, how bad it was, who said it and the facts attached", () => {
        const collector = attach(createCollector({ name: "acme-shape", capacity: 5, only: "everything" }));
        const before = new Date();

        GraphtyLogger.getLogger(["graphty", "layout", "ngraph"]).info("settled", { steps: 42, moved: false });

        const [entry] = collector.kept;

        assert.isDefined(entry);
        assert.instanceOf(entry.record.timestamp, Date);
        assert.isAtLeast(entry.record.timestamp.getTime(), before.getTime(), "timed when it was said");
        assert.strictEqual(entry.record.level, LogLevel.INFO);
        assert.deepStrictEqual([...entry.record.category], ["graphty", "layout", "ngraph"], "who said it, in full");
        assert.strictEqual(entry.record.message, "settled", "what they said, unformatted");
        assert.deepStrictEqual(entry.record.data, { steps: 42, moved: false }, "and the facts they attached");
    });

    it("receives the failure itself on an error record, not a stack flattened into a string", () => {
        const collector = attach(createCollector({ name: "acme-errors", capacity: 5, only: "everything" }));
        const failure = new TypeError("no such node");

        GraphtyLogger.getLogger(["graphty", "data"]).error("import stopped", failure, { line: 7 });

        const [entry] = collector.kept;

        assert.isDefined(entry);
        assert.strictEqual(entry.record.error, failure, "the Error object itself, so a reporter can read its type");
        assert.deepStrictEqual(entry.record.data, { line: 7 }, "with the facts left alone rather than folded together");
    });

    it("sees a trace record as TRACE rather than collapsed onto DEBUG", () => {
        const collector = attach(createCollector({ name: "acme-trace", capacity: 5, only: "everything" }));

        GraphtyLogger.getLogger(["graphty", "test"]).trace("the finest detail");

        const [entry] = collector.kept;

        assert.isDefined(entry);
        assert.strictEqual(entry.record.level, LogLevel.TRACE, "the level the caller used");
        assert.include(entry.line, "[TRACE]", "and the element's own line says so too");
    });

    it("receives an expensive value already computed, and can defer one of its own the same way", () => {
        const collector = attach(createCollector({ name: "acme-lazy", capacity: 5, only: "everything" }));
        let computed = 0;

        const logger = GraphtyLogger.getLogger(["graphty", "test"]);
        logger.info("counted", {
            total: lazy(() => {
                computed += 1;
                return 99;
            }),
        });

        const [entry] = collector.kept;

        assert.isDefined(entry);
        assert.deepStrictEqual(entry.record.data, { total: 99 }, "the destination never has to know lazy exists");
        assert.strictEqual(computed, 1, "and the work was done once");

        logger.debug("not counted", {
            total: lazy(() => {
                computed += 1;
                return 0;
            }),
        });

        assert.strictEqual(computed, 2, "a plugin's own lazy value is computed when its record is kept");

        void GraphtyLogger.configure({ level: LogLevel.INFO });
        logger.debug("dropped", {
            total: lazy(() => {
                computed += 1;
                return 0;
            }),
        });

        assert.strictEqual(computed, 2, "and never computed for a record the level drops");
    });

    it("renders a record into the same line the element prints to the console", () => {
        const collector = attach(createCollector({ name: "acme-format", capacity: 5, only: "everything" }));

        GraphtyLogger.getLogger(["graphty", "test"]).info("one event, one line");

        const [entry] = collector.kept;
        const printed = consoleInfo.mock.calls.at(-1)?.[0];

        assert.isDefined(entry);
        assert.strictEqual(
            entry.line,
            printed,
            "the collector's line and the element's console line are the same rendering",
        );
        assert.include(entry.line, "[graphty.test] [INFO] one event, one line");
    });

    // -----------------------------------------------------------------------------------------
    // What it does not receive
    // -----------------------------------------------------------------------------------------

    it("is silent for the records the configured level and modules drop", async () => {
        const collector = attach(createCollector({ name: "acme-filtered", capacity: 20, only: "everything" }));

        await GraphtyLogger.configure({ level: LogLevel.WARN, modules: ["layout"] });

        GraphtyLogger.getLogger(["graphty", "layout"]).info("below the level");
        GraphtyLogger.getLogger(["graphty", "layout"]).warn("kept");
        GraphtyLogger.getLogger(["graphty", "xr"]).error("a module nobody asked for");

        assert.deepStrictEqual(messagesIn(collector), ["kept"], "one gate on severity, one on who is speaking");
    });

    it("takes a level of its own, so one destination collects failures while another collects everything", () => {
        const failures = attach(createCollector({ name: "acme-failures", capacity: 20, only: "errors" }));
        const everything = attach(createCollector({ name: "acme-everything", capacity: 20, only: "everything" }));
        const logger = GraphtyLogger.getLogger(["graphty", "test"]);

        logger.info("ordinary");
        logger.error("broken");

        assert.deepStrictEqual(messagesIn(failures), ["broken"], "the narrowed destination took only the failure");
        assert.deepStrictEqual(messagesIn(everything), ["ordinary", "broken"], "the other one took both");
    });

    it("takes a category of its own, so a destination can watch one part of the element", () => {
        const watcher = attach(
            createCollector({ name: "acme-watch", capacity: 20, only: "everything", categories: ["layout"] }),
        );

        GraphtyLogger.getLogger(["graphty", "layout", "ngraph"]).info("from deeper in layout");
        GraphtyLogger.getLogger(["graphty", "data"]).info("from somewhere else");

        assert.deepStrictEqual(
            messagesIn(watcher),
            ["from deeper in layout"],
            "matched by segment, so a sub-module of what it asked for still counts",
        );
    });

    it("honours a level set for one module while the rest of the element stays quieter", async () => {
        const collector = attach(createCollector({ name: "acme-overrides", capacity: 20, only: "everything" }));

        await GraphtyLogger.configure({ level: LogLevel.WARN, moduleLevels: { layout: LogLevel.TRACE } });

        GraphtyLogger.getLogger(["graphty", "layout"]).debug("layout detail");
        GraphtyLogger.getLogger(["graphty", "data"]).debug("data detail");

        assert.deepStrictEqual(
            messagesIn(collector),
            ["layout detail"],
            "which is what ?graphty-element-logging=layout:debug has always claimed to mean",
        );
    });

    it("does not receive the records made before it was attached", () => {
        GraphtyLogger.getLogger(["graphty", "test"]).info("said before anybody was listening");

        const collector = attach(createCollector({ name: "acme-late", capacity: 20, only: "everything" }));

        GraphtyLogger.getLogger(["graphty", "test"]).info("said after");

        assert.deepStrictEqual(
            messagesIn(collector),
            ["said after"],
            "there is no backlog, and the element's own console loses exactly the same records",
        );
    });

    // -----------------------------------------------------------------------------------------
    // Living beside the element's own destinations
    // -----------------------------------------------------------------------------------------

    it("is attached and detached while the graph is running, and is listed for as long as it is attached", () => {
        const collector = createCollector({ name: "acme-lifecycle", capacity: 5, only: "everything" });

        assert.notInclude(
            GraphtyLogger.getSinks().map((sink) => sink.name),
            "acme-lifecycle",
        );

        GraphtyLogger.addSink(collector);

        assert.include(
            GraphtyLogger.getSinks().map((sink) => sink.name),
            "acme-lifecycle",
            "listed beside the element's own destinations",
        );
        assert.include(
            GraphtyLogger.getSinks().map((sink) => sink.name),
            "console",
            "and the element's console is one of them, not something hidden elsewhere",
        );

        GraphtyLogger.getLogger(["graphty", "test"]).info("while attached");
        assert.isTrue(GraphtyLogger.removeSink("acme-lifecycle"), "detaching reports that it detached something");
        GraphtyLogger.getLogger(["graphty", "test"]).info("after detaching");

        assert.deepStrictEqual(messagesIn(collector), ["while attached"]);
        assert.notInclude(
            GraphtyLogger.getSinks().map((sink) => sink.name),
            "acme-lifecycle",
        );
    });

    it("is told to let go of what it holds when it is detached", () => {
        const collector = createCollector({ name: "acme-closing", capacity: 5, only: "everything" });

        GraphtyLogger.addSink(collector);
        assert.isFalse(collector.closed, "still open while it is attached");

        GraphtyLogger.removeSink("acme-closing");

        assert.isTrue(collector.closed, "a destination holding a timer or a socket gets to stop it");
    });

    it("keeps receiving records when another destination throws on the same record", () => {
        attach({
            name: "acme-broken",
            write(): void {
                throw new Error("this destination is broken");
            },
        });
        const collector = attach(createCollector({ name: "acme-survivor", capacity: 5, only: "everything" }));

        GraphtyLogger.getLogger(["graphty", "test"]).info("delivered anyway");

        assert.deepStrictEqual(messagesIn(collector), ["delivered anyway"]);
        assert.isTrue(
            consoleError.mock.calls.some((call) =>
                call.some((arg: unknown) => typeof arg === "string" && arg.includes("acme-broken")),
            ),
            "and the failing destination is named rather than silently skipped",
        );
    });

    it("cannot be changed by a destination that tried to edit the record before it", () => {
        attach({
            name: "acme-vandal",
            write(record: LogRecord): void {
                Object.assign(record.data ?? {}, { steps: 0 });
            },
        });
        const collector = attach(createCollector({ name: "acme-victim", capacity: 5, only: "everything" }));

        GraphtyLogger.getLogger(["graphty", "test"]).info("measured", { steps: 42 });

        const [entry] = collector.kept;

        assert.isDefined(entry);
        assert.isTrue(Object.isFrozen(entry.record), "one record is handed to every destination, so it is frozen");
        assert.deepStrictEqual(entry.record.data, { steps: 42 }, "and what the first destination tried did not land");
    });

    it("flushes on demand, and another destination's failed flush does not stop its own", async () => {
        attach({
            name: "acme-bad-flush",
            write(): void {
                // Nothing to keep; this destination exists to fail at flushing.
            },
            flush: () => Promise.reject(new Error("the collector's server is down")),
        });
        const collector = attach(createCollector({ name: "acme-flusher", capacity: 5, only: "everything" }));

        await GraphtyLogger.flush();

        assert.strictEqual(collector.flushes, 1, "asked to flush even though another destination rejected");
    });

    it("takes the place of the element's console, so records go only where the consumer sent them", () => {
        const collector = attach(createCollector({ name: "acme-only", capacity: 5, only: "everything" }));

        assert.isTrue(GraphtyLogger.removeSink("console"), "the element's own console is detachable");

        GraphtyLogger.getLogger(["graphty", "test"]).info("for the collector alone");

        assert.deepStrictEqual(messagesIn(collector), ["for the collector alone"]);
        assert.strictEqual(consoleInfo.mock.calls.length, 0, "and nothing was printed");
    });

    it("gives the console back when a configuration names it again", async () => {
        attach(createCollector({ name: "acme-sharing", capacity: 5, only: "everything" }));

        GraphtyLogger.removeSink("console");
        await GraphtyLogger.configure({ sinks: [{ use: "console", options: { colors: true } }] });

        GraphtyLogger.getLogger(["graphty", "test"]).info("printed again");

        assert.include(
            GraphtyLogger.getSinks().map((sink) => sink.name),
            "console",
            "the element's own destination is asked for back by the same name any other is",
        );
        assert.isTrue(
            consoleInfo.mock.calls.some(
                (call) => typeof call[0] === "string" && call[0].includes("[INFO] printed again"),
            ),
            "and it prints once it is back",
        );
    });

    it("logs under its own category, and reaches both the collector and the element's console", () => {
        const collector = attach(createCollector({ name: "acme-category", capacity: 5, only: "everything" }));

        GraphtyLogger.getLogger(["acme", "reader"]).warn("a plugin's own record");

        assert.deepStrictEqual(messagesIn(collector), ["a plugin's own record"]);
        assert.isTrue(
            consoleWarn.mock.calls.some(
                (call) => typeof call[0] === "string" && call[0].includes("[acme.reader] [WARN] a plugin's own record"),
            ),
            "a developer watching devtools sees a plugin's records, not only the element's",
        );
        assert.strictEqual(consoleDebug.mock.calls.length, 0, "and nothing was routed to the wrong console method");
    });

    // -----------------------------------------------------------------------------------------
    // Turned on by a name rather than by a reference
    // -----------------------------------------------------------------------------------------

    it("is offered by the session's catalogue beside the element's own two destinations", () => {
        const session = createGraphSession();
        const offered = session.catalog.logSinks();

        session.dispose();

        const acme = offered.find((descriptor) => descriptor.id === "acme-collector");

        assert.isDefined(acme, "a settings panel built from the catalogue can offer it");
        assert.strictEqual(acme.plainName, "Acme in-page collector", "under the name its author chose");
        assert.deepStrictEqual(
            acme.options.map((option) => option.name),
            ["name", "capacity", "only"],
            "with the options a form would render",
        );
        assert.deepStrictEqual(
            offered.slice(0, LOG_SINK_DESCRIPTORS.length),
            [...LOG_SINK_DESCRIPTORS],
            "the element's own console and remote come first, unchanged",
        );
        assert.strictEqual(
            logSinkDescriptor("acme-collector")?.id,
            "acme-collector",
            "and the same lookup that finds a destination the element ships finds it",
        );
    });

    it("is turned on by a name in a configuration rather than by holding a live object", async () => {
        await GraphtyLogger.configure({ sinks: [{ use: "acme-collector", options: { name: "from-a-name" } }] });
        attached.push("from-a-name");

        GraphtyLogger.getLogger(["graphty", "test"]).info("nobody passed an object");

        assert.deepStrictEqual(messagesIn(collectorNamed("from-a-name")), ["nobody passed an object"]);
        assert.include(
            GraphtyLogger.getSinks().map((sink) => sink.name),
            "from-a-name",
        );
    });

    it("is turned on again from a configuration that was written to storage and read back", async () => {
        const stored = JSON.stringify({ sinks: [{ use: "acme-collector", options: { name: "restored", capacity: 2 } }] });
        const restored = JSON.parse(stored) as { sinks: { use: string; options: Record<string, unknown> }[] };

        await GraphtyLogger.configure(restored);
        attached.push("restored");

        const logger = GraphtyLogger.getLogger(["graphty", "test"]);
        logger.info("one");
        logger.info("two");
        logger.info("three");

        assert.deepStrictEqual(
            messagesIn(collectorNamed("restored")),
            ["two", "three"],
            "the destination and the size it was configured with both survived the round trip",
        );
    });

    it("is built with the options its descriptor declares, and with the defaults it did not mention", async () => {
        await GraphtyLogger.configure({ sinks: [{ use: "acme-collector", options: { only: "errors" } }] });
        attached.push("acme-collector");

        const logger = GraphtyLogger.getLogger(["graphty", "test"]);
        logger.info("ordinary");
        logger.error("broken");

        assert.deepStrictEqual(
            messagesIn(collectorNamed("acme-collector")),
            ["broken"],
            "the option it was given took effect",
        );
        assert.include(
            GraphtyLogger.getSinks().map((sink) => sink.name),
            "acme-collector",
            "and the name it did not mention fell back to the default its descriptor declares",
        );
        assert.deepStrictEqual(
            collectorNamed("acme-collector").built,
            { name: "acme-collector", capacity: 20, only: "errors" },
            "the element filled in every declared default before the factory ran, rather than " +
                "handing over only what the caller wrote and leaving the factory to invent the rest",
        );
    });

    it("refuses an option it never declared, and a value outside the range it did", () => {
        const unknownOption = refusalOf(() => {
            void GraphtyLogger.configure({ sinks: [{ use: "acme-collector", options: { colour: "red" } }] });
        });
        const tooSmall = refusalOf(() => {
            void GraphtyLogger.configure({ sinks: [{ use: "acme-collector", options: { capacity: 0 } }] });
        });
        const notAChoice = refusalOf(() => {
            void GraphtyLogger.configure({ sinks: [{ use: "acme-collector", options: { only: "warnings" } }] });
        });

        assert.strictEqual(unknownOption.code, "E_UNKNOWN_OPTION");
        assert.deepStrictEqual(
            unknownOption.details.available,
            ["name", "capacity", "only"],
            "saying what it could have asked for",
        );
        assert.strictEqual(tooSmall.code, "E_OPTION_RANGE");
        assert.strictEqual(tooSmall.details.min, 1, "with the bound it broke");
        assert.strictEqual(notAChoice.code, "E_OPTION_RANGE");
        assert.deepStrictEqual(notAChoice.details.values, ["everything", "errors"]);
    });

    it("is refused when a configuration names a destination nothing registered", () => {
        const refusal = refusalOf(() => {
            void GraphtyLogger.configure({ sinks: [{ use: "acme-collecter" }] });
        });

        assert.strictEqual(refusal.code, "E_UNKNOWN_SINK", "a typed name is refused rather than silently ignored");
        assert.deepStrictEqual(
            refusal.details.available,
            ["console", "remote", "acme-collector"],
            "and the answer says what could have been named",
        );
    });

    it("cannot take a name the element ships, or replace another plugin's without saying so", () => {
        const secondFactory = (): Sink => createCollector({ name: "acme-collector", capacity: 1, only: "everything" });

        const builtIn = refusalOf(() => {
            registerLogSink({ descriptor: { ...ACME_COLLECTOR, id: "console" }, create: secondFactory });
        });
        const strictDuplicate = refusalOf(() => {
            registerLogSink({ descriptor: ACME_COLLECTOR, create: secondFactory }, { strict: true });
        });

        assert.strictEqual(
            builtIn.code,
            "E_DUPLICATE_PLUGIN",
            "a stored configuration that named console yesterday has to mean console today",
        );
        assert.strictEqual(builtIn.details.builtIn, true, "and the refusal says the name belongs to the element");
        assert.strictEqual(
            strictDuplicate.code,
            "E_DUPLICATE_PLUGIN",
            "a build that wants a collision to be loud asks for strictness and gets it",
        );
    });

    it("is attached by a configuration without that configuration undoing the level and the modules", async () => {
        await GraphtyLogger.configure({ level: LogLevel.DEBUG, modules: ["test"] });
        await GraphtyLogger.configure({ sinks: [{ use: "acme-collector", options: { name: "no-side-effects" } }] });
        attached.push("no-side-effects");

        GraphtyLogger.getLogger(["graphty", "test"]).debug("still listening at debug");
        GraphtyLogger.getLogger(["graphty", "layout"]).debug("still not listening to layout");

        assert.deepStrictEqual(
            messagesIn(collectorNamed("no-side-effects")),
            ["still listening at debug"],
            "attaching a destination is not a reason to put the level back to INFO",
        );
    });
});
