/**
 * The element on a REAL WebGPU device: the three force layouts, a drag, a run, and the
 * arrangement compared against the one the CPU produces from the same graph.
 *
 * Everything else about acceleration is pinned against the deterministic fake, which is the
 * right instrument for a rule: `test/browser/simulation-layout-engine.test.ts` decides what
 * happens when an accelerator arrives, leaves or rejects a batch, and it does so without a
 * device, a driver or a frame rate in the answer. What a fake cannot tell anyone is whether the
 * real kernels, reached through the real `./webgpu` entry point, produce a graph a person would
 * recognise. That is this file, and it needs hardware.
 *
 * So it runs only when the run asked for hardware. `GRAPHTY_BROWSER_GPU` selects a Chromium flag
 * set in `vitest.config.ts` -- `swiftshader` for a workstation or a plain CI runner, `nvidia` for
 * the GPU lane's T4 -- and with the variable unset the whole suite skips, which is why the five
 * CI browser shards are unaffected by its existence.
 *
 * The policy is `required` on purpose. Under `auto` the element refuses a software adapter,
 * because a software rasteriser is slower than its own CPU path and attaching one would report
 * "active" while making the graph worse. Under `required` the consumer has said "no CPU path",
 * and SwiftShader is a device -- which is what lets the same file run the real kernels on a
 * machine that has no graphics card.
 *
 * The policy cases at the end pin the other half through the same real entry point: `auto`
 * refuses SwiftShader with `E_SOFTWARE_ONLY` and attaches real hardware, and an element that
 * attached SwiftShader under `required` lets go of it when the policy relaxes to `auto`.
 *
 * The comparison case is the one worth reading. A GPU layout is not the CPU layout to the bit: single
 * precision, a different iteration order and a different settle point all move nodes. What must
 * hold is that it is the same PICTURE, so the case settles the same graph twice, once with
 * `acceleration="off"` and once on the device, and compares the distribution of edge lengths.
 */

import "../../src/graphty-element";
import "../../webgpu";

import { Vector3 } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { AccelerationCapabilities, AccelerationStatus } from "../../src/acceleration";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { storyGraph } from "../helpers/story-graph";

/** Which Chromium flag set the run asked for; empty when it asked for none. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

/** Whether this run has a WebGPU device to talk to at all. */
const GPU_LANE = ADAPTER !== "";

/**
 * How long one layout is given to settle.
 *
 * SwiftShader computes the same kernels on the CPU, an order of magnitude slower, so the budget
 * is the adapter's rather than one number that is either generous on hardware or too tight in
 * software. Neither is a Playwright timeout being raised to hide a hang: a layout that has not
 * settled in these is a layout that is not settling.
 */
const SETTLE_MS = ADAPTER === "nvidia" ? 10_000 : 60_000;

/** The graph every case lays out: 150 nodes, 250 edges, the same ones every run. */
const GRAPH = storyGraph(150, 250);

/** How far apart two quantiles of the same graph's edge lengths may be, as a fraction. */
const QUANTILE_TOLERANCE = 0.25;

/** Elements mounted by this file, removed when it finishes. */
const mounted: HTMLDivElement[] = [];

/** The three quantiles of a settled arrangement's edge lengths. */
interface Quantiles {
    /** The 10th percentile edge length. */
    q10: number;
    /** The median edge length. */
    q50: number;
    /** The 90th percentile edge length. */
    q90: number;
}

/**
 * Waits for a condition, polling once per animation frame.
 * @param predicate - What the case is waiting for.
 * @param what - Named in the failure message.
 * @param budgetMs - How long to wait before giving up.
 */
async function until(predicate: () => boolean, what: string, budgetMs = SETTLE_MS): Promise<void> {
    const deadline = performance.now() + budgetMs;

    while (performance.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });
    }

    throw new Error(`timed out after ${Math.round(budgetMs)} ms waiting for ${what}`);
}

/**
 * Mounts an element over the shared graph and waits until its data is in.
 * @param acceleration - The policy the element starts under.
 * @returns The connected element.
 */
