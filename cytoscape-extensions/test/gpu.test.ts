/**
 * The `...Async` methods and the simulations' GPU decision without a real GPU: the CPU path (no
 * "@graphty/cytoscape-extensions/webgpu" import), and the device lifecycle against a fake provider (reuse, loss, destroy,
 * release, a refusal, a failure mid-run). The real device is exercised by gpu-device.test.ts.
 */

import { pageRank } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";
import { ForceAtlas2Simulation, type LayoutSimulation } from "@graphty/layout";
import cytoscape, { type EventObject, type LayoutOptions } from "cytoscape";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { type AcquiredGpu, type GpuAccelerator, GpuUnavailableError, registerGpuProvider } from "../src/gpu";
import graphtyCytoscape, { ASYNC_ALGORITHM_NAMES, type Backend } from "../src/index";
import { caseName, CASES, coreFor, expectClose, mainGraph } from "./gpu-cases";

beforeAll(() => {
    cytoscape.use(graphtyCytoscape);
});

afterEach(() => {
    registerGpuProvider(null);
});

type Method = (o?: Record<string, unknown>) => unknown;
const method = (cy: cytoscape.Core, name: string): Method => (cy as unknown as Record<string, Method>)[name].bind(cy);

describe("the CPU path (WebGPU not enabled)", () => {
    it("registers one Async method per algorithm the GPU package implements", () => {
        expect(ASYNC_ALGORITHM_NAMES).toHaveLength(17);
        const cy = mainGraph();
        for (const name of ASYNC_ALGORITHM_NAMES) {
            expect(typeof (cy as unknown as Record<string, unknown>)[name], name).toBe("function");
            expect(typeof (cy.elements() as unknown as Record<string, unknown>)[name], name).toBe("function");
        }
    });

    for (const c of CASES) {
        it(`${caseName(c)} equals the synchronous method and says why it ran on the CPU`, async () => {
            const cy = coreFor(c);
            const r = (await method(cy, `${c.method}Async`)(c.options)) as Record<string, unknown> & {
                backend: Backend;
            };
            expect(r.backend).toEqual({
                ran: "cpu",
                reason: 'WebGPU is not enabled: import "@graphty/cytoscape-extensions/webgpu" to use it',
                device: null,
            });
            const want = c.read(method(cy, c.method)(c.options) as never, cy);
            expectClose(c.read(r as never, cy), want, 0, caseName(c));
        });
    }

    it("the browser build in a runtime without WebGPU declines up front and runs on the CPU", async () => {
        const { enableWebGpu, disableWebGpu } = await import("../src/webgpu");
        enableWebGpu();
        const r = await mainGraph().graphtyPageRankAsync();
        expect(r.backend.ran).toBe("cpu");
        expect(r.backend.reason).toMatch(/no usable WebGPU device: .*navigator\.gpu/);
        disableWebGpu();
        expect((await mainGraph().graphtyPageRankAsync()).backend.reason).toMatch(/not enabled/);
    });

    it('gpu: "off" runs on the CPU and says so; "require" rejects', async () => {
        const cy = mainGraph();
        const r = await cy.graphtyPageRankAsync({ gpu: "off" });
        expect(r.backend).toEqual({ ran: "cpu", reason: 'gpu: "off" was requested', device: null });
        await expect(cy.graphtyPageRankAsync({ gpu: "require" })).rejects.toThrow(/require.*not enabled/);
    });

    it('a synchronous method rejects gpu: "require"', () => {
        expect(() => mainGraph().graphtyPageRank({ gpu: "require" })).toThrow(/graphtyPageRankAsync/);
    });

    it("a simulation stays synchronous and reports the CPU", () => {
        const cy = mainGraph();
        const layout = cy.layout({ name: "graphty-forceatlas2", boundingBox: BOX, maxIter: 20 } as LayoutOptions);
        let stopped = false;
        layout.one("layoutstop", () => {
            stopped = true;
        });
        layout.run();
        expect(stopped).toBe(true);
        expect((layout as unknown as { backend: Backend }).backend.ran).toBe("cpu");
    });
});

const BOX = { x1: 0, y1: 0, w: 400, h: 400 };

/** A fake device: the CPU PageRank and ForceAtlas2 behind the accelerator seams, with counters. */
interface Fake {
    acquired: number;
    disposed: number;
    released: GraphSnapshot[];
    pageRankCalls: number;
    /** Resolves `lost` of the current device. */
    lose(why: string): void;
    /** Makes the next pageRank reject, as a device error mid-run would. */
    failNext: boolean;
}

