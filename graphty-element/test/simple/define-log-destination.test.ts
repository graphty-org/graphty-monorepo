/**
 * @file `defineLogDestination` with no graph and no renderer: what a simple destination
 * receives, what the element does with a promise its `write` returns, and what a malformed
 * definition is told (design/extensions/simple-tier.md section 4.7, logging.md section 4).
 *
 * Owner decision 34 is NOT taken: a simple destination follows today's rule and receives nothing
 * while logging is globally off. Every test here turns logging on first, except the one that
 * proves the rule.
 */

import { afterEach, assert, beforeEach, describe, it, type MockInstance, vi } from "vitest";

import { logSinkDescriptor } from "../../catalog";
import {
    clearRegisteredLogSinksForTesting,
    defineLogDestination,
    isGraphtyError,
    type LogDestinationDefinition,
    type PlainLogRecord,
} from "../../extend";
import { GraphtyLogger, LogLevel } from "../../logging";

/** The logger a test speaks through, as a plugin of the element would. */
const logger = (): ReturnType<typeof GraphtyLogger.getLogger> => GraphtyLogger.getLogger(["graphty", "acme", "test"]);

/**
 * What a definition was refused with.
 * @param definition - What the author passed.
 * @returns The code, the member at fault and the message.
 */
function refusalOf(definition: unknown): { code: string; field: unknown; message: string } {
    try {
        defineLogDestination(definition as LogDestinationDefinition);
    } catch (error) {
        if (!isGraphtyError(error)) {
            return { code: `not a GraphtyError: ${String(error)}`, field: undefined, message: "" };
        }

        return { code: error.code, field: error.details.field, message: error.message };
    }

    return { code: "the call did not refuse at all", field: undefined, message: "" };
}

/** Let every pending promise and fake timer run. */
async function settle(): Promise<void> {
    await vi.runAllTimersAsync();
    await GraphtyLogger.flush();
}

