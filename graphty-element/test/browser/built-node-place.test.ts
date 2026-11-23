/**
 * @file A Node built for a row a batch draws stands where its row is, read in the same frame it was built in.
 *
 * Under renderPath "batched" a row has no `Node` until something asks for one. A `Node` built after the graph had
 * settled kept its anchor's world place from the hidden mesh template, (0, -10000, 0), whenever its row's center
 * equaled the anchor's position: the place was then refreshed with an unforced `computeWorldMatrix`, which returns
 * the cached matrix whenever it already ran in this render id. Every node read in one go stood at one point, which
 * failed 76 render-parity stories (issue #9164).
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const NODES = Array.from({ length: 6 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = NODES.map((n, i) => ({ source: n.id, target: NODES[(i + 1) % NODES.length].id }));

const elements: Graphty[] = [];
afterEach(() => {
    for (const element of elements.splice(0)) {
        element.remove();
    }
});

describe("a Node built after the graph settled", () => {
    for (const path of ["objects", "batched"] as const) {
        it(`stands where its row is, ${path}`, async () => {
            const element = document.createElement("graphty-element");
            element.renderPath = path;
            element.style.display = "block";
            element.style.width = "600px";
            element.style.height = "400px";
            document.body.appendChild(element);
            elements.push(element);
            await element.updateComplete;
            await element.session.data.addNodes(NODES);
            await element.session.data.addEdges(EDGES);
            await element.waitForStableFrame();

            // All in one frame, as a reader of every node does.
            const places = element.graph.getNodes().map((node) => {
                const at = node.drawnAnchor.absolutePosition;
                return `${at.x.toFixed(3)},${at.y.toFixed(3)},${at.z.toFixed(3)}`;
            });

            assert.strictEqual(places.length, NODES.length, `${path}: every node was built`);
            assert.strictEqual(
                new Set(places).size,
                NODES.length,
                `${path}: every node stands apart: ${places.join(" ")}`,
            );
            assert.isFalse(
                places.some((place) => place.includes("-10000")),
                `${path}: no node stands at the hidden template's place: ${places.join(" ")}`,
            );
        });
    }
});
