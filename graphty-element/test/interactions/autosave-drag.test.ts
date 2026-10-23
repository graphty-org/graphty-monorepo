/**
 * @file A node dragged with a real mouse (the browser's own input pipeline, through
 * test/helpers/real-input.ts) is written by autosave once, at the drop, and never while the
 * pointer moves: the drag is one committed change, and autosave writes committed changes only.
 * The store is a real in-memory store whose commits are counted; the schedule is set to write at
 * once, so a write during the drag could not hide behind the debounce.
 */

import "../../src/graphty-element";

import { afterEach, assert, it } from "vitest";

import type { Graphty } from "../../index.js";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import type { AutosaveStore, AutosaveWrite } from "../../src/autosave/types";
import { drag, nextFrame, type Point } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 3, z: 0 } },
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Wait, a frame at a time, until a condition holds.
 * @param condition - The condition.
 * @param what - What is waited for.
 */
async function until(condition: () => boolean, what: string): Promise<void> {
    for (let frame = 0; frame < 600 && !condition(); frame++) {
        await nextFrame();
    }

    assert.isTrue(condition(), what);
}

it("a real mouse drag is written at the drop, not while the node moves", async () => {
    const memory = memoryAutosaveStore();
    const commits: { writes: readonly AutosaveWrite[]; dragging: boolean }[] = [];
    let dragging = false;
    const store: AutosaveStore = {
        list: (key) => memory.list(key),
        read: (id) => memory.read(id),
        remove: (id) => memory.remove(id),
        commit: (writes, options) => {
            commits.push({ writes, dragging });
            return memory.commit(writes, options);
        },
    };

    const element: Graphty = document.createElement("graphty-element");
    element.setAttribute("autosave", `test.autosave.drag.${crypto.randomUUID()}`);
    element.autosaveOptions = { store, delayMs: 0, maxWaitMs: 0, dataMaxWaitMs: 0 };
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.layout = "fixed";
    element.viewMode = "2d";
    element.nodeData = NODES;
    element.edgeData = [{ source: "a", target: "c" }];
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    element.addEventListener("graphty-node-drag-start", () => {
        dragging = true;
    });
    element.addEventListener("graphty-node-drag-end", () => {
        dragging = false;
    });

    await element.autosaver.ready;
    await until(() => element.session.data.snapshot().nodeCount === NODES.length, "the page's rows loaded");
    await element.waitForStableFrame();
    // An edit first, so the entry exists and the drag is an ordinary later write.
    await element.session.config.set({ name: "Before the drag" });
    await element.autosaver.flush();
    const before = commits.length;
    assert.isAbove(before, 0, "the edit was written");

    const position = element.nodeScreenPosition("c");
    assert.isDefined(position);
    const from: Point = { x: position.x, y: position.y };
    await drag(element, from, { x: from.x + 60, y: from.y + 40 }, 12);
    await until(() => element.autosaver.status.state === "saved" && commits.length > before, "the drop was written");

    assert.isTrue(element.isPinned("c"), "the drag placed the node");
    assert.deepStrictEqual(
        commits.filter((commit) => commit.dragging).length,
        0,
        "nothing was written while the pointer moved the node",
    );
    const after = commits.slice(before);
    assert.isTrue(
        after.some((commit) => commit.writes.some((write) => typeof write.parts.arrangement === "string")),
        "the drop wrote the arrangement",
    );
});
