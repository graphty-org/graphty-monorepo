/**
 * @file The quick start of the "Neighbors" guide (`docs/guide/neighbors.md`), kept here so the
 * documented code keeps working. The guide's listener body is copied verbatim; the element is a
 * headless session behind an EventTarget, and the list is a stand-in that records its children.
 */

import { assert, describe, expectTypeOf, it } from "vitest";

import type { NodeEventDetail } from "../../src/events";
import type { Graphty } from "../../src/graphty-element";
import { createGraphSession } from "../../src/session";

describe("the neighbors guide's example", () => {
    it("types the click event's detail, so the guide compiles without a cast", () => {
        expectTypeOf<HTMLElementEventMap["graphty-node-click"]>().toEqualTypeOf<CustomEvent<NodeEventDetail>>();
        expectTypeOf<HTMLElementTagNameMap["graphty-element"]>().toEqualTypeOf<Graphty>();
    });

    it("lists a clicked node's strongest neighbors with their weights", async () => {
        const session = createGraphSession();
        const data = JSON.stringify({
            nodes: [{ id: "Javert" }, { id: "Valjean" }, { id: "Cosette" }, { id: "Fantine" }],
            edges: [
                { source: "Javert", target: "Valjean", weight: 10 },
                { source: "Valjean", target: "Javert", weight: 7 },
                { source: "Javert", target: "Cosette", weight: 2 },
                { source: "Fantine", target: "Javert", weight: 5 },
            ],
        });
        await session.data.import({ type: "json", config: { data } });

        const element = Object.assign(new EventTarget(), { session });
        const items: { textContent: string }[] = [];
        const attributes = new Map<string, string>();
        const list = {
            replaceChildren: (...children: { textContent: string }[]) => items.splice(0, items.length, ...children),
            setAttribute: (name: string, value: string) => attributes.set(name, value),
        };
        const document = { createElement: (tag: string) => ({ tag, textContent: "" }) };

        // The guide's listener, verbatim.
        element.addEventListener("graphty-node-click", ((e: CustomEvent<NodeEventDetail>) => {
            const page = element.session.data.neighbors(e.detail.nodeId, { limit: 10 });
            list.replaceChildren(
                ...page.records.map((n) => {
                    const li = document.createElement("li");
                    li.textContent = page.measuredBy ? `${n.name}: ${String(n.weight)}` : n.name;
                    return li;
                }),
            );
            list.setAttribute("aria-label", `${String(page.total)} connections`);
        }) as EventListener);

        element.dispatchEvent(new CustomEvent("graphty-node-click", { detail: { nodeId: "Javert" } }));

        assert.deepStrictEqual(
            items.map((item) => item.textContent),
            ["Valjean: 17", "Fantine: 5", "Cosette: 2"],
        );
        assert.strictEqual(attributes.get("aria-label"), "3 connections");
        session.dispose();
    });
});
