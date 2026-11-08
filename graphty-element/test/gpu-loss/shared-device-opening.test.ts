/**
 * @file The layout's accelerator and the renderer on one WebGPU device: the device a layout's accelerator
 * and the renderer open: one device on a hardware adapter, two on a software one, the renderer's own when
 * acceleration is off. A software adapter never shares, so on SwiftShader the adapter is made to say it is
 * hardware; the "gpu-loss" project with `GRAPHTY_BROWSER_GPU` set runs the same drills on a card. The other
 * shared-device files hold the rest, so a pull request's planner can give each a test bin of its own.
 */

import { assert, describe, it, vi } from "vitest";

import { Graph } from "../../src/Graph";
import type { RecoveringWebGPUEngine } from "../../src/managers/RecoveringWebGPUEngine";
import { adapterSays, countDevices, deviceOf, layoutOf, mounted, open, startLayout } from "./shared-device";

describe("the device a graph opens", () => {
    it("is one device on a hardware adapter", async () => {
        adapterSays("test-hardware");
        const devices = countDevices();

        const graph = await open();
        await startLayout(graph);

        assert.isTrue(layoutOf(graph).isAccelerated);
        assert.strictEqual(devices(), 1);
        assert.strictEqual(graph.rendererStatus?.layoutDevice, "shared");
    });

    it("is one device for an element, which looks for its accelerator before it opens a renderer", async () => {
        adapterSays("test-hardware");
        const devices = countDevices();
        const element = document.createElement("graphty-element");
        element.renderer = "webgpu";
        element.graph.acceleration.setMinNodes(0);
        document.body.appendChild(element);
        mounted.push({ graph: element.graph, container: element });

        await element.graph.acceleration.ready();

        assert.isNotNull(element.graph.acceleration.accelerator);
        assert.strictEqual(devices(), 1);
    });

    it("is one device on a browser whose device does not carry its adapter's info", async () => {
        adapterSays("test-hardware");
        vi.spyOn(GPUDevice.prototype, "adapterInfo", "get").mockReturnValue(undefined as unknown as GPUAdapterInfo);
        const devices = countDevices();

        const graph = await open();
        assert.isNotNull(graph.acceleration.accelerator, graph.acceleration.status.reason ?? "");
        await startLayout(graph);

        assert.isTrue(layoutOf(graph).isAccelerated);
        assert.strictEqual(devices(), 1);
    });

    it("draws on WebGPU without sharing on a browser whose adapter has no info", async () => {
        vi.spyOn(GPUAdapter.prototype, "info", "get").mockReturnValue(undefined as unknown as GPUAdapterInfo);

        const graph = await open();

        assert.deepInclude(graph.rendererStatus, { active: "webgpu", reason: null, drawing: true });
        assert.isFalse((graph.engine as RecoveringWebGPUEngine).sharesDevice);
        assert.isNull(graph.acceleration.accelerator);
        assert.isNotNull(graph.acceleration.status.reason);
    });

    it("has every limit of the adapter when it is shared", async () => {
        adapterSays("test-hardware");
        const graph = await open();
        const adapter = await navigator.gpu?.requestAdapter({ powerPreference: "high-performance" });

        assert.strictEqual((await deviceOf(graph)).limits.maxBufferSize, adapter?.limits.maxBufferSize);
    });

    it("is two devices on a software adapter, decided before the run", async () => {
        adapterSays("swiftshader");
        const devices = countDevices();

        const graph = await open("required");
        await startLayout(graph);

        assert.isFalse((graph.engine as RecoveringWebGPUEngine).sharesDevice);
        assert.strictEqual(devices(), 2);
        assert.strictEqual(graph.rendererStatus?.layoutDevice, "separate");
    });

    it("is the accelerator's own under WebGL, which shares no device", async () => {
        adapterSays("test-hardware");
        const container = document.createElement("div");
        document.body.appendChild(container);
        const graph = new Graph(container);
        mounted.push({ graph, container });
        graph.setRenderer("webgl");

        await graph.init();

        assert.strictEqual(graph.rendererStatus?.layoutDevice, "separate");
    });

    it("is the renderer's own when acceleration is off", async () => {
        adapterSays("test-hardware");
        const container = document.createElement("div");
        document.body.appendChild(container);
        const graph = new Graph(container);
        mounted.push({ graph, container });
        graph.setRenderer("webgpu");
        graph.acceleration.setPolicy("off");

        await graph.init();

        assert.isFalse((graph.engine as RecoveringWebGPUEngine).sharesDevice);
        assert.isNull(graph.rendererStatus?.layoutDevice);
    });
});