/**
 * Registers a fake provider.
 * @param decline - make every acquire fail up front with this code
 * @returns the counters
 */
function fakeProvider(decline?: string): Fake {
    const fake: Fake = {
        acquired: 0,
        disposed: 0,
        released: [],
        pageRankCalls: 0,
        lose: () => undefined,
        failNext: false,
    };
    registerGpuProvider({
        acquire: (): Promise<AcquiredGpu> => {
            if (decline !== undefined) {
                return Promise.reject(new GpuUnavailableError(decline, "only a software adapter (test)"));
            }
            fake.acquired++;
            let lose: (why: string) => void = () => undefined;
            const lost = new Promise<string>((resolve) => {
                lose = resolve;
            });
            fake.lose = lose;
            const accelerator: GpuAccelerator = {
                kind: "fake",
                pageRank: (s, o) => {
                    fake.pageRankCalls++;
                    if (fake.failNext) {
                        fake.failNext = false;
                        return Promise.reject(new Error("E_DEVICE_LOST: the device was lost mid-run"));
                    }
                    return Promise.resolve(pageRank(s, o));
                },
                forceAtlas2: (options): LayoutSimulation => {
                    // the CPU simulation behind an asynchronous step, as a GPU simulation has
                    const sim = new ForceAtlas2Simulation(options);
                    return {
                        load: (snap, p) => {
                            sim.load(snap, p);
                        },
                        step: async (k) => {
                            await Promise.resolve();
                            sim.step(k);
                        },
                        get settled() {
                            return sim.settled;
                        },
                        setFixed: (m) => {
                            sim.setFixed(m);
                        },
                        setPosition: (i, x, y, z) => {
                            sim.setPosition(i, x, y, z);
                        },
                        dispose: () => {
                            sim.dispose();
                        },
                    };
                },
                release: (s) => {
                    fake.released.push(s);
                },
                dispose: () => {
                    fake.disposed++;
                    lose("destroyed");
                },
            };
            return Promise.resolve({ accelerator, device: "fake device", lost });
        },
    });
    return fake;
}

