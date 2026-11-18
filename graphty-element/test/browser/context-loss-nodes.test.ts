/**
 * @file Nodes drawn again after a WebGL context is really lost and given back, on a location map
 * globe and on a plain layout (issue #8216: on an iPad, a globe came back from the background with
 * its map but no node or edge). The context is lost with `WEBGL_lose_context.loseContext()` and
 * given back by `restartRenderer()`, so Babylon rebuilds every buffer as it does after Safari
 * reclaims a background tab's context. The first frame after the return is logged with what it
 * draws, so a field report says whether the nodes were drawn.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { GraphtyLogger } from "../../src/logging/GraphtyLogger.js";
import { resetLoggingConfig } from "../../src/logging/LoggerConfig.js";
import { LogLevel, type LogRecord } from "../../src/logging/types.js";
import { drawnFrames } from "../helpers/drawn-frames";
import { contextOf } from "../helpers/webgl-context";

const SINK = "context-loss-nodes";
const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
    GraphtyLogger.removeSink(SINK);
    resetLoggingConfig();
});

/**
 * The pixels of a 5 by 5 square of the canvas.
 * @param canvas - The element's canvas.
 * @param at - The square's middle, in CSS pixels.
 * @param at.x - Across.
 * @param at.y - Down.
 * @returns RGBA values.
 */
function pixelsAt(canvas: HTMLCanvasElement, at: { x: number; y: number }): number[] {
    const scale = canvas.width / canvas.clientWidth;
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d");
    if (context === null) {
        throw new Error("no 2D context");
    }
    context.drawImage(canvas, 0, 0);
    return Array.from(context.getImageData(Math.round(at.x * scale) - 2, Math.round(at.y * scale) - 2, 5, 5).data);
}

/**
 * The largest difference of one channel between two pictures of the same square.
 * @param a - One.
 * @param b - The other.
 * @returns The difference, 0 to 255.
 */
function largestDifference(a: readonly number[], b: readonly number[]): number {
    return a.reduce((most, value, i) => Math.max(most, Math.abs(value - b[i])), 0);
}

const CITIES = [
    { id: "lisbon", latitude: 38.72, longitude: -9.14, position: { x: -4, y: 0, z: 0 } },
    { id: "paris", latitude: 48.85, longitude: 2.35, position: { x: 4, y: 0, z: 0 } },
    { id: "lagos", latitude: 6.52, longitude: 3.37, position: { x: 0, y: 4, z: 0 } },
];

describe("a WebGL context lost and given back", () => {
    it.for([
        ["location-map", "objects"],
        ["location-map", "batched"],
        ["fixed", "objects"],
        ["fixed", "batched"],
    ] as const)("draws the nodes again (%s, %s)", async ([layout, renderPath]) => {
        const records: LogRecord[] = [];
        await GraphtyLogger.configure({ enabled: true, level: LogLevel.INFO });
        GraphtyLogger.addSink({ name: SINK, write: (record) => records.push(record) });

        const element: Graphty = document.createElement("graphty-element");
        element.renderPath = renderPath;
        element.style.display = "block";
        element.style.width = "600px";
        element.style.height = "400px";
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.session.data.addNodes(CITIES);
        await element.session.data.addEdges([
            { src: "lisbon", dst: "paris" },
            { src: "paris", dst: "lagos" },
        ]);
        await (layout === "location-map"
            ? element.graph.setLayout("location-map", { latitude: "latitude", longitude: "longitude" })
            : element.graph.setLayout("fixed", { dim: 3 }));
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const scene = element.graph.getScene();
        const canvas = scene.getEngine().getRenderingCanvas();
        assert.isNotNull(canvas);
        await drawnFrames(scene, 2);
        const before = CITIES.map(({ id }) => {
            const at = element.nodeScreenPosition(id);
            assert.isDefined(at, id);
            return { id, at, pixels: pixelsAt(canvas, at) };
        });

        const lost = new Promise<void>((resolve) => {
            element.addEventListener(
                "render-lost",
                () => {
                    resolve();
                },
                { once: true },
            );
        });
        const extension = contextOf(element.graph).getExtension("WEBGL_lose_context");
        assert.isNotNull(extension);
        extension.loseContext();
        await lost;
        await element.restartRenderer();
        await element.waitForStableFrame();
        await drawnFrames(scene, 2);

        for (const { id, at, pixels } of before) {
            assert.isBelow(largestDifference(pixelsAt(canvas, at), pixels), 40, `${id} is drawn again where it was`);
        }
        const drawn = records.find((record) => record.message === "drawn after return");
        assert.isDefined(drawn, "the first frame after the return is logged");
        assert.strictEqual(drawn.data?.after, "render restored");
        assert.strictEqual(drawn.data?.nodesDrawn, CITIES.length);
    });
});
