import { describe, expect, it } from "vitest";

import { dotFileLayout } from "../../../src/formats/dot/layout.js";
import { importGraph, registry } from "../../../src/registry.js";

/**
 * The layout a DOT text asks for, read through the registry's importer.
 * @param text - the DOT text
 * @returns the importer's answer
 */
async function layoutOf(text: string): Promise<unknown> {
    const { snapshot, format } = await importGraph(text, { format: "dot" });
    return registry.importer(format).layout?.(snapshot);
}

describe("the layout a DOT file asks for", () => {
    it("is dot, with no settings, for a file that names none", async () => {
        expect(await layoutOf("graph { a -- b }")).toEqual({
            tool: "graphviz",
            program: "dot",
            ownFormat: true,
            settings: {},
        });
    });

    it("names the file's layout program, its direction and spacing in points, and passes on only layout settings", async () => {
        expect(
            await layoutOf(
                'digraph { layout=neato; rankdir=lr; nodesep=0.5; ranksep="1.0 equally"; label="x"; a -> b }',
            ),
        ).toEqual({
            tool: "graphviz",
            program: "neato",
            ownFormat: true,
            direction: "right",
            nodeSpacing: 36,
            rankSpacing: 72,
            settings: { rankdir: "lr", nodesep: "0.5", ranksep: "1.0 equally" },
        });
    });

    it("reads the same fact from a plain record of graph attributes", () => {
        expect(dotFileLayout({ rankdir: "BT", layout: "", splines: true })).toEqual({
            tool: "graphviz",
            program: "dot",
            ownFormat: true,
            direction: "up",
            settings: { rankdir: "BT", splines: "true" },
        });
    });
});