async function mount(acceleration: "required" | "auto" | "off"): Promise<Graphty> {
    const container = document.createElement("div");

    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
    mounted.push(container);

    const element = document.createElement("graphty-element");

    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    element.setAttribute("acceleration", acceleration);
    element.nodeData = GRAPH.nodes;
    element.edgeData = GRAPH.edges;

    let settled = false;
    element.addEventListener("graph-settled", () => {
        settled = true;
    });

    container.appendChild(element);
    await element.updateComplete;
    await until(
        () => element.graph.getDataManager().nodes.size === GRAPH.nodes.length,
        "the element to load all 150 nodes",
        30_000,
    );

    // The element lays the graph out once as soon as the data is in. Waiting that out here is
    // what lets every case below treat the next `graph-settled` as its own: a settle still in
    // flight would otherwise resolve the first case's wait before its layout had done anything.
    await until(() => settled, "the element's first layout to come to rest", 120_000);

    return element;
}

/**
 * The acceleration status the element publishes.
 *
 * Through `session.capabilities`, which is the document a consumer reads, rather than through the
 * controller behind it: the two are the same object today, and a case that reached past the
 * published surface would go on passing if they stopped being.
 * @param element - The element to ask.
 * @returns The status.
 */
function status(element: Graphty): AccelerationStatus {
    return element.session.capabilities.acceleration;
}

/**
 * Records every acceleration status the element announces on the DOM, in order.
 *
 * The state a GPU layout passes through is a moment, not a resting value: it is `"active"` while
 * the device is being stepped and `"idle"` again the moment the arrangement settles, so a case
 * that read the status after its `await` would always find the resting one. The event is also the
 * channel a consumer gets this on.
 * @param element - The element to listen to.
 * @returns The statuses seen since, oldest first.
 */
function watchStatus(element: Graphty): AccelerationStatus[] {
    const seen: AccelerationStatus[] = [];

    element.addEventListener("graphty-capabilities-change", (event) => {
        const { capabilities } = (event as CustomEvent<{ capabilities: AccelerationCapabilities }>).detail;

        seen.push(capabilities.acceleration);
    });

    return seen;
}

/**
 * Sets a layout and waits for the element to report the arrangement at rest.
 * @param element - The element to lay out.
 * @param layout - The registered layout name.
 * @returns How long the settle took, in milliseconds.
 */
async function settle(element: Graphty, layout: string): Promise<number> {
    let settled = false;
    const onSettled = (): void => {
        settled = true;
    };

    element.addEventListener("graph-settled", onSettled, { once: true });

    const started = performance.now();
    await element.setLayout(layout);
    await until(() => settled, `"${layout}" to settle`);
    const took = performance.now() - started;

    console.log(`[webgpu-layout] adapter=${ADAPTER} layout=${layout} settleMs=${Math.round(took)}`);

    return took;
}

/**
 * The 10th, 50th and 90th percentile of the graph's edge lengths, as it currently stands.
 * @param element - The element whose positions to measure.
 * @returns The three quantiles.
 */
function quantiles(element: Graphty): Quantiles {
    const data = element.graph.getDataManager();
    const src = { x: 0, y: 0, z: 0 };
    const dst = { x: 0, y: 0, z: 0 };
    const lengths: number[] = [];

    for (const edge of GRAPH.edges) {
        const from = data.getNode(edge.src);
        const to = data.getNode(edge.dst);

        if (from === undefined || to === undefined) {
            throw new Error(`the graph lost ${edge.src} or ${edge.dst} between load and measurement`);
        }

        data.positions.read(from.index, src);
        data.positions.read(to.index, dst);
        lengths.push(Math.hypot(src.x - dst.x, src.y - dst.y, src.z - dst.z));
    }

    lengths.sort((a, b) => a - b);

    /**
     * One percentile of the sorted lengths.
     * @param fraction - Where in the distribution to read, from 0 to 1.
     * @returns The length at that point.
     */
    const at = (fraction: number): number =>
        lengths[Math.min(lengths.length - 1, Math.floor(fraction * lengths.length))] ?? 0;

    return { q10: at(0.1), q50: at(0.5), q90: at(0.9) };
}

