/**
 * A glow that cannot be applied, and a shader runtime release that throws, are reported through
 * the element's logger instead of being discarded, and leave nothing half done behind (#7128).
 */
import { HighlightLayer, MeshBuilder, NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import { GraphtyLogger } from "../../src/logging/GraphtyLogger.js";
import { resetLoggingConfig } from "../../src/logging/LoggerConfig.js";
import { LogLevel, type LogRecord } from "../../src/logging/types.js";
import { NodeEffects } from "../../src/meshes/NodeEffects";
import { ShaderRuntime } from "../../src/shaders/runtime/ShaderRuntime";

// The scene uniform buffer needs a real GPU engine; the release order is what is under test here.
const uniformsReleased = vi.hoisted(() => ({ count: 0 }));
vi.mock("../../src/shaders/runtime/sceneUniforms", () => ({
    SceneUniforms: class {
        dispose(): void {
            uniformsReleased.count++;
        }
    },
}));

const SINK = "teardown-report-test";

async function listen(): Promise<LogRecord[]> {
    resetLoggingConfig();
    uniformsReleased.count = 0;
    await GraphtyLogger.configure({ enabled: true, level: LogLevel.ERROR });
    const records: LogRecord[] = [];
    GraphtyLogger.addSink({ name: SINK, write: (record) => records.push(record) });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    return records;
}

afterEach(() => {
    GraphtyLogger.removeSink(SINK);
    resetLoggingConfig();
    vi.restoreAllMocks();
});

describe("glow setup and shader runtime teardown report their failures", () => {
    it("logs a glow the layer refused and drops its strength", async () => {
        const records = await listen();
        const engine = new NullEngine();
        const scene = new Scene(engine);
        const mesh = MeshBuilder.CreateSphere("glowing", {}, scene);
        vi.spyOn(HighlightLayer.prototype, "addMesh").mockImplementation(() => {
            throw new Error("mesh in a bad state");
        });

        try {
            NodeEffects.applyGlowEffect(mesh, { glow: { color: "#ff0000", strength: 2 } });

            const strengths = scene.metadata?.glowStrengths as Map<unknown, unknown> | undefined;
            assert.isFalse(strengths?.has(mesh) ?? false);
            const logged = records.find((record) => record.message === "Glow not applied");
            assert.strictEqual(logged?.error?.message, "mesh in a bad state");
        } finally {
            scene.dispose();
            engine.dispose();
        }
    });

    it("releases everything else when one release throws while the engine is alive", async () => {
        const records = await listen();
        const engine = new NullEngine();
        const scene = new Scene(engine);
        const runtime = new ShaderRuntime(scene);
        const { effects } = runtime as unknown as { effects: Map<string, { dispose: () => void }> };
        const second = vi.fn();
        effects.set("a", {
            dispose: () => {
                throw new Error("effect release failed");
            },
        });
        effects.set("b", { dispose: second });

        try {
            runtime.dispose();

            assert.strictEqual(second.mock.calls.length, 1);
            assert.strictEqual(uniformsReleased.count, 1);
            assert.strictEqual(effects.size, 0);
            const logged = records.find((record) => record.message === "Shader runtime release failed");
            assert.strictEqual(logged?.error?.message, "effect release failed");
        } finally {
            scene.dispose();
            engine.dispose();
        }
    });

    it("releases nothing and reports nothing once the engine is gone", async () => {
        const records = await listen();
        const engine = new NullEngine();
        const scene = new Scene(engine);
        const runtime = new ShaderRuntime(scene);
        scene.dispose();
        engine.dispose();

        runtime.dispose();

        assert.strictEqual(uniformsReleased.count, 0);
        assert.strictEqual(records.length, 0);
    });
});