describe("the device lifecycle (a fake provider)", () => {
    it("acquires one device per core on first use and reuses it", async () => {
        const fake = fakeProvider();
        const cy = mainGraph();
        const [a, b] = await Promise.all([cy.graphtyPageRankAsync(), cy.graphtyPageRankAsync()]);
        const c = await cy.elements().graphtyPageRankAsync();
        expect(fake.acquired).toBe(1);
        expect(fake.pageRankCalls).toBe(3);
        for (const r of [a, b, c]) {
            expect(r.backend).toEqual({ ran: "gpu", reason: null, device: "fake device" });
        }
        await mainGraph().graphtyPageRankAsync();
        expect(fake.acquired).toBe(2);
    });

    it("reports the CPU, with the device, when the options keep the work there", async () => {
        fakeProvider();
        const r = await mainGraph().graphtyPageRankAsync({ initialRanks: () => 1 });
        expect(r.backend.ran).toBe("cpu");
        expect(r.backend.device).toBe("fake device");
        expect(r.backend.reason).toMatch(/options or the graph need the CPU/);
    });

    it("an algorithm the fake does not implement runs on the CPU and says so", async () => {
        fakeProvider();
        const r = await mainGraph().graphtyConnectedComponentsAsync();
        expect(r.backend.ran).toBe("cpu");
    });

    it("a refused device means the CPU with the reason, and rejects under require", async () => {
        const fake = fakeProvider("E_SOFTWARE_ONLY");
        const cy = mainGraph();
        const r = await cy.graphtyPageRankAsync();
        expect(r.backend).toEqual({
            ran: "cpu",
            reason: "no usable WebGPU device: only a software adapter (test)",
            device: null,
        });
        await expect(cy.graphtyPageRankAsync({ gpu: "require" })).rejects.toThrow(/software adapter/);
        expect(fake.acquired).toBe(0);
    });

    it("a failure after the GPU started is thrown, never finished on the CPU", async () => {
        const fake = fakeProvider();
        const cy = mainGraph();
        fake.failNext = true;
        await expect(cy.graphtyPageRankAsync()).rejects.toThrow(/E_DEVICE_LOST/);
        expect((await cy.graphtyPageRankAsync()).backend.ran).toBe("gpu");
    });

    it("acquires a new device after a loss", async () => {
        const fake = fakeProvider();
        const cy = mainGraph();
        await cy.graphtyPageRankAsync();
        fake.lose("lost");
        await Promise.resolve();
        const r = await cy.graphtyPageRankAsync();
        expect(fake.acquired).toBe(2);
        expect(r.backend.ran).toBe("gpu");
    });

    it("disposes the device on cy.destroy(), and a later call rejects", async () => {
        const fake = fakeProvider();
        const cy = mainGraph();
        await cy.graphtyPageRankAsync();
        cy.destroy();
        await Promise.resolve();
        expect(fake.disposed).toBe(1);
        await expect(cy.graphtyPageRankAsync()).rejects.toThrow(/destroyed/);
    });

    it("disposes a device acquired after the core was destroyed", async () => {
        const fake = fakeProvider();
        const cy = mainGraph();
        const pending = cy.graphtyPageRankAsync();
        cy.destroy();
        const r = await pending;
        expect(r.backend.ran).toBe("cpu");
        expect(fake.disposed).toBe(1);
    });

    it("releases a snapshot's upload when the graph changes, and a weight function's after the call", async () => {
        const fake = fakeProvider();
        const cy = mainGraph();
        await cy.graphtyPageRankAsync();
        expect(fake.released).toHaveLength(0);
        cy.add({ data: { id: "new" } });
        expect(fake.released).toHaveLength(1);
        await cy.graphtyPageRankAsync({ weight: (e: cytoscape.EdgeSingular) => e.data("w") as number });
        expect(fake.released).toHaveLength(2);
    });

    it("a new provider disposes the old device", async () => {
        const first = fakeProvider();
        const cy = mainGraph();
        await cy.graphtyPageRankAsync();
        const second = fakeProvider();
        await cy.graphtyPageRankAsync();
        expect(first.disposed).toBe(1);
        expect(second.acquired).toBe(1);
    });

    /**
     * Runs a layout to layoutstop.
     * @param cy - the core
     * @param options - the layout options
     * @returns the layout's backend and the errors it emitted
     */
    async function layoutRun(
        cy: cytoscape.Core,
        options: Record<string, unknown>,
    ): Promise<{ backend: Backend | undefined; errors: unknown[] }> {
        const layout = cy.layout({ boundingBox: BOX, maxIter: 20, ...options } as unknown as LayoutOptions);
        const errors: unknown[] = [];
        layout.on("layouterror", (_e: EventObject, error: unknown) => errors.push(error));
        const stop = layout.promiseOn("layoutstop");
        layout.run();
        await stop;
        return { backend: (layout as unknown as { backend?: Backend }).backend, errors };
    }

    it("a simulation runs on the core's device and reports it", async () => {
        fakeProvider();
        const cy = mainGraph();
        const { backend, errors } = await layoutRun(cy, { name: "graphty-forceatlas2" });
        expect(errors).toEqual([]);
        expect(backend).toEqual({ ran: "gpu", reason: null, device: "fake device" });
        expect(
            cy
                .nodes()
                .toArray()
                .every((n) => Number.isFinite(n.position().x)),
        ).toBe(true);
    });

    it("a simulation with a refused device runs on the CPU, and require reports layouterror", async () => {
        fakeProvider("E_NO_ADAPTER");
        const cy = mainGraph();
        expect((await layoutRun(cy, { name: "graphty-forceatlas2" })).backend?.ran).toBe("cpu");
        const required = await layoutRun(cy, { name: "graphty-forceatlas2", gpu: "require" });
        expect(required.errors).toHaveLength(1);
        const se = await layoutRun(cy, { name: "graphty-spring-electrical" });
        expect((se.errors[0] as Error).message).toMatch(/no CPU simulation/);
    });

    it('a simulation with gpu: "off" or accelerator: null stays on the CPU', async () => {
        const fake = fakeProvider();
        const cy = mainGraph();
        expect((await layoutRun(cy, { name: "graphty-forceatlas2", gpu: "off" })).backend?.reason).toMatch(/off/);
        expect((await layoutRun(cy, { name: "graphty-forceatlas2", accelerator: null })).backend?.ran).toBe("cpu");
        expect(fake.acquired).toBe(0);
    });

    it("stop() while the device is being acquired ends the run with layoutstop", async () => {
        fakeProvider();
        const cy = mainGraph();
        const layout = cy.layout({ name: "graphty-forceatlas2", boundingBox: BOX } as LayoutOptions);
        const stop = layout.promiseOn("layoutstop");
        layout.run();
        layout.stop();
        await stop;
        expect(
            cy
                .nodes()
                .toArray()
                .every((n) => n.position().x === 0),
        ).toBe(true);
    });
});
