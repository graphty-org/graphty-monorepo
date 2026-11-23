/**
 * @file A repaint that changes only nodes' fill opacity -- what a filter or the time window does
 * to every node it ghosts -- compares each node's whole style with the drawn one once (#7966).
 *
 * The repaint asks `nodeRebuildsFor` and then draws, and each of the two asked whether the mesh
 * is kept (the whole style) and then whether it moves (the style without its fill): four deep
 * comparisons of every node's style, most of a filter change's repaint at 50,000 nodes. Counted
 * here as calls of lodash's `isEqual` on a whole node style (one with a `shape`).
 */
import { afterEach, assert, describe, it, vi } from "vitest";

import { type GhostNodes, ghostNodes, repaint } from "./helpers/ghost-repaint";

const counted = vi.hoisted(() => ({ wholeStyles: 0 }));

vi.mock("lodash/isEqual.js", async (importOriginal) => {
    const { default: isEqual } = await importOriginal<{ default: (a: unknown, b: unknown) => boolean }>();
    return {
        default: (a: unknown, b: unknown): boolean => {
            if (typeof a === "object" && a !== null && "shape" in a) {
                counted.wholeStyles++;
            }

            return isEqual(a, b);
        },
    };
});

describe("a ghosting repaint compares each node's style once", () => {
    let built: GhostNodes | null = null;

    afterEach(() => {
        built?.dispose();
        built = null;
    });

    it("one whole-style comparison per node, however the paint goes", () => {
        built = ghostNodes(8);
        for (const opacity of [0.2, undefined, 0.2]) {
            counted.wholeStyles = 0;
            const rebuilt = repaint(built.nodes, opacity);
            assert.strictEqual(rebuilt, 0, "an opacity change moves the mesh, never rebuilds it");
            assert.strictEqual(counted.wholeStyles, built.nodes.length, "one comparison per node");
        }
    });

    it("still tells a ghosted node from a plain one", () => {
        built = ghostNodes(1);
        const [node] = built.nodes;
        const before = node.mesh;
        const sourceOf = (): unknown => (node.mesh as unknown as { sourceMesh: unknown }).sourceMesh;
        const plain = sourceOf();
        repaint(built.nodes, 0.2);
        assert.isTrue(node.mesh === before, "the mesh moved to the faint source, not rebuilt");
        assert.isTrue(sourceOf() !== plain, "drawn from another source");
    });
});
