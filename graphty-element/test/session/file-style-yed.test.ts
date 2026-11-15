/**
 * @file What a yEd file draws, carried through to the element's channels: a node whose `y:Fill`
 * has a `color2` is filled with a gradient from its color into that one (yEd runs a shape node's
 * left to right and a generic node's from the top-left corner to the bottom-right one, as its own
 * SVG export draws them: yed-graphml-specimen-node-fills-borders, graphml-scala-collection-mutable),
 * and a group's header label, which yEd draws inside the group along its top, is placed inside the
 * node rather than in its middle.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

/**
 * Three yEd nodes: a gradient-filled box, a gradient-filled flowchart process, and a group whose
 * right-aligned header runs along its top.
 */
const DOC = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">',
    '<key id="d6" for="node" yfiles.type="nodegraphics"/>',
    '<graph edgedefault="directed" id="G">',
    '<node id="box"><data key="d6"><y:ShapeNode><y:Geometry height="40" width="80" x="0" y="0"/>',
    '<y:Fill color="#E8EEF7" color2="#B7C9E3" transparent="false"/>',
    '<y:NodeLabel modelName="internal" modelPosition="c">box</y:NodeLabel></y:ShapeNode></data></node>',
    '<node id="flow"><data key="d6"><y:GenericNode configuration="com.yworks.flowchart.process">',
    '<y:Geometry height="40" width="80" x="0" y="100"/>',
    '<y:Fill color="#E8EEF7" color2="#B7C9E3" transparent="false"/></y:GenericNode></data></node>',
    '<node id="group"><data key="d6"><y:ShapeNode><y:Geometry height="200" width="300" x="200" y="0"/>',
    '<y:Fill color="#F5F5F5" transparent="false"/>',
    '<y:NodeLabel alignment="right" autoSizePolicy="node_width" modelName="internal" modelPosition="t"',
    ' x="0" y="0" width="300" height="21">Open group</y:NodeLabel></y:ShapeNode></data></node>',
    "</graph></graphml>",
].join("");

/**
 * What one node is drawn with on one channel.
 * @param session - The session.
 * @param node - The node.
 * @param channel - The channel.
 * @returns The value.
 */
function drawn(session: GraphSession, node: string, channel: string): unknown {
    return (session.styles.explain({ node }).merged as Record<string, unknown>)[channel];
}

/**
 * Load the document with its styles.
 * @returns The session, settled.
 */
async function loaded(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "graphml", config: { data: DOC } }, { styles: "file", layout: "recommended" });
    await vi.waitFor(() => {
        assert.lengthOf(session.history.pending, 0);
    });
    return session;
}

describe("a yEd file's styles", () => {
    it("fills a node with color2 with the gradient yEd draws, and leaves a flat node flat", async () => {
        const session = await loaded();

        assert.match(JSON.stringify(drawn(session, "box", "node.color")), /e8eef7/i);
        assert.match(JSON.stringify(drawn(session, "box", "node.gradientColor")), /b7c9e3/i);
        // a shape node's ramp runs left to right
        assert.strictEqual(drawn(session, "box", "node.gradientDirection"), 0);
        // a generic node's runs corner to corner: on the ramp stretched over its 80 x 40 box,
        // atan2(40^2, 80^2) degrees
        assert.match(JSON.stringify(drawn(session, "flow", "node.gradientColor")), /b7c9e3/i);
        assert.strictEqual(drawn(session, "flow", "node.gradientDirection"), 14.036);
        assert.isUndefined(drawn(session, "group", "node.gradientColor"));
        session.dispose();
    });

    it("places a group's right-aligned header inside its top-right corner", async () => {
        const session = await loaded();

        const style = drawn(session, "group", "node.labelStyle") as { location?: unknown } | undefined;
        assert.strictEqual(style?.location, "inside-top-right");
        session.dispose();
    });
});
