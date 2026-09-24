/**
 * @file The half of the Logging extension point that only a test without a browser can prove.
 *
 * A log destination's headline claim is that it works with no renderer: a build script, a worker,
 * a server-side check and a unit test all want the element's records without a canvas, a scene or
 * a custom element anywhere. The rest of this extension point is exercised in
 * `test/browser/extensions/logging-extension.test.ts`, which runs in Chromium and therefore
 * cannot tell whether a renderer was needed or merely present.
 *
 * So this file imports the published entry points a destination is written against --
 * `@graphty/graphty-element/logging` for the vocabulary, `/extend` for the verb that registers
 * one under a name, `/session` for the element itself -- attaches a destination, and reads a
 * record back, in a project with no DOM at all. `test/packaging/node-safe-entries.test.ts`
 * proves those entry points reach no Babylon.js and no Lit; this proves the seam behind them
 * actually works from there.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { clearRegisteredLogSinksForTesting, registerLogSink } from "../../extend";
import { GraphtyLogger, LogLevel, type LogRecord } from "../../logging";
import { createGraphSession } from "../../session";

/** What the destination under test collected, in the order it arrived. */
let collected: LogRecord[] = [];

/** The descriptor a settings panel would render for this destination. */
const HEADLESS_COLLECTOR = {
    id: "headless-collector",
    plainName: "Headless collector",
    description: "Keeps records in memory, for a build, a worker or a test with no page around it.",
    options: [
        {
            name: "label",
            plainName: "Filed under",
            type: "string" as const,
            default: "headless-collector",
            description: "The name this destination is filed under.",
        },
    ],
};

describe("a log destination attached where there is no renderer", () => {
    beforeEach(async () => {
        collected = [];
        registerLogSink({
            descriptor: HEADLESS_COLLECTOR,
            create: (options) => ({
                name: typeof options.label === "string" ? options.label : "headless-collector",
                write: (record) => {
                    collected.push(record);
                },
            }),
        });

        await GraphtyLogger.configure({
            enabled: true,
            level: LogLevel.TRACE,
            modules: "*",
            moduleLevels: {},
            format: { timestamp: true, module: true, colors: true },
            sinks: [{ use: "headless-collector" }],
        });

        // The element's console destination works here too -- it printed to this test's own
        // stderr before this line was added -- but a build script's output is not the thing
        // under test, so it is detached.
        GraphtyLogger.removeSink("console");
    });

    afterEach(async () => {
        GraphtyLogger.removeSink("headless-collector");
        await GraphtyLogger.configure({ enabled: false });
        clearRegisteredLogSinksForTesting();
    });

    it("runs somewhere with no document at all, which is the claim being tested", () => {
        assert.strictEqual(typeof document, "undefined", "no DOM, so nothing here can have needed one");
    });

    it("receives a record with its level, its category and the facts attached", () => {
        GraphtyLogger.getLogger(["acme", "build"]).warn("two nodes were dropped", { dropped: 2 });

        const [record] = collected;

        assert.isDefined(record, "the destination a configuration named received the record");
        assert.strictEqual(record.level, LogLevel.WARN);
        assert.deepStrictEqual([...record.category], ["acme", "build"]);
        assert.strictEqual(record.message, "two nodes were dropped");
        assert.deepStrictEqual(record.data, { dropped: 2 });
    });

    it("is offered by a session's catalogue built with no graph and no view", () => {
        const session = createGraphSession();
        const offered = session.catalog.logSinks().map((descriptor) => descriptor.id);

        session.dispose();

        assert.include(offered, "headless-collector", "a settings panel can be built outside a browser");
        assert.include(offered, "console", "beside the element's own destinations");
    });
});
