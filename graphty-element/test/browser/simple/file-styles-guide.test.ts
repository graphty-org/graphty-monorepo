/**
 * @file The styles-from-files guide's first example, run on a real element: a GEXF file whose
 * nodes Gephi colored by team loads with its colors, saves to GraphML with its styles, and the saved
 * file loads back into a fresh element drawn the same way. The guide shows the example verbatim
 * (test/simple/file-styles-guide.test.ts), so this runs exactly the code a reader copies.
 */
import "../../../src/graphty-element";

import type { Graphty as PublishedGraphty } from "@graphty/graphty-element";
import { afterEach, assert, describe, it, vi } from "vitest";

import { openAndSave } from "../../../docs/examples/file-styles/open-and-save";
import type { Graphty } from "../../../index.js";
import { fileStyleOf } from "../../../session";

/** Twelve nodes in two teams, each team with its own viz color. */
const GEXF = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<graph defaultedgetype="undirected"><attributes class="node"><attribute id="0" title="team" type="string"/></attributes>
<nodes>
${Array.from({ length: 12 }, (_unused, i) => {
    const red = i % 3 !== 0;
    return `<node id="n${String(i)}"><attvalues><attvalue for="0" value="${red ? "red" : "blue"}"/></attvalues><viz:color r="${red ? "255" : "0"}" g="0" b="${red ? "0" : "255"}"/></node>`;
}).join("\n")}
</nodes><edges><edge source="n0" target="n1"/><edge source="n1" target="n2"/></edges></graph></gexf>`;

const mounted: Graphty[] = [];

/**
 * A fresh element on the page.
 * @returns The element, ready.
 */
async function mount(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    return element;
}

/**
 * What a node is drawn with.
 * @param element - The element.
 * @param id - The node.
 * @returns Its color as `#rrggbb`.
 */
function color(element: Graphty, id: string): string {
    const value = (element.session.styles.explain({ node: id }).merged as Record<string, unknown>)["node.color"];
    return (value as { hex: string }).hex.slice(0, 7).toLowerCase();
}

afterEach(() => {
    vi.restoreAllMocks();
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

describe("the styles-from-files guide's first example", () => {
    it("draws the file's colors, saves them, and the saved file draws the same", async () => {
        vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(new Response(GEXF, { status: 200 })));
        vi.spyOn(console, "log").mockImplementation(() => undefined);
        const losses: unknown[] = [];
        vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
            losses.push(args[0]);
        });

        const element = await mount();
        // The example is typed against the published declarations, this element against the source.
        const graphml = await openAndSave(element as unknown as PublishedGraphty, "https://example.com/teams.gexf");

        const fileLayers = element.session.styles.list().filter((layer) => fileStyleOf(layer) !== null);
        assert.isNotEmpty(fileLayers);
        assert.strictEqual(color(element, "n1"), "#ff0000");
        assert.strictEqual(color(element, "n0"), "#0000ff");
        assert.include(graphml, "graphty.styles");
        assert.notInclude(losses, "W_STYLES_NOT_EXPORTED");

        const again = await mount();
        await again.loadFromFile(new File([graphml], "teams.graphml", { type: "application/xml" }), { styles: "file" });
        assert.strictEqual(color(again, "n1"), "#ff0000");
        assert.strictEqual(color(again, "n0"), "#0000ff");
        assert.deepEqual(
            again.session.styles
                .list()
                .map((layer) => fileStyleOf(layer)?.ruleId)
                .filter((id) => id !== undefined),
            fileLayers.map((layer) => fileStyleOf(layer)?.ruleId),
        );
    });

    it("says what an export without styles leaves out", async () => {
        vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(new Response(GEXF, { status: 200 })));
        const element = await mount();
        await element.loadFromUrl("https://example.com/teams.gexf", { styles: "file" });
        const plain = await element.exportGraph("graphml");
        assert.include(
            plain.losses.map((loss) => loss.code),
            "W_STYLES_NOT_EXPORTED",
        );
    });
});
