/**
 * @file The records and direction the GEXF and GraphML sources build from what graph-io read, for
 * the inputs the corpus does not cover: keyword case, key precedence, declaration order, a
 * headerless GEXF file with mixed edge types, date attributes, open spells, mutual edges and
 * yFiles colours.
 */
import { assert, describe, it } from "vitest";

import type { DataSource } from "../../src/data/DataSource.js";
import { GEXFDataSource } from "../../src/data/GEXFDataSource.js";
import { GraphMLDataSource } from "../../src/data/GraphMLDataSource.js";

interface Loaded {
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
    source: DataSource;
}

async function read(source: DataSource): Promise<Loaded> {
    const nodes: Record<string, unknown>[] = [];
    const edges: Record<string, unknown>[] = [];
    for await (const chunk of source.getData()) {
        nodes.push(...(chunk.nodes as Record<string, unknown>[]));
        edges.push(...(chunk.edges as Record<string, unknown>[]));
    }
    return { nodes, edges, source };
}

const gexf = (graph: string, body: string): Promise<Loaded> =>
    read(
        new GEXFDataSource({
            data: `<gexf xmlns="http://gexf.net/1.2" version="1.2"><graph ${graph}>${body}</graph></gexf>`,
        }),
    );

const graphml = (body: string): Promise<Loaded> =>
    read(
        new GraphMLDataSource({
            data: `<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">${body}</graphml>`,
        }),
    );

const NODES_ABC = `<nodes><node id="a"/><node id="b"/><node id="c"/></nodes>`;

describe("GEXF records", () => {
    it("reads defaultedgetype in any case, with no edge counted as a conflict", async () => {
        const { edges, source } = await gexf(
            `defaultedgetype="Directed"`,
            `${NODES_ABC}<edges><edge source="a" target="b"/><edge source="b" target="c" type="directed"/><edge source="c" target="a"/></edges>`,
        );
        assert.deepEqual(source.declaredDirection, {
            directed: true,
            statedBy: 'defaultedgetype="Directed"',
            conflictingEdges: 0,
        });
        assert.deepEqual(
            edges.map((edge) => edge.type),
            [undefined, undefined, undefined],
        );
    });

    it("keeps an edge whose type is not lower case, and counts it", async () => {
        const { edges, source } = await gexf(
            "",
            `${NODES_ABC}<edges><edge source="a" target="b" type="directed"/><edge source="b" target="a" type="Directed"/></edges>`,
        );
        assert.strictEqual(edges.length, 2);
        assert.strictEqual(source.getErrorAggregator().getErrorCount(), 0);
        assert.strictEqual(
            source.declaredDirection?.statedBy,
            'type="directed" on 2 edge(s), with no defaultedgetype on <graph>',
        );
    });

    it("reads a headerless file with mixed edge types as directed, counting only the undirected edge", async () => {
        const { edges, source } = await gexf(
            "",
            `${NODES_ABC}<edges><edge source="a" target="b" type="directed"/><edge source="b" target="c" type="undirected"/><edge source="c" target="a"/></edges>`,
        );
        assert.deepEqual(source.declaredDirection, {
            directed: true,
            statedBy: 'type="directed" on 1 edge(s), with no defaultedgetype on <graph>',
            conflictingEdges: 1,
        });
        assert.deepEqual(
            edges.map((edge) => edge.type),
            [undefined, "undirected", undefined],
        );
    });

    it("marks a mutual edge as mutual", async () => {
        const { edges } = await gexf(
            `defaultedgetype="undirected"`,
            `${NODES_ABC}<edges><edge source="a" target="b" type="mutual"/><edge source="b" target="c"/></edges>`,
        );
        assert.deepEqual(
            edges.map((edge) => edge.type),
            ["mutual", undefined],
        );
    });

    it("lets an attribute titled label override the label= attribute", async () => {
        const { nodes, edges } = await gexf(
            `defaultedgetype="undirected"`,
            `<attributes class="node"><attribute id="0" title="label" type="string"/></attributes>` +
                `<attributes class="edge"><attribute id="0" title="label" type="string"/></attributes>` +
                `<nodes><node id="0" label="Zero"><attvalues><attvalue for="0" value="AttrLabel"/></attvalues></node><node id="1"/></nodes>` +
                `<edges><edge source="0" target="1" label="EL"><attvalues><attvalue for="0" value="AttrEL"/></attvalues></edge></edges>`,
        );
        assert.strictEqual(nodes[0].label, "AttrLabel");
        assert.strictEqual(edges[0].label, "AttrEL");
    });

    it("keeps a date attribute as its ISO text", async () => {
        const { nodes } = await gexf(
            "",
            `<attributes class="node"><attribute id="0" title="born" type="date"/></attributes>` +
                `<nodes><node id="a"><attvalues><attvalue for="0" value="2020-01-02"/></attvalues></node></nodes>`,
        );
        assert.strictEqual(nodes[0].born, "2020-01-02");
    });

    it("marks an open start bound on a spell", async () => {
        const { nodes } = await gexf(
            `mode="dynamic" timeformat="integer"`,
            `<nodes><node id="a"><spells><spell startopen="2001" end="2002"/></spells></node></nodes>`,
        );
        assert.deepEqual(nodes[0].spells, [{ start: "2001", end: "2002", startOpen: true }]);
    });
});

describe("GraphML records", () => {
    it("yields nodes in the order the file declares them, even one an edge named first", async () => {
        const { nodes } = await graphml(
            `<graph edgedefault="directed"><edge source="z" target="y"/><node id="y"/><node id="0"/><node id="z"/></graph>`,
        );
        assert.deepEqual(
            nodes.map((node) => node.id),
            ["y", "0", "z"],
        );
    });

    it("normalises a yFiles colour to upper-case #RRGGBB", async () => {
        const { nodes } = await graphml(
            `<key id="d0" for="node" yfiles.type="nodegraphics"/><graph edgedefault="undirected">` +
                `<node id="n0"><data key="d0"><y:ShapeNode><y:Fill color="#ffcc00"/><y:BorderStyle color="#0a0"/></y:ShapeNode></data></node></graph>`,
        );
        assert.strictEqual(nodes[0].color, "#FFCC00");
        assert.strictEqual(nodes[0].borderColor, "#00AA00");
    });
});