/** The element every case but the comparison uses. */
let gpu: Graphty;

beforeAll(async () => {
    if (!GPU_LANE) {
        return;
    }

    gpu = await mount("required");
    await until(() => status(gpu).backend !== undefined, "an accelerator to attach", 30_000);
    // The hook's own budget has to cover what it waits for: 30 s for the data, 120 s for the
    // first settle and 30 s for the accelerator. Below that sum the hook dies on vitest's
    // generic "Hook timed out" instead of the named message the wait was written to produce.
}, 200_000);

afterAll(() => {
    while (mounted.length > 0) {
        mounted.pop()?.remove();
    }
});

describe.skipIf(!GPU_LANE)("graphty-element on a real WebGPU device", () => {
    it("attaches the accelerator the ./webgpu entry point registered, and says what it is", () => {
        const found = status(gpu);

        console.log(`[webgpu-layout] adapter=${ADAPTER} status=${JSON.stringify(found)}`);

        assert.equal(found.backend, "webgpu", found.reason ?? "no reason given");

        if (ADAPTER === "nvidia") {
            assert.match(found.vendor ?? "", /nvidia/i);
        }
    });

    it("settles forceatlas2 on the device, reporting active while it runs", { timeout: SETTLE_MS * 2 }, async () => {
        const seen = watchStatus(gpu);

        await settle(gpu, "forceatlas2");

        const engine = gpu.graph.getLayoutManager().layoutEngine;

        assert.instanceOf(engine, SimulationLayoutEngine);
        assert.isTrue(engine.isAccelerated, "the layout ran on the accelerator, not on the CPU port");
        assert.equal(engine.precision, "f32");

        // WHAT THE ELEMENT TOLD THE PAGE WHILE THE DEVICE WAS BUSY. "idle" is documented as an
        // accelerator with nothing using it, so a settle that never announced "active" would mean
        // the element spent the whole layout describing itself as asleep.
        const active = seen.find((found) => found.state === "active");

        assert.isDefined(active, `no "active" status was announced during the settle: ${JSON.stringify(seen)}`);
        assert.equal(active.backend, "webgpu");
        assert.equal(status(gpu).state, "idle", "and it is idle again once the arrangement is at rest");
    });

    it("moves a node when it is dragged, and leaves it pinned", { timeout: SETTLE_MS * 3 }, async () => {
        const node = gpu.graph.getDataManager().getNode("node-0");
        if (node === undefined) {
            throw new Error("node-0 is in the graph");
        }

        const handler = node.dragHandler;
        if (handler === undefined) {
            throw new Error("a rendered node has a drag handler");
        }

        node.pinOnDrag = true;

        const start = node.mesh.position.clone();
        const target = new Vector3(start.x + 5, start.y + 5, start.z);

        handler.onDragStart(start);
        handler.onDragUpdate(target);
        handler.onDragEnd();

        assert.isTrue(node.isPinned(), "a drop under pinOnDrag pins the node");

        const read = { x: 0, y: 0, z: 0 };
        gpu.graph.getDataManager().positions.read(node.index, read);
        assert.closeTo(read.x, target.x, 1e-3, "the drop is where the simulation was told to hold the node");

        // A pinned node stays where it was dropped while the simulation keeps stepping around it.
        await settle(gpu, "forceatlas2");
        gpu.graph.getDataManager().positions.read(node.index, read);
        assert.closeTo(read.x, target.x, 1e-3, "a pin survives the layout that ran after it");

        // Released again so the last case compares two graphs that differ only in where the
        // arithmetic happened, rather than one with a held node and one without.
        node.unpin();
    });

    it("settles spring on the device", { timeout: SETTLE_MS * 2 }, async () => {
        await settle(gpu, "spring");
        assert.isTrue((gpu.graph.getLayoutManager().layoutEngine as SimulationLayoutEngine).isAccelerated);
    });

    it("settles spring-electrical, which only exists on an accelerator", { timeout: SETTLE_MS * 2 }, async () => {
        await settle(gpu, "spring-electrical");
        assert.isTrue((gpu.graph.getLayoutManager().layoutEngine as SimulationLayoutEngine).isAccelerated);
    });

    it("labels a PageRank run computed on the device as single precision", { timeout: SETTLE_MS }, async () => {
        const run = gpu.session.runs.start("pagerank");
        await run;

        assert.equal(run.status, "succeeded");
        assert.equal(run.caveats.precision, "f32");
    });

    it("settles where the CPU settles, to a quarter of every quantile", { timeout: SETTLE_MS * 4 }, async () => {
        await settle(gpu, "forceatlas2");
        const accelerated = quantiles(gpu);

        const cpu = await mount("off");

        assert.equal(status(cpu).state, "off", "the reference element attached no accelerator");

        await settle(cpu, "forceatlas2");

        // The reference is only a reference if it really ran the CPU simulation. Without this the
        // case would still pass if `acceleration="off"` stopped being honoured -- it would be
        // comparing the device against itself, which is the one comparison that proves nothing.
        assert.isFalse(
            (cpu.graph.getLayoutManager().layoutEngine as SimulationLayoutEngine).isAccelerated,
            "the reference element laid the graph out on the CPU",
        );

        const reference = quantiles(cpu);

        console.log(
            `[webgpu-layout] adapter=${ADAPTER} gpu=${JSON.stringify(accelerated)} cpu=${JSON.stringify(reference)}`,
        );

        for (const key of ["q10", "q50", "q90"] as const) {
            const a = accelerated[key];
            const b = reference[key];
            const spread = Math.abs(a - b) / Math.max(a, b);

            assert.isAtMost(
                spread,
                QUANTILE_TOLERANCE,
                `${key}: the device settled at ${a.toFixed(3)} and the CPU at ${b.toFixed(3)}`,
            );
        }
    });
});

