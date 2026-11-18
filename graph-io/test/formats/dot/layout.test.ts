import { describe, expect, it } from "vitest";

import { dotFileLayout, type RequestedLayout, requestedLayout } from "../../../src/formats/dot/layout.js";
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

    it("passes on compound, which lets an edge's lhead or ltail clip it at a cluster (issue #5253)", () => {
        expect(dotFileLayout({ compound: "true" }).settings).toEqual({ compound: "true" });
    });
});

/**
 * The layout a file asks for, as the neutral request graph-io hands over.
 * @param text - the file
 * @param format - its format
 * @returns the request
 */
async function requestOf(text: string, format: string): Promise<RequestedLayout | null> {
    const { snapshot } = await importGraph(text, { format });
    const attributes: Record<string, unknown> = {};
    for (const name of snapshot.graph.names()) {
        if (snapshot.graph.isSet(name, 0)) {
            attributes[name] = snapshot.graph.value(name, 0);
        }
    }
    return requestedLayout(format, attributes);
}

describe("the layout a file requests (requestedLayout)", () => {
    it("asks a DOT file with no coordinates for graphviz-<engine>, nodes sized by their labels", async () => {
        expect(await requestOf("digraph { layout=neato; overlap=false; a -> b }", "dot")).toEqual({
            layout: "graphviz-neato",
            options: { attributes: { overlap: "false" }, nodeSize: "label" },
            routedWhenPlaced: { edgeRoutes: "graphviz", graphvizAttributes: {} },
        });
    });

    it("draws a program it does not know with dot", () => {
        expect(requestedLayout("dot", { layout: "nop" })?.layout).toBe("graphviz-dot");
    });

    it("routes a placed DOT file's edges round its nodes with the file's route attributes", async () => {
        const request = await requestOf(
            'graph { splines=ortho; esep=3; a [pos="0,0!"]; b [pos="72,72!"]; a -- b }',
            "dot",
        );
        expect(request?.routedWhenPlaced).toEqual({
            edgeRoutes: "graphviz",
            graphvizAttributes: { splines: "ortho", esep: "3" },
        });
    });

    it("gives a GraphML file that names an engine the same shape, without DOT's own sizing or routes", async () => {
        const graphml =
            '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">' +
            '<key id="l" for="graph" attr.name="layout" attr.type="string"/>' +
            '<key id="r" for="graph" attr.name="rankdir" attr.type="string"/>' +
            '<graph edgedefault="directed"><data key="l">circo</data><data key="r">LR</data>' +
            '<node id="a"/><node id="b"/><edge source="a" target="b"/></graph></graphml>';
        expect(await requestOf(graphml, "graphml")).toEqual({
            layout: "graphviz-circo",
            options: { attributes: { rankdir: "LR" } },
        });
    });

    it("gives a GEXF file that names an engine the same shape", () => {
        expect(requestedLayout("gexf", { layout: "twopi" })).toEqual({ layout: "graphviz-twopi", options: {} });
    });

    it("asks nothing of a non-DOT file that names no Graphviz engine", () => {
        expect(requestedLayout("graphml", { layout: "nop" })).toBeNull();
        expect(requestedLayout("gexf", {})).toBeNull();
    });

    it("carries no format, tool or program", async () => {
        const request = await requestOf("graph { a -- b }", "dot");
        expect(Object.keys(request ?? {}).sort()).toEqual(["layout", "options", "routedWhenPlaced"]);
    });
});
