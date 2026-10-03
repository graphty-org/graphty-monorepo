/**
 * @file The quick start of the "Finding" guide (`docs/guide/find.md`), kept here so the documented
 * code keeps working. The guide's listener is copied verbatim; the element is a standalone
 * session with a `zoomToSelection` that records its call.
 */

import { assert, describe, it } from "vitest";

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
        box.addEventListener("input", () => {
            const found = element.session.find(box.value, { limit: 10 });
            list.replaceChildren(
                ...found.records.map((hit) => {
                    const li = document.createElement("li");
                    li.textContent =
                        hit.kind === "node" ? hit.name : `${hit.ends.source.name} - ${hit.ends.target.name}`;
                    li.onclick = async () => {
                        await element.session.selection.apply(hit.target);
                        await element.zoomToSelection();
                    };
                    return li;
                }),
            );
        });
        // --- end ---

        box.value = "jav";
        box.dispatchEvent(new Event("input"));
        assert.deepEqual(
            [...list.children].map((li) => li.textContent),
            ["Javert"],
        );
        assert.lengthOf(session.selection.nodes, 0, "typing selected nothing");

        box.value = "purs";
        box.dispatchEvent(new Event("input"));
        assert.deepEqual(
            [...list.children].map((li) => li.textContent),
            ["Valjean - Javert"],
        );
        await (list.children[0] as HTMLLIElement).onclick?.(new PointerEvent("click"));
        assert.lengthOf(session.selection.edges, 1, "the click selected the edge");
        assert.strictEqual(framed, 1, "and framed it");
        session.dispose();
    });
});
