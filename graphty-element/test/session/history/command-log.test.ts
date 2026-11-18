import { afterEach, assert, describe, it, vi } from "vitest";

import { GraphtyLogger } from "../../../src/logging/GraphtyLogger";
import { resetLoggingConfig } from "../../../src/logging/LoggerConfig";
import { LogLevel, type LogRecord } from "../../../src/logging/types";
import { setup } from "./fake-commands";

/**
 * Turn on the command module and collect what it writes.
 * @returns The records, as they arrive.
 */
async function collect(): Promise<LogRecord[]> {
    const records: LogRecord[] = [];
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    await GraphtyLogger.configure({
        enabled: true,
        level: LogLevel.INFO,
        modules: ["command"],
        sinks: [{ name: "test-command-log", write: (record) => records.push(record) }],
    });
    return records;
}

describe("the command log", () => {
    afterEach(() => {
        GraphtyLogger.removeSink("test-command-log");
        resetLoggingConfig();
        vi.restoreAllMocks();
    });

    it("logs each new step once, not each edit that coalesces into it, and each failed command", async () => {
        const records = await collect();
        const { dispatcher } = setup();

        await dispatcher.dispatch({ op: "fake.styles", name: "hubs" });
        await dispatcher.dispatch({ op: "fake.config", key: "size", value: "1" });
        await dispatcher.dispatch({ op: "fake.config", key: "size", value: "2" });
        await dispatcher.dispatch({ op: "fake.fail-before-write" }).catch(() => undefined);

        assert.deepEqual(
            records.map((record) => [record.message, record.data?.label ?? record.data?.op]),
            [
                ["step", "Styled hubs"],
                ["step", "Set size"],
                ["command failed", "fake.fail-before-write"],
            ],
        );
        assert.deepEqual(records[0].data?.ops, ["fake.styles"]);
        assert.strictEqual(records[2].data?.message, "failed before writing");
    });
});
