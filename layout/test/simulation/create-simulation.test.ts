import assert from "node:assert";
import { describe, it } from "vitest";

import { createSimulation, ForceAtlas2Simulation, FruchtermanReingoldSimulation } from "../../src/simulation";
import type { LayoutAccelerator, LayoutSimulation } from "../../src/simulation";

const fakeSim: LayoutSimulation = {
    load() {},
    step() {},
    settled: true,
    setFixed() {},
    setPosition() {},
    dispose() {},
};

describe("createSimulation", () => {
    it("delegates to the accelerator when it has the method", () => {
        const calls: string[] = [];
        const acc: LayoutAccelerator = {
            kind: "fake",
            forceAtlas2: () => {
                calls.push("fa2");
                return fakeSim;
            },
        };
        assert.equal(createSimulation("forceatlas2", {}, acc), fakeSim);
        assert.deepEqual(calls, ["fa2"]);
    });
    it("runs the CPU simulation when no accelerator is injected or the method is missing", () => {
        assert.ok(createSimulation("forceatlas2") instanceof ForceAtlas2Simulation);
        assert.ok(createSimulation("forceatlas2", {}, null) instanceof ForceAtlas2Simulation);
        assert.ok(createSimulation("forceatlas2", {}, { kind: "fake" }) instanceof ForceAtlas2Simulation);
        assert.ok(createSimulation("fruchtermanReingold") instanceof FruchtermanReingoldSimulation);
        assert.ok(createSimulation("spring") instanceof FruchtermanReingoldSimulation, "the element's name for FR");
    });
    it("routes spring to the accelerator's fruchtermanReingold", () => {
        const acc: LayoutAccelerator = { kind: "fake", fruchtermanReingold: () => fakeSim };
        assert.equal(createSimulation("spring", {}, acc), fakeSim);
    });
    it("a throwing accelerator method propagates (no fallback)", () => {
        const acc: LayoutAccelerator = {
            kind: "fake",
            forceAtlas2: () => {
                throw new Error("E_DEVICE_LOST");
            },
        };
        assert.throws(() => createSimulation("forceatlas2", {}, acc), /E_DEVICE_LOST/);
    });
    it("spring-electrical has no CPU simulation in v1", () => {
        assert.throws(() => createSimulation("spring-electrical"), /spring-electrical/);
        const acc: LayoutAccelerator = { kind: "fake", springElectrical: () => fakeSim };
        assert.equal(createSimulation("spring-electrical", {}, acc), fakeSim);
    });
});