describe("defineLogDestination", () => {
    const detachers: (() => void)[] = [];
    let consoleSpies: MockInstance[] = [];

    beforeEach(async () => {
        consoleSpies = (["debug", "info", "warn", "error", "log"] as const).map((level) =>
            vi.spyOn(console, level).mockImplementation(() => undefined),
        );
        await GraphtyLogger.configure({ enabled: true, level: LogLevel.TRACE, modules: "*" });
    });

    afterEach(async () => {
        for (const detach of detachers.splice(0)) {
            detach();
        }

        vi.useRealTimers();
        clearRegisteredLogSinksForTesting();
        await GraphtyLogger.configure({ enabled: false, level: LogLevel.INFO });
        for (const spy of consoleSpies) {
            spy.mockRestore();
        }
    });

    /**
     * Define a destination for the length of one test.
     * @param definition - The definition.
     * @returns What `defineLogDestination` returned.
     */
    function define(definition: LogDestinationDefinition): () => void {
        const detach = defineLogDestination(definition);
        detachers.push(detach);
        return detach;
    }

    describe("what it receives", () => {
        it("receives a plain record: the time, the level as a word, the category as one dotted string", () => {
            const received: PlainLogRecord[] = [];
            define({ id: "acme-plain", level: "trace", write: (record) => void received.push(record) });

            logger().info("settled", { steps: 42 });

            assert.lengthOf(received, 1);
            const [record] = received;
            assert.instanceOf(record.time, Date);
            assert.strictEqual(record.level, "info");
            assert.strictEqual(record.category, "graphty.acme.test");
            assert.strictEqual(record.message, "settled");
            assert.deepStrictEqual(record.data, { steps: 42 });
            assert.isTrue(Object.isFrozen(record), "the record is frozen");
        });

        it("carries a failure as plain data that JSON.stringify keeps", () => {
            const received: PlainLogRecord[] = [];
            define({ id: "acme-failures", level: "error", write: (record) => void received.push(record) });

            logger().error("import stopped", new TypeError("no such node"));

            const parsed = JSON.parse(JSON.stringify(received[0])) as Record<string, unknown>;
            assert.deepInclude(parsed.error as object, { name: "TypeError", message: "no such node" });
            assert.isString((parsed.error as Record<string, unknown>).stack);
            assert.isString(parsed.time, "the time serialises as an ISO string");
        });

        it("takes warnings and errors when no level is given", () => {
            const levels: string[] = [];
            define({ id: "acme-default-level", write: (record) => void levels.push(record.level) });

            logger().trace("t");
            logger().debug("d");
            logger().info("i");
            logger().warn("w");
            logger().error("e");

            assert.deepStrictEqual(levels, ["warn", "error"]);
        });

        it("takes only the categories it names, matched by segment", () => {
            const messages: string[] = [];
            define({
                id: "acme-layout-only",
                level: "trace",
                categories: ["layout"],
                write: (r) => void messages.push(r.message),
            });

            GraphtyLogger.getLogger(["graphty", "layout", "ngraph"]).info("from the layout");
            GraphtyLogger.getLogger(["graphty", "data"]).info("from the data");

            assert.deepStrictEqual(messages, ["from the layout"]);
        });

        it("cannot take more than the global level allows", async () => {
            const levels: string[] = [];
            define({ id: "acme-narrow", level: "trace", write: (record) => void levels.push(record.level) });
            await GraphtyLogger.configure({ level: LogLevel.WARN });

            logger().debug("d");
            logger().warn("w");

            assert.deepStrictEqual(levels, ["warn"]);
        });

        it("receives nothing while logging is globally off (today's rule; owner decision 34 not taken)", async () => {
            const messages: string[] = [];
            define({ id: "acme-off", level: "trace", write: (record) => void messages.push(record.message) });
            await GraphtyLogger.configure({ enabled: false });

            logger().error("unheard");

            assert.deepStrictEqual(messages, []);
        });
    });

    describe("attaching and detaching", () => {
        it("is attached at once under its id, and the function it returns detaches it", () => {
            const messages: string[] = [];
            const detach = define({ id: "acme-attached", write: (record) => void messages.push(record.message) });

            assert.isTrue(GraphtyLogger.getSinks().some((sink) => sink.name === "acme-attached"));
            logger().warn("one");
            detach();
            logger().warn("two");

            assert.deepStrictEqual(messages, ["one"]);
            assert.isFalse(GraphtyLogger.getSinks().some((sink) => sink.name === "acme-attached"));
        });

        it("with attach: false is only registered, for a configuration to turn on by id", async () => {
            const messages: string[] = [];
            define({ id: "acme-by-name", attach: false, write: (record) => void messages.push(record.message) });

            logger().warn("before");
            await GraphtyLogger.configure({ sinks: [{ use: "acme-by-name" }] });
            detachers.push(() => GraphtyLogger.removeSink("acme-by-name"));
            logger().warn("after");

            assert.deepStrictEqual(messages, ["after"]);
        });

        it("is registered with a descriptor the element derived from the definition", () => {
            define({ id: "acme-described", description: "Sends errors home.", write: () => undefined });

            assert.deepStrictEqual(logSinkDescriptor("acme-described"), {
                id: "acme-described",
                plainName: "Acme described",
                description: "Sends errors home.",
                options: [],
            });
        });

        it("treats the same definition object defined twice as one destination", () => {
            const messages: string[] = [];
            const definition: LogDestinationDefinition = {
                id: "acme-twice",
                write: (record) => void messages.push(record.message),
            };
            define(definition);
            define(definition);

            logger().warn("once");

            assert.deepStrictEqual(messages, ["once"]);
        });

        it("leaves a live sink attached with addSink exactly as it was: synchronous, and delivered in order", () => {
            const messages: string[] = [];
            GraphtyLogger.addSink({ name: "acme-live", write: (record) => void messages.push(record.message) });
            detachers.push(() => GraphtyLogger.removeSink("acme-live"));
            define({ id: "acme-beside", write: () => undefined });

            logger().warn("first");
            logger().error("second");

            assert.deepStrictEqual(messages, ["first", "second"], "delivered before the call returned");
        });
    });

    describe("a write that returns a promise", () => {
        it("sends records one at a time, in order, and flush waits for the queue", async () => {
            const sent: string[] = [];
            const pending: (() => void)[] = [];
            define({
                id: "acme-ordered",
                write: (record) =>
                    new Promise<void>((resolve) => {
                        pending.push(() => {
                            sent.push(record.message);
                            resolve();
                        });
                    }),
            });

            logger().warn("one");
            logger().warn("two");
            let flushed = false;
            const flushing = GraphtyLogger.flush().then(() => {
                flushed = true;
            });
            await Promise.resolve();

            assert.lengthOf(pending, 1, "the second waits for the first");
            assert.isFalse(flushed, "flush waits for the queue");
            pending[0]();
            await vi.waitFor(() => {
                assert.lengthOf(pending, 2);
            });
            pending[1]();
            await flushing;

            assert.deepStrictEqual(sent, ["one", "two"]);
            assert.isTrue(flushed);
        });

        it("retries a rejected send three times, then gives up and reports it on the console", async () => {
            vi.useFakeTimers();
            let attempts = 0;
            define({
                id: "acme-rejects",
                write: () => {
                    attempts += 1;
                    return Promise.reject(new Error("offline"));
                },
            });

            logger().error("lost");
            await settle();

            assert.strictEqual(attempts, 4, "the first send and three retries");
            assert.isTrue(
                consoleSpies.some((spy) =>
                    spy.mock.calls.some((call) => call.some((part) => String(part).includes("acme-rejects"))),
                ),
                "the failure is reported on the console, naming the destination",
            );
        });

        it("counts a response that is not ok as a failure, and keeps the order when a retry succeeds", async () => {
            vi.useFakeTimers();
            const sent: string[] = [];
            let failNext = true;
            define({
                id: "acme-http",
                write: (record) => {
                    if (failNext) {
                        failNext = false;
                        return Promise.resolve(new Response(null, { status: 500 }));
                    }

                    sent.push(record.message);
                    return Promise.resolve(new Response(null, { status: 204 }));
                },
            });

            logger().error("first");
            logger().error("second");
            await settle();

            assert.deepStrictEqual(sent, ["first", "second"]);
        });

        it("does not retry a 4xx other than 408 and 429", async () => {
            vi.useFakeTimers();
            const statuses = [400, 408, 429];
            const attempts = new Map<number, number>();
            for (const status of statuses) {
                define({
                    id: `acme-status-${String(status)}`,
                    write: () => {
                        attempts.set(status, (attempts.get(status) ?? 0) + 1);
                        return Promise.resolve(new Response(null, { status }));
                    },
                });
            }

            logger().error("refused");
            await settle();

            assert.strictEqual(attempts.get(400), 1, "a 400 is the request's fault; sending it again changes nothing");
            assert.strictEqual(attempts.get(408), 4, "a timeout is retried");
            assert.strictEqual(attempts.get(429), 4, "so is too many requests");
        });

        it("holds at most 1000 records, drops the oldest, and says how many it dropped", async () => {
            const delivered: PlainLogRecord[] = [];
            let release: () => void = () => undefined;
            const gate = new Promise<void>((resolve) => {
                release = resolve;
            });
            define({
                id: "acme-storm",
                write: async (record) => {
                    await gate;
                    delivered.push(record);
                },
            });

            const total = 1500;
            for (let i = 0; i < total; i++) {
                logger().warn(`storm ${String(i)}`);
            }
            release();
            await GraphtyLogger.flush();

            const mine = delivered.filter((record) => record.message.startsWith("storm "));
            const notice = delivered.find((record) => record.category === "graphty.logging");
            assert.isAtMost(mine.length, 1001, "the queue holds 1000, beside the one already being sent");
            assert.strictEqual(mine.at(-1)?.message, `storm ${String(total - 1)}`, "the newest records are kept");
            assert.isDefined(notice, "one record says records were dropped");
            assert.strictEqual(notice.level, "warn");
            const dropped = Number(/\d+/.exec(notice.message)?.[0]);
            assert.strictEqual(dropped + mine.length, total, "and how many");
            assert.isBelow(delivered.indexOf(notice), delivered.indexOf(mine[1]), "before the records that were kept");
        });

        it("drains its queue when it is detached", async () => {
            const sent: string[] = [];
            const detach = define({
                id: "acme-drain",
                write: async (record) => {
                    await Promise.resolve();
                    sent.push(record.message);
                },
            });

            logger().warn("one");
            logger().warn("two");
            detach();
            await vi.waitFor(() => {
                assert.deepStrictEqual(sent, ["one", "two"]);
            });
        });
    });

    describe("what a malformed definition is told", () => {
        it("refuses a missing write, naming the member", () => {
            const refusal = refusalOf({ id: "acme-telemetry" });

            assert.strictEqual(refusal.code, "E_BAD_COMMAND");
            assert.strictEqual(refusal.field, "write");
            assert.strictEqual(
                refusal.message,
                'defineLogDestination("acme-telemetry"): "write" must be a function; got undefined.',
            );
        });

        it("refuses an id that is not lower-case words joined by hyphens", () => {
            const refusal = refusalOf({ id: "Acme Telemetry", write: () => undefined });

            assert.strictEqual(refusal.code, "E_BAD_COMMAND");
            assert.strictEqual(refusal.field, "id");
        });

        it("refuses a level that is not one of the five words", () => {
            const refusal = refusalOf({ id: "acme-loud", level: "warning", write: () => undefined });

            assert.strictEqual(refusal.code, "E_BAD_COMMAND");
            assert.strictEqual(refusal.field, "level");
            assert.include(refusal.message, '"error", "warn", "info", "debug" or "trace"');
        });

        it("refuses categories that are not a list of words", () => {
            const refusal = refusalOf({ id: "acme-cats", categories: "layout", write: () => undefined });

            assert.strictEqual(refusal.code, "E_BAD_COMMAND");
            assert.strictEqual(refusal.field, "categories");
        });

        it("refuses an id the element keeps for its own destinations", () => {
            assert.strictEqual(refusalOf({ id: "console", write: () => undefined }).code, "E_DUPLICATE_PLUGIN");
            assert.strictEqual(refusalOf({ id: "remote", write: () => undefined }).code, "E_DUPLICATE_PLUGIN");
        });

        it("registers and attaches nothing when it refuses", () => {
            refusalOf({ id: "acme-refused", level: "loud", write: () => undefined });

            assert.isUndefined(logSinkDescriptor("acme-refused"));
            assert.isFalse(GraphtyLogger.getSinks().some((sink) => sink.name === "acme-refused"));
        });
    });
});
