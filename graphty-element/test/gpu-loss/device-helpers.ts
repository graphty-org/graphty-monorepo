/**
 * @file The GPU-loss test files' generic helpers: the graphs a test opened, the device a graph draws
 * on and the count of uncaptured device errors. Importing it has no side effect -- it registers no
 * accelerator and no afterEach -- so a file that must not load the layout's accelerator can use it.
 */

import { Logger } from "@babylonjs/core";
import { assert, vi } from "vitest";

import type { Graph } from "../../src/Graph";
import type { RecoveringWebGPUEngine } from "../../src/managers/RecoveringWebGPUEngine";

export const mounted: { graph: Graph; container: HTMLElement }[] = [];

/** Disposes every graph the test built. */
export function unmount(): void {
    for (const { graph, container } of mounted.splice(0)) {
        graph.dispose();
        container.remove();
    }
}

/**
 * Counts Babylon's reports of an uncaptured device error from now on.
 * @returns The number so far.
 */
export function countUncaptured(): () => number {
    const warn = vi.spyOn(Logger, "Warn");
    return () => warn.mock.calls.filter(([message]) => String(message).includes("uncaptured error")).length;
}

/**
 * The device the graph draws on, waiting for the new one during a loss.
 * @param graph - The graph.
 * @returns The device.
 */
export function deviceOf(graph: Graph): Promise<GPUDevice> {
    return (graph.engine as RecoveringWebGPUEngine).drawingDevice();
}

/**
 * The device the graph draws on now, read without waiting.
 * @param graph - The graph.
 * @returns The device; fails the test while a loss waits for the new one.
 */
export function deviceNowOf(graph: Graph): GPUDevice {
    const device = (graph.engine as RecoveringWebGPUEngine).deviceNow();
    assert.isNotNull(device, "the graph has no device now: a loss waits for the new one");
    return device;
}
