import { afterEach, assert, expect, test, vi } from "vitest";

import type { Graph } from "../../../src/Graph";
import { GraphtyLogger } from "../../../src/logging/GraphtyLogger.js";
import { resetLoggingConfig } from "../../../src/logging/LoggerConfig.js";
import { LogLevel, type LogRecord } from "../../../src/logging/types.js";
import { cleanupTestGraphWithData, createTestGraphWithData } from "./test-setup.js";

let graph: Graph;

const SINK = "screenshot-resolution-test";

afterEach(() => {
    cleanupTestGraphWithData(graph);
    GraphtyLogger.removeSink(SINK);
    resetLoggingConfig();
    vi.restoreAllMocks();
});

test("multiplier increases resolution correctly", async () => {
    graph = await createTestGraphWithData();

    const base = await graph.captureScreenshot({ multiplier: 1 });
    const result = await graph.captureScreenshot({ multiplier: 2 });

    assert.equal(result.metadata.width, base.metadata.width * 2);
    assert.equal(result.metadata.height, base.metadata.height * 2);
});

test("explicit dimensions override multiplier", async () => {
    graph = await createTestGraphWithData();

    const result = await graph.captureScreenshot({
        multiplier: 2, // Should be ignored
        width: 1920,
        height: 1080,
    });

    assert.equal(result.metadata.width, 1920);
    assert.equal(result.metadata.height, 1080);
});

test("width-only maintains aspect ratio", async () => {
    graph = await createTestGraphWithData();

    // Canvas is 800x600 (4:3 aspect)
    const result = await graph.captureScreenshot({ width: 1600 });

    assert.equal(result.metadata.width, 1600);
    assert.equal(result.metadata.height, 1200); // Maintains 4:3
});

test("height-only maintains aspect ratio", async () => {
    graph = await createTestGraphWithData();

    // Canvas is 800x600 (4:3 aspect)
    const result = await graph.captureScreenshot({ height: 1200 });

    assert.equal(result.metadata.width, 1600); // Maintains 4:3
    assert.equal(result.metadata.height, 1200);
});

test("strictAspectRatio throws when aspect mismatch", async () => {
    graph = await createTestGraphWithData();

    // Canvas is 800x600 (4:3 aspect)
    await expect(
        graph.captureScreenshot({
            width: 1920, // 16:9 aspect
            height: 1080,
            strictAspectRatio: true,
        }),
    ).rejects.toMatchObject({
        name: "GraphtyError",
        code: "E_OPTION_RANGE",
    });
});

test("dimensions exceeding browser limit throw error", async () => {
    graph = await createTestGraphWithData();

    await expect(
        graph.captureScreenshot({
            width: 20000, // Exceeds 16384 limit
            height: 20000,
        }),
    ).rejects.toMatchObject({
        name: "GraphtyError",
        code: "E_TOO_LARGE",
    });
});

test("total pixels exceeding limit throw error", async () => {
    graph = await createTestGraphWithData();

    await expect(
        graph.captureScreenshot({
            width: 10000, // 10000 * 10000 = 100MP > 33.17MP limit
            height: 10000,
        }),
    ).rejects.toMatchObject({
        name: "GraphtyError",
        code: "E_TOO_LARGE",
    });
});

test("large dimensions log a warning with their size", async () => {
    graph = await createTestGraphWithData();
    await GraphtyLogger.configure({ enabled: true, level: LogLevel.WARN });
    const records: LogRecord[] = [];
    GraphtyLogger.addSink({ name: SINK, write: (record) => records.push(record) });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await graph.captureScreenshot({
        width: 3841, // Slightly larger than 4K to exceed WARN_PIXELS
        height: 2160,
    });

    const warning = records.find((r) => r.level === LogLevel.WARN && r.category.includes("screenshot"));
    assert.isDefined(warning);
    assert.match(warning.message, /Large screenshot/);
    assert.deepInclude(warning.data, { width: 3841, height: 2160, totalPixels: 3841 * 2160 });
});