describe.skipIf(!GPU_LANE)("graphty-element on a real WebGPU device: what the policy accepts", () => {
    /** SwiftShader is the only software adapter a lane launches; every other flag set is hardware. */
    const SOFTWARE = ADAPTER === "swiftshader";

    it(
        SOFTWARE ? "refuses the software adapter under auto, saying why" : "attaches the hardware adapter under auto",
        { timeout: 200_000 },
        async () => {
            const auto = await mount("auto");
            await until(() => status(auto).state !== "probing", "the probe under auto to settle", 30_000);
            const found = status(auto);

            console.log(`[webgpu-layout] adapter=${ADAPTER} policy=auto status=${JSON.stringify(found)}`);

            if (SOFTWARE) {
                assert.equal(found.state, "unavailable");
                assert.equal(found.code, "E_SOFTWARE_ONLY", found.reason ?? "no reason given");
                assert.isUndefined(found.backend, "nothing is attached");
            } else {
                assert.equal(found.backend, "webgpu", found.reason ?? "no reason given");
            }
        },
    );

    it(
        SOFTWARE
            ? "lets go of the software adapter required attached once the policy relaxes to auto"
            : "keeps the hardware adapter when the policy relaxes from required to auto",
        { timeout: 60_000 },
        async () => {
            assert.equal(status(gpu).backend, "webgpu", "required attached an adapter to begin with");

            gpu.acceleration = "auto";
            await until(() => status(gpu).state !== "probing", "the policy change to settle", 30_000);
            const found = status(gpu);

            assert.equal(found.policy, "auto");

            if (SOFTWARE) {
                assert.equal(found.state, "unavailable");
                assert.equal(found.code, "E_SOFTWARE_ONLY", found.reason ?? "no reason given");
                assert.isUndefined(found.backend, "the software adapter was released");
            } else {
                assert.equal(found.backend, "webgpu");
            }
        },
    );
});
