/**
 * @file The quick start of the "Finding" guide (`docs/guide/find.md`), kept here so the documented
 * code keeps working. The guide's listener is copied verbatim; the element is a standalone
 * session with a `zoomToSelection` that records its call. The reader's typing, click and Enter are
 * real input through `userEvent`.
 */

import { assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { FindHit } from "../../index";
import { createGraphSession } from "../../session";

describe("the finding guide's example", () => {
    it("lists hits as the reader types, then selects and frames the one they click", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "n1", name: "Valjean" },
            { id: "n2", name: "Javert" },
        ]);
        await session.data.addEdges([{ source: "n1", target: "n2", kind: "pursues" }]);
        await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } } });
        let framed = 0;
        const element = {
            session,
            zoomToSelection: (): Promise<void> => {
                framed++;
                return Promise.resolve();
            },
        };
        document.body.innerHTML = `<input id="find"><ul id="hits"></ul>`;
        const box = document.querySelector<HTMLInputElement>("#find")!;
        const list = document.querySelector<HTMLUListElement>("#hits")!;

        // --- the guide's code ---
        function show(): void {
            const found = element.session.find(box.value, { limit: 10 });
            list.replaceChildren(
                ...found.records.flatMap((hit) => {
                    const li = document.createElement("li");
                    if (hit.kind === "node") {
                        li.textContent = hit.name;
                    } else if (hit.kind === "edge") {
                        li.textContent = `${hit.ends.source.name} -> ${hit.ends.target.name}`;
                    } else {
                        return []; // a kind added in a later release: leave it out
                    }
                    li.onclick = async () => {
                        await element.session.selection.apply(hit.target);
                        await element.zoomToSelection(); // frames a node, or an edge by its two ends
                    };
                    return [li];
                }),
            );
        }
        box.addEventListener("input", show);
        element.session.on("project:changed", show); // an undo or a new load changes what matches
        box.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && element.session.find(box.value).notSearchable) {
                void element.session.selection.apply({ text: box.value });
            }
        });
        // --- end ---

        await userEvent.fill(box, "jav");
        assert.deepEqual(
            [...list.children].map((li) => li.textContent),
            ["Javert"],
        );
        assert.lengthOf(session.selection.nodes, 0, "typing selected nothing");

        await userEvent.fill(box, "purs");
        assert.deepEqual(
            [...list.children].map((li) => li.textContent),
            ["Valjean -> Javert"],
        );
        await userEvent.click(list.children[0]);
        await vi.waitFor(() => {
            assert.strictEqual(framed, 1, "and framed it");
        });
        assert.lengthOf(session.selection.edges, 1, "the click selected the edge");

        await session.data.addNodes([{ id: "n3", name: "Javert's brother" }]);
        assert.lengthOf(list.children, 1, "still the edge: the box reads purs");
        await userEvent.fill(box, "jav");
        await session.data.addNodes([{ id: "n4", name: "Javotte" }]);
        assert.deepEqual(
            [...list.children].map((li) => li.textContent),
            ["Javert", "Javert's brother", "Javotte"],
            "a data change redraws the list",
        );

        session.selection.clear();
        await userEvent.fill(box, "Javert");
        await userEvent.keyboard("{Enter}");
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.lengthOf(session.selection.nodes, 0, "Enter on plain text commits nothing");
        await userEvent.fill(box, "regex:^Jav");
        await userEvent.keyboard("{Enter}");
        await vi.waitFor(() => {
            assert.isAbove(session.selection.nodes.length, 0, "Enter on a pattern selects what it matches");
        });
        session.dispose();
    });

    it("labels hits with a switch whose default branch skips a kind it does not know", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "n1", name: "Valjean" },
            { id: "n2", name: "Javert" },
        ]);
        await session.data.addEdges([{ source: "n1", target: "n2", kind: "pursues" }]);
        await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } } });

        // --- the guide's code ---
        function label(hit: FindHit): string | null {
            switch (hit.kind) {
                case "node":
                    return hit.name;
                case "edge":
                    return `${hit.ends.source.name} -> ${hit.ends.target.name}`;
                default:
                    return null; // a kind this code does not know yet: leave it out of the list
            }
        }
        // --- end ---

        assert.deepEqual(session.find("jav").records.map(label), ["Javert"]);
        assert.deepEqual(session.find("purs").records.map(label), ["Valjean -> Javert"]);
        assert.isNull(label({ kind: "run" } as unknown as FindHit), "an unknown kind is skipped");
        session.dispose();
    });
});
