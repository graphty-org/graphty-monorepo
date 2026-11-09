/**
 * A file that declares time opens with a timeline: a dynamic GEXF graph and an XGMML graph with
 * `start` and `end` designate the time field as part of the load, with the timeline experiment on.
 * Off, the load is the load it always was.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import type { TimeField } from "../../src/session/time/TimeApi";

const ON = ["timeline"];

/**
 * A GEXF document around a graph's nodes and edges.
 * @param graph - the `<graph>` attributes.
 * @param body - its `<nodes>` and `<edges>`.
 * @returns the document.
 */
function gexf(graph: string, body: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
  <graph defaultedgetype="directed" ${graph}>${body}</graph>
</gexf>`;
}

/** Instants: a `timestamp` on each element. */
const INSTANTS = gexf(
    'mode="dynamic" timeformat="integer" timerepresentation="timestamp"',
    `<nodes><node id="a" timestamp="1"/><node id="b" timestamp="2"/></nodes>
     <edges><edge source="a" target="b" timestamp="3"/></edges>`,
);

/** Intervals, in dates, on nodes only. */
const INTERVALS = gexf(
    'mode="dynamic" timeformat="date"',
    `<nodes><node id="a" start="2020-01-01" end="2020-06-01"/><node id="b" start="2021-01-01" end="2021-03-01"/></nodes>
     <edges><edge source="a" target="b"/></edges>`,
);

/** Spells beside a plain interval. */
const SPELLS = gexf(
    'mode="dynamic" timeformat="double"',
    `<nodes>
       <node id="a"><spells><spell start="1" end="2"/><spell start="5" end="6"/></spells></node>
       <node id="b" start="1" end="9"/>
     </nodes>
     <edges><edge source="a" target="b"/></edges>`,
);

/** Spells and nothing else. */
const SPELLS_ONLY = gexf(
    'mode="dynamic" timeformat="integer"',
    `<nodes>
       <node id="a"><spells><spell start="1" end="2"/></spells></node>
       <node id="b"><spells><spell start="4" end="6"/></spells></node>
     </nodes>
     <edges><edge source="a" target="b"/></edges>`,
);

/** An open end, and a GEXF 1.2 open bound. */
const OPEN = gexf(
    'mode="dynamic" timeformat="integer"',
    `<nodes><node id="a" start="1"/><node id="b" start="2" endopen="4"/></nodes>
     <edges><edge source="a" target="b"/></edges>`,
);

/** Lists of instants on nodes and on edges. */
const TIMESTAMPS = gexf(
    'mode="dynamic" timeformat="integer" timerepresentation="timestamp"',
    `<nodes><node id="a" timestamps="&lt;[1, 7]&gt;"/><node id="b" timestamps="[2, 7]"/><node id="c" timestamp="3"/></nodes>
     <edges><edge source="a" target="b" timestamps="[1, 7]"/><edge source="b" target="c" timestamp="3"/></edges>`,
);

/** Times in a static graph: nothing is designated. */
const STATIC = gexf(
    'mode="static" timeformat="integer"',
    `<nodes><node id="a" start="1" end="2"/><node id="b" start="2" end="3"/></nodes>
     <edges><edge source="a" target="b"/></edges>`,
);

/**
 * An XGMML document whose nodes and edge carry the given attributes.
 * @param atts - the `<att>` elements of every node and the edge.
 * @returns the document.
 */
function xgmml(atts: string): string {
    return `<?xml version="1.0"?>
<graph label="dynamic" directed="1" xmlns="http://www.cs.rpi.edu/XGMML">
  <node id="a" label="a">${atts}</node>
  <node id="b" label="b">${atts}</node>
  <edge source="a" target="b">${atts}</edge>
</graph>`;
}

const XGMML_BOTH = xgmml('<att name="start" type="real" value="1"/><att name="end" type="real" value="4"/>');
const XGMML_START = xgmml('<att name="start" type="real" value="1"/>');

/**
 * Loads a document into a new session.
 * @param type - the format.
 * @param data - the document.
 * @param features - the session's experiments.
 * @returns the session.
 */
async function load(type: string, data: string, features: readonly string[] = ON): Promise<GraphSession> {
    const session = createGraphSession({ features: [...features] });
    await session.data.import({ type, config: { data } });
    return session;
}

/**
 * The records a load leaves, by id, so two loads compare whatever ids the session issued.
 * @param session - the session.
 * @returns its node and edge records.
 */
function records(session: GraphSession): { nodes: unknown[]; edges: unknown[] } {
    return {
        nodes: session.data.nodes().map((node) => ({ ...node })),
        edges: session.data.edges().map(({ id: _id, ...edge }) => edge),
    };
}

/**
 * The ids a session shows.
 * @param session - the session.
 * @returns the node ids whose row is visible.
 */
function shownNodes(session: GraphSession): string[] {
    const mask = session.visibility.nodeMask();
    return session.data.nodes().flatMap((node, row) => (mask[row] === 1 ? [String(node.id)] : []));
}

describe("a dynamic GEXF graph designates its time on load", () => {
    const cases: readonly { name: string; data: string; field: TimeField }[] = [
        {
            name: "instants",
            data: INSTANTS,
            field: {
                nodes: { start: "timestamp", spells: "timestamps", unit: "ordinal" },
                edges: { start: "timestamp", spells: "timestamps", unit: "ordinal" },
            },
        },
        {
            name: "intervals in dates, on the kind that has them",
            data: INTERVALS,
            field: { nodes: { start: "start", end: "end", spells: "spells", unit: "ms" } },
        },
        {
            name: "spells",
            data: SPELLS,
            field: { nodes: { start: "start", end: "end", spells: "spells", unit: "ordinal" } },
        },
        {
            name: "spells alone, still naming start",
            data: SPELLS_ONLY,
            field: { nodes: { start: "start", end: "end", spells: "spells", unit: "ordinal" } },
        },
        {
            name: "an open bound",
            data: OPEN,
            field: { nodes: { start: "start", end: "end", spells: "spells", unit: "ordinal" } },
        },
    ];
    for (const { name, data, field } of cases) {
        it(name, async () => {
            const session = await load("gexf", data);
            assert.deepEqual(session.time.field, field);
            session.dispose();
        });
    }

    it("reads an integer time format as ordinal numbers, not years", async () => {
        const session = await load("gexf", SPELLS_ONLY);
        await session.time.ready;
        assert.deepEqual(session.time.extent()?.from, 1);
        session.dispose();
    });

    it("designates nothing for a static graph", async () => {
        const session = await load("gexf", STATIC);
        assert.isNull(session.time.field);
        session.dispose();
    });

    it("brings a listed instant into a window", async () => {
        const session = await load("gexf", TIMESTAMPS);
        assert.deepEqual(session.data.node("a")?.timestamps, ["1", "7"]);
        await session.time.window({ from: 7, to: 8 });
        // a and b list 7; c is at 3 only.
        assert.deepEqual(shownNodes(session), ["a", "b"]);
        assert.equal(session.visibility.edgeMask()[0], 1, "the edge listing 7 is inside");
        assert.equal(session.visibility.edgeMask()[1], 0, "the edge at 3 is not");
        session.dispose();
    });

    it("respects an open bound in a window", async () => {
        const session = await load("gexf", OPEN);
        await session.time.window({ from: 100, to: 101 });
        // a has no end; b's end is 4 (open), so it is gone by 100.
        assert.deepEqual(shownNodes(session), ["a"]);
        session.dispose();
    });

    it("tells time:field listeners", async () => {
        const session = createGraphSession({ features: ON });
        const heard: (TimeField | null)[] = [];
        session.on("time:field", ({ field }) => heard.push(field));
        await session.data.import({ type: "gexf", config: { data: OPEN } });
        await Promise.resolve();
        assert.deepEqual(heard, [session.time.field]);
        session.dispose();
    });
});

describe("an XGMML graph designates its time on load", () => {
    it("when start and end are both present", async () => {
        const session = await load("xgmml", XGMML_BOTH);
        assert.deepEqual(session.time.field, {
            nodes: { start: "start", end: "end", unit: "ordinal" },
            edges: { start: "start", end: "end", unit: "ordinal" },
        });
        session.dispose();
    });

    it("not with start alone", async () => {
        const session = await load("xgmml", XGMML_START);
        assert.isNull(session.time.field);
        session.dispose();
    });
});

describe("the designation is part of the load", () => {
    it("is undone with the load, never alone", async () => {
        const session = await load("gexf", INTERVALS);
        assert.isNotNull(session.time.field);
        await session.undo();
        assert.isNull(session.time.field);
        assert.equal(session.data.nodes().length, 0);
        session.dispose();
    });

    it("designates from a prepared draft, and keeps its listed instants", async () => {
        const session = createGraphSession({ features: ON });
        const draft = await session.data.prepare({ type: "gexf", config: { data: TIMESTAMPS } });
        await draft.load();
        assert.equal(session.time.field?.nodes?.spells, "timestamps");
        assert.deepEqual(session.data.node("a")?.timestamps, ["1", "7"]);
        session.dispose();
    });

    it("leaves a field already set as it is", async () => {
        const session = createGraphSession({ features: ON });
        await session.config.set({ data: { knownFields: { nodeTimePath: "born" } } });
        await session.data.import({ type: "gexf", config: { data: INTERVALS } });
        assert.deepEqual(session.time.field, { nodes: { start: "born" } });
        session.dispose();
    });
});

describe("records", () => {
    it("with the timeline on, equal those with it off apart from timestamps", async () => {
        for (const data of [INSTANTS, INTERVALS, SPELLS, SPELLS_ONLY, OPEN, TIMESTAMPS, STATIC]) {
            const on = await load("gexf", data);
            const off = await load("gexf", data, []);
            const strip = (list: unknown[]): unknown[] =>
                list.map((each) => {
                    const { timestamps: _timestamps, ...rest } = each as Record<string, unknown>;
                    return rest;
                });
            const read = { on: records(on), off: records(off) };
            assert.deepEqual(strip(read.on.nodes), read.off.nodes);
            assert.deepEqual(strip(read.on.edges), read.off.edges);
            on.dispose();
            off.dispose();
        }
    });

    it("with the timeline off, carry no timestamps and designate nothing", async () => {
        for (const [type, data] of [
            ["gexf", TIMESTAMPS],
            ["gexf", INTERVALS],
            ["xgmml", XGMML_BOTH],
        ] as const) {
            const session = await load(type, data, []);
            const { knownFields } = session.config.data;
            assert.isNull(knownFields.nodeTimePath, type);
            assert.isNull(knownFields.edgeTimePath, type);
            assert.isFalse(
                session.data.nodes().some((node) => "timestamps" in node),
                type,
            );
            session.dispose();
        }
    });

    it("with the timeline off, a prepared draft carries no timestamps and designates nothing", async () => {
        const session = createGraphSession({ features: [] });
        const draft = await session.data.prepare({ type: "gexf", config: { data: TIMESTAMPS } });
        await draft.load();
        const { knownFields } = session.config.data;
        assert.isNull(knownFields.nodeTimePath);
        assert.isNull(knownFields.edgeTimePath);
        assert.isAbove(session.data.edges().length, 0);
        assert.isFalse(session.data.nodes().some((node) => "timestamps" in node));
        assert.isFalse(session.data.edges().some((edge) => "timestamps" in edge));
        session.dispose();
    });
});
