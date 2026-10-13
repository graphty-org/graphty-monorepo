/**
 * @file A layout given a graph it cannot arrange (issue #2275), planar over K5 and bfs over a
 * disconnected graph: the refusal reaches the error event with its own code (`E_NOT_PLANAR`,
 * `E_NOT_CONNECTED`), not as an uncoded error or `E_INTERNAL`, and the refused layout places
 * nothing -- every node stays where it was.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { isGraphtyError } from "../../src/errors";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** Every edge of the complete graph on `ids`. */
const complete = (ids: number[]): { src: number; dst: number }[] =>
    ids.flatMap((src, i) => ids.slice(i + 1).map((dst) => ({ src, dst })));

/**
 * A 2D element on the page, recording the errors it reports.
 * @returns The element and its errors.
 */
function mount(): { element: Graphty; errors: Error[] } {
    const element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:400px;height:300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    const errors: Error[] = [];
    element.addEventListener("error", (event) => {
        errors.push((event as CustomEvent<{ error: Error }>).detail.error);
    });
    element.viewMode = "2d";
    return { element, errors };
}

/**
 * Every node's coordinates in the position array, by id.
 * @param element - The element.
 * @returns `id: x,y,z`.
 */
function placed(element: Graphty): Record<string, string> {
    const { session } = element;
    const snapshot = session.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    const out: Record<string, string> = {};
    for (let row = 0; row < snapshot.nodeCount; row++) {
        session.positions.read(row, at);
        out[String(snapshot.ids.idOf(row))] = `${String(at.x)},${String(at.y)},${String(at.z)}`;
    }

    return out;
}

describe("planar layout refusing a graph", () => {
    it("reports K5 on the error event as E_NOT_PLANAR with the size it tested", async () => {
        const { element, errors } = mount();
        element.nodeData = [0, 1, 2, 3, 4].map((id) => ({ id }));
        element.edgeData = complete([0, 1, 2, 3, 4]);
        element.layout = "planar";

        await vi.waitFor(() => {
            assert.isAbove(errors.length, 0, "the refusal was reported");
        });
        for (const error of errors) {
            assert.isTrue(isGraphtyError(error), "a GraphtyError, which carries a code");
            if (isGraphtyError(error)) {
                assert.strictEqual(error.code, "E_NOT_PLANAR");
                assert.strictEqual(error.source, "layout");
                assert.strictEqual(error.details.nodeCount, 5);
                assert.strictEqual(error.details.edgeCount, 10);
                assert.include(error.message, "G is not planar.");
            }
        }
    });

    it("moves no node when the graph it refuses renumbered the rows it last drew", async () => {
        // Node 0 hangs off K5-minus-an-edge on 1..5, which is planar and gets drawn. Then, in one
        // step, node 0 goes (so 1..5 move up a row) and the missing edge arrives: K5, refused. The
        // answer for the earlier graph must not be published again over the new rows.
        const { element, errors } = mount();
        element.nodeData = [0, 1, 2, 3, 4, 5].map((id) => ({ id }));
        element.edgeData = [
            { src: 0, dst: 1 },
            ...complete([1, 2, 3, 4, 5]).filter((e) => !(e.src === 1 && e.dst === 2)),
        ];
        element.layout = "planar";
        await vi.waitFor(() => {
            assert.strictEqual(element.session.snapshot().edgeCount, 10);
        });
        await element.waitForStableFrame();
        assert.lengthOf(errors, 0, "the planar graph was drawn");
        const before = placed(element);

        await element.batchOperations(async (tx) => {
            await tx.data.removeNodes([0]);
            await tx.data.addEdges([{ src: 1, dst: 2 }]);
        });
        await vi.waitFor(() => {
            assert.isTrue(
                errors.some((error) => isGraphtyError(error) && error.code === "E_NOT_PLANAR"),
                "K5 was refused",
            );
        });
        await element.waitForStableFrame();

        const after = placed(element);
        for (const id of ["1", "2", "3", "4", "5"]) {
            assert.strictEqual(after[id], before[id], `node ${id} stays where it was drawn`);
        }
    });

    it("reports a bfs layout over a disconnected graph as E_NOT_CONNECTED", async () => {
        const { element, errors } = mount();
        element.nodeData = [0, 1, 2, 3].map((id) => ({ id }));
        element.edgeData = [{ src: 0, dst: 1 }];
        element.layoutConfig = { start: 0 };
        element.layout = "bfs";

        await vi.waitFor(() => {
            assert.isTrue(
                errors.some(
                    (error) =>
                        isGraphtyError(error) &&
                        error.code === "E_NOT_CONNECTED" &&
                        error.details.nodeCount === 4 &&
                        error.details.reached === 2,
                ),
                "the refusal was reported with its code",
            );
        });
    });
});
