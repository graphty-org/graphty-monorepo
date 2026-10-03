/**
 * @file The quick start of the "Neighbors" guide (`docs/guide/neighbors.md`), kept here so the
 * documented code keeps working. The guide's listener body is copied verbatim; the element is a
 * headless session behind an EventTarget, and the list is a stand-in that records its children.
 */

import { assert, describe, expectTypeOf, it } from "vitest";

import type * as Root from "../../index";
import type * as SessionEntry from "../../session";
import type { NodeEventDetail } from "../../src/events";
import type { Graphty } from "../../src/graphty-element";
import { createGraphSession } from "../../src/session";

describe("the neighbors guide's example", () => {
    it("types the click event's detail, so the guide compiles without a cast", () => {
        expectTypeOf<HTMLElementEventMap["graphty-node-click"]>().toEqualTypeOf<CustomEvent<NodeEventDetail>>();
        expectTypeOf<HTMLElementTagNameMap["graphty-element"]>().toEqualTypeOf<Graphty>();
    });

    it("exports every type the guide names from both entry points", () => {
        expectTypeOf<Root.NeighborPage>().toEqualTypeOf<SessionEntry.NeighborPage>();
        expectTypeOf<Root.NeighborOptions>().toEqualTypeOf<SessionEntry.NeighborOptions>();
        expectTypeOf<Root.Neighbor>().toEqualTypeOf<SessionEntry.Neighbor>();
        expectTypeOf<Root.NeighborSort>().toEqualTypeOf<SessionEntry.NeighborSort>();
        expectTypeOf<Root.WeightMeaning>().toEqualTypeOf<SessionEntry.WeightMeaning>();
        expectTypeOf<Root.NeighborOptions["weight"]>().toEqualTypeOf<Root.WeightMeaning | null | undefined>();
        expectTypeOf<NodeEventDetail["nodeId"]>().toEqualTypeOf<SessionEntry.NodeId>();
        expectTypeOf<Root.NodeId>().toEqualTypeOf<SessionEntry.NodeId>();
        expectTypeOf<Root.NodeId>().toEqualTypeOf<Root.NodeIdType>();
        expectTypeOf<Root.Neighbor["weight"]>().toEqualTypeOf<number>();
        expectTypeOf<Root.Neighbor["edgeCount"]>().toEqualTypeOf<number>();
        expectTypeOf<ReturnType<SessionEntry.SessionDataApi["neighbors"]>>().toEqualTypeOf<Root.NeighborPage>();
    });

    it("lists a clicked node's strongest neighbors with their weights", async () => {
        const session = createGraphSession();
        const data = JSON.stringify({
            nodes: [
                { id: "Javert", side: "law" },
                { id: "Valjean", side: "law" },
                { id: "Cosette", side: "law" },
                { id: "Fantine", side: "street" },
            ],
            edges: [
                { source: "Javert", target: "Valjean", weight: 10 },
                { source: "Valjean", target: "Javert", weight: 7 },
                { source: "Javert", target: "Cosette", weight: 2 },
                { source: "Fantine", target: "Javert", weight: 5 },
            ],
        });
        await session.data.import({ type: "json", config: { data } });
        await session.visibility.set({ kind: "categories", attribute: "data.side", values: ["law"] });

        const element = Object.assign(new EventTarget(), { session });
        interface Item {
            textContent: string;
            classes: Set<string>;
            classList: { toggle: (name: string, on: boolean) => void };
        }
        const items: Item[] = [];
        const attributes = new Map<string, string>();
        const list = {
            replaceChildren: (...children: Item[]) => items.splice(0, items.length, ...children),
            setAttribute: (name: string, value: string) => attributes.set(name, value),
        };
        const document = {
            createElement: (tag: string): Item & { tag: string } => {
                const classes = new Set<string>();
                const toggle = (name: string, on: boolean): void =>
                    void (on ? classes.add(name) : classes.delete(name));
                return { tag, textContent: "", classes, classList: { toggle } };
            },
        };

        // The guide's listener, verbatim.
        element.addEventListener("graphty-node-click", ((e: CustomEvent<NodeEventDetail>) => {
            const page = element.session.data.neighbors(e.detail.nodeId, { limit: 10 });
            list.replaceChildren(
                ...page.records.map((n) => {
                    const li = document.createElement("li");
                    li.textContent = page.measuredBy ? `${n.name}: ${String(n.weight)}` : n.name;
                    li.classList.toggle("hidden", n.excludedBy !== undefined);
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
        assert.deepStrictEqual(
            items.filter((item) => item.classes.has("hidden")).map((item) => item.textContent),
            ["Fantine: 5"],
            "the neighbor the filter hides is listed and marked",
        );
        assert.strictEqual(attributes.get("aria-label"), "3 connections");
        session.dispose();
    });
});
