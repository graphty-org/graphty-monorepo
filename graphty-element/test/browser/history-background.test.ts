/**
 * @file The background and the configuration document on a real `Graph`, across undo and redo.
 *
 * The scene holds at most one skybox dome, and none while the background is a colour, however the
 * background got there: set forward, undone or redone. `styles.config` is a frozen view of the
 * settings, the same object on every read until one of them changes. And the layout-behaviour
 * settings that are preferences of the view change no project state and record no step.
 */

import { Color4, PhotoDome } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { stateDigest } from "../../src/session/project/digest";
import { SKYBOX_PNG } from "../session/history/fixtures";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real `Graph` holding two nodes.
 * @returns The graph.
 */
async function loadedGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    await graph.setLayout("circular");
    await graph.addNodes([{ id: "a" }, { id: "b" }]);
    await operationQueueOf(graph).waitForCompletion();
    // Adding the nodes is a step; the tests here start from the loaded graph as their baseline.
    graph.getSession().history.clear();
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

/**
 * How many skybox domes the scene holds.
 * @param graph - The graph.
 * @returns The count.
 */
function domes(graph: Graph): number {
    return graph.getScene().transformNodes.filter((node) => node instanceof PhotoDome).length;
}

/**
 * The scene's clear colour, as hex.
 * @param graph - The graph.
 * @returns The colour.
 */
function clear(graph: Graph): string {
    return graph.getScene().clearColor.toHexString().slice(0, 7).toUpperCase();
}

/**
 * Set a background and wait for the picture.
 * @param graph - The graph.
 * @param background - The background.
 */
async function background(
    graph: Graph,
    background: { backgroundType: "color"; color: string } | { backgroundType: "skybox"; data: string },
): Promise<void> {
    await graph.getSession().config.set({ background });
}

/**
 * Record a step of another setting, so the next background is a step of its own rather than a
 * merge into the last one.
 * @param graph - The graph.
 * @param scale - The halo scale, which differs per call.
 */
async function between(graph: Graph, scale: number): Promise<void> {
    await graph.getSession().config.set({ selectionStyle: { scale } });
}

describe("the background across undo and redo", () => {
    it(
        "colour, skybox, colour: at most one dome, none while the background is a colour",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();

            await background(graph, { backgroundType: "color", color: "#102030" });
            await between(graph, 2);
            await background(graph, { backgroundType: "skybox", data: SKYBOX_PNG });
            assert.strictEqual(domes(graph), 1, "the skybox is one dome");
            await between(graph, 3);
            await background(graph, { backgroundType: "color", color: "#405060" });
            assert.strictEqual(domes(graph), 0, "a colour disposes the dome");
            assert.strictEqual(clear(graph), "#405060");

            await session.undo();
            assert.strictEqual(domes(graph), 1, "undoing the colour shows the skybox, once");
            await session.undo();
            await session.undo();
            assert.strictEqual(domes(graph), 0, "undoing the skybox leaves no dome");
            assert.strictEqual(clear(graph), "#102030");

            await session.redo();
            await session.redo();
            assert.strictEqual(domes(graph), 1, "redoing the skybox builds one dome");
            await session.redo();
            await session.redo();
            assert.strictEqual(domes(graph), 0);
            assert.strictEqual(clear(graph), "#405060");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "undoing the first background returns the scene to the default colour",
        async () => {
            const graph = await loadedGraph();
            const before = clear(graph);

            graph.setBackground({ backgroundType: "color", color: "black" });
            await graph.getSession().history.restoreTo(graph.getSession().history.steps.at(-1)?.id ?? null);
            assert.strictEqual(clear(graph), new Color4(0, 0, 0, 1).toHexString().slice(0, 7));

            await graph.getSession().undo();
            assert.strictEqual(clear(graph), before);
        },
        TEST_TIMEOUT_MS,
    );
});

describe("the configuration document", () => {
    it(
        "is the same frozen object on two reads with no change between them, and a new one after a change",
        async () => {
            const graph = await loadedGraph();
            const first = graph.styles.config;

            assert.strictEqual(graph.styles.config, first, "two reads, one object");
            assert.isTrue(
                Object.isFrozen(first) && Object.isFrozen(first.graph) && Object.isFrozen(first.behavior.layout),
            );
            assert.throws(() => {
                (first.graph as { viewMode: string }).viewMode = "2d";
            });

            graph.setSelectionStyle({ color: "#00BCD4" });
            assert.notStrictEqual(graph.styles.config, first, "a setting changed, so the view was rebuilt");
            assert.strictEqual(graph.styles.config.graph.selection?.color, "#00BCD4");

            await graph.getSession().undo();
            assert.strictEqual(graph.styles.config.graph.selection?.color, "#FFD700");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "takes the layout-behaviour preferences of the view without a step or a change of project state",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            const before = stateDigest(dispatcherOf(session).state);

            graph.setLayoutBehavior({
                labels: { declutter: true },
                node: { pinOnDrag: false },
                layout: { maxInFlight: 3, iterationsPerStep: 4, zoomStepInterval: 2 },
            });

            assert.strictEqual(stateDigest(dispatcherOf(session).state), before);
            assert.lengthOf(session.history.steps, 0);
            assert.isTrue(graph.styles.config.behavior.labels.declutter);
            assert.strictEqual(graph.styles.config.behavior.layout.maxInFlight, 3);

            graph.setLayoutBehavior({ layout: { preSteps: 7 } });
            assert.lengthOf(session.history.steps, 1, "a project key is a step");
            assert.deepEqual(graph.getLayoutBehavior(), {
                labels: { declutter: true },
                node: { pinOnDrag: false },
                layout: {
                    maxInFlight: 3,
                    iterationsPerStep: 4,
                    zoomStepInterval: 2,
                    preSteps: 7,
                    stepMultiplier: 1,
                    minDelta: 0,
                },
            });

            await session.undo();
            assert.strictEqual(graph.styles.config.behavior.layout.preSteps, 0);
            assert.isTrue(graph.styles.config.behavior.labels.declutter, "undo leaves the view's preferences alone");
        },
        TEST_TIMEOUT_MS,
    );
});
