/**
 * @file The version 2 `data` section as `project.open` reads it, behind the `save-files-v2`
 * experiment: the spec's example data file broken one member at a time (the section held whole, or
 * one source's ledger or options left unread), and small hand-written sections that exercise the
 * clash rules, empty ends, repeated rows, unmatched ends, undirected repeats and the reader's
 * operations, checked by what the session holds after the open.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { DocumentProblem, JsonObject } from "../../../src/session/document2/types";

const ON = { features: ["save-files-v2"] };
const EXAMPLE = JSON.parse(
    readFileSync(new URL("../../../spec/examples/card-fraud.graphty-data.json", import.meta.url), "utf8"),
) as JsonObject;
const HELD: DocumentProblem[] = [{ code: "W_SECTION_KEPT", params: { section: "data", version: 2, reason: "data" } }];

/**
 * Open a data file in a new session.
 * @param file - The file.
 * @returns The session and what the open reported, `W_NODE_NAMED_ONLY` left out.
 */
async function open(file: JsonObject): Promise<{ session: GraphSession; problems: DocumentProblem[] }> {
    const session = createGraphSession(ON);
    const report = await session.project.open(JSON.stringify(file), { rerun: false });
    const problems = (report.problems as DocumentProblem[]).filter((problem) => problem.code !== "W_NODE_NAMED_ONLY");
    return { session, problems };
}

/** The example's sources and steps, by role, in a copy that may be broken. */
interface Example {
    readonly file: JsonObject;
    readonly reader: JsonObject;
    readonly accounts: JsonObject;
    readonly network: JsonObject;
    readonly ledger: JsonObject;
    readonly joins: JsonObject[];
}

/**
 * A fresh copy of the example data file.
 * @returns The copy and its parts.
 */
function example(): Example {
    const file = structuredClone(EXAMPLE);
    const [reader, accounts, network] = file.sources as JsonObject[];
    return {
        file,
        reader,
        accounts,
        network,
        ledger: (network.origin as JsonObject).ledger as JsonObject,
        joins: file.joins as JsonObject[],
    };
}

/** A step this reader checks but does not build: every member it may carry, each well formed. */
const EDGES_STEP: JsonObject = {
    op: "join.edges",
    source: "src_01JCBP1C9E2G4J6M8N0Q3S5V7Y",
    part: 1,
    viaEnd: "source",
    repeated: "both",
    unmatchedRows: "add",
    columns: ["amount"],
    rows: { column: "event", values: ["payment"] },
    except: { column: "event", values: ["refund"] },
    read: {
        table: "edges",
        source: "account_id",
        sourceSpace: "account",
        target: "counterparty_id",
        targetSpace: "account",
        weight: null,
        weightMeaning: "",
        time: "time",
        timeUnit: "s",
    },
    mapping: {},
};

describe("a data file that cannot be built whole", () => {
    it("holds the section, and the open replaces the data with none", async () => {
        const broken: [string, (copy: Example) => void][] = [
            [
                "a table of columns of different lengths",
                (c) => ((c.accounts.copy as JsonObject).nodes = { a: [1], b: [] }),
            ],
            ["a column that is not a list", (c) => ((c.accounts.copy as JsonObject).nodes = { id: "x" })],
            ["a table that is not an object", (c) => ((c.accounts.copy as JsonObject).nodes = [])],
            [
                "unset rows that are not a list",
                (c) => {
                    const decls = (c.accounts.columns as JsonObject).nodes as Record<string, JsonObject>;
                    decls.country = { name: "country", dtype: "json", unset: 2 };
                },
            ],
            [
                "an unset row outside the table",
                (c) => {
                    const decls = (c.accounts.columns as JsonObject).nodes as Record<string, JsonObject>;
                    decls.country = { name: "country", dtype: "json", unset: [9] };
                },
            ],
            ["a second reader source", (c) => (c.file.sources as JsonObject[]).push(structuredClone(c.reader))],
            ["a reader source not named reader", (c) => (c.reader.id = "mine")],
            ["a reader copy id that is no ULID", (c) => ((c.reader.origin as JsonObject).copy = "sha256:00")],
            ["reader operations that are not a list", (c) => ((c.reader.copy as JsonObject).operations = {})],
            ["a reader operation that is not an object", (c) => ((c.reader.copy as JsonObject).operations = [7])],
            [
                "a reader add naming both a node and an edge",
                (c) =>
                    ((c.reader.copy as JsonObject).operations = [
                        {
                            op: "add",
                            node: { space: "account", key: "n" },
                            edge: { load: "reader", key: "e" },
                            dtypes: {},
                        },
                    ]),
            ],
            [
                "a reader add of an edge another load holds",
                (c) =>
                    ((c.reader.copy as JsonObject).operations = [
                        { op: "add", edge: { load: "src_x", key: "e" }, dtypes: {} },
                    ]),
            ],
            [
                "a reader add whose columns are not an object",
                (c) =>
                    ((c.reader.copy as JsonObject).operations = [
                        { op: "add", node: { space: "account", key: "n" }, columns: [], dtypes: {} },
                    ]),
            ],
            [
                "a reader add with no dtypes",
                (c) =>
                    ((c.reader.copy as JsonObject).operations = [{ op: "add", node: { space: "account", key: "n" } }]),
            ],
            [
                "a reader add whose column declares no dtype",
                (c) =>
                    ((c.reader.copy as JsonObject).operations = [
                        { op: "add", node: { space: "account", key: "n" }, columns: { a: 1 }, dtypes: {} },
                    ]),
            ],
            ["a source that is not an object", (c) => ((c.file.sources as unknown[])[1] = "accounts")],
            ["two sources with one id", (c) => (c.network.id = c.accounts.id)],
            ["a source with an empty kind", (c) => (c.accounts.kind = "")],
            ["a source with no origin copy id", (c) => delete (c.accounts.origin as JsonObject).copy],
            ["a derived source with no copy", (c) => ((c.accounts.kind = "derived"), delete c.accounts.copy)],
            ["a copy that is not an object", (c) => (c.accounts.copy = "rows")],
            ["a network source with a format", (c) => (c.network.format = "json")],
            [
                "a network credential with another member",
                (c) => ((c.network.origin as JsonObject).credentials = { key: 1 }),
            ],
            ["an unknown repeatedEdges", (c) => (c.file.repeatedEdges = "average")],
            ["no directed", (c) => delete c.file.directed],
            ["sources that are not a list", (c) => (c.file.sources = {})],
            ["joins that are not a list", (c) => (c.file.joins = {})],
            ["types that are not a list", (c) => (c.file.types = {})],
            ["a type of no kind", (c) => ((c.file.types as JsonObject[])[0].kind = "graph")],
            ["a type whose rules are not a list", (c) => ((c.file.types as JsonObject[])[0].rules = {})],
            [
                "a type rule naming part 0",
                (c) => (((c.file.types as JsonObject[])[0].rules as JsonObject[])[0].part = 0),
            ],
            ["conversions that are not a list", (c) => (c.file.conversions = {})],
            ["kept issues that are not a list", (c) => (c.file.issues = { kept: {} })],
            ["a step that is not an object", (c) => (c.file.joins as unknown[]).push("join.add")],
            ["a step naming no source", (c) => (c.joins[0].source = "src_nowhere")],
            ["a step that is off by false", (c) => (c.joins[0].off = false)],
            ["an off step with an empty op", (c) => c.joins.push({ op: "", source: c.accounts.id, off: true })],
            ["a step with an empty clash", (c) => (c.joins[0].clash = {})],
            ["a step with a clash rule for no column", (c) => (c.joins[0].clash = { "": "keep" })],
            ["a step with an unknown duplicateIds", (c) => (c.joins[0].duplicateIds = "last")],
            ["a step with a member join.add does not carry", (c) => (c.joins[0].rows = EDGES_STEP.rows)],
            ["a second join.add for one source", (c) => c.joins.push({ op: "join.add", source: c.accounts.id })],
            ["a join.add with columns", (c) => (c.joins[0].columns = ["label"])],
            // Every member of a step this reader does not build, well formed and then each broken.
            ["a well-formed join.edges", (c) => c.joins.push(structuredClone(EDGES_STEP))],
            [
                "two join.edges steps of one part",
                (c) => c.joins.push(structuredClone(EDGES_STEP), structuredClone(EDGES_STEP)),
            ],
            [
                "a well-formed join.merge",
                (c) =>
                    c.joins.push({
                        op: "join.merge",
                        source: c.network.id,
                        ignoreCase: true,
                        ignoreSpaces: false,
                        repeated: "first",
                        unmatchedRows: undefined,
                    }),
            ],
            ...(
                [
                    ["duplicateIds", "first"],
                    ["ignoreCase", "yes"],
                    ["edges", ""],
                    ["part", 1],
                    ["viaEnd", "source"],
                    ["repeated", "both"],
                    ["unmatchedRows", "add"],
                    ["columns", ["a", "a"]],
                    ["rows", { column: "", values: [] }],
                    ["except", { column: "event", values: [1] }],
                    ["read", { weight: 2 }],
                    ["read", { time: null }],
                    ["read", { table: "graph" }],
                    ["read", { key: "id" }],
                    ["read", { key: "id", space: "graph:all" }],
                    ["mapping", { many: true }],
                ] as const
            ).map(([member, value]): [string, (copy: Example) => void] => [
                `a join.merge with ${member} ${JSON.stringify(value)}`,
                (c) => c.joins.push({ op: "join.merge", source: c.network.id, [member]: value }),
            ]),
            ...(
                [
                    ["part", 0],
                    ["viaEnd", "middle"],
                    ["repeated", "all"],
                    ["unmatchedRows", "keep"],
                ] as const
            ).map(([member, value]): [string, (copy: Example) => void] => [
                `a join.edges with ${member} ${JSON.stringify(value)}`,
                (c) => c.joins.push({ ...structuredClone(EDGES_STEP), [member]: value }),
            ]),
            [
                "a join.edge-values naming no edges",
                (c) => c.joins.push({ op: "join.edge-values", source: c.network.id }),
            ],
        ];
        for (const [what, breakIt] of broken) {
            const copy = example();
            breakIt(copy);
            const { session, problems } = await open(copy.file);
            assert.deepStrictEqual(problems, HELD, what);
            assert.strictEqual(session.data.nodes().length, 0, `${what}: nothing is built`);
            session.dispose();
        }
    });

    it("builds the example as it is, the control for the breaks above", async () => {
        const { session, problems } = await open(example().file);
        assert.deepStrictEqual(problems, []);
        assert.strictEqual(session.data.nodes().length, 5);
        session.dispose();
    });
});

describe("a source whose ledger or parse options cannot be read", () => {
    it("builds the embedded network source, and reports the ledger member it cannot read", async () => {
        const unread: [string, (ledger: JsonObject) => void][] = [
            ["/validators/contentHash", (l) => ((l.validators as JsonObject).contentHash = "ABC")],
            ["/source", (l) => (l.source = "")],
            ["/sourceVersion", (l) => (l.sourceVersion = 0)],
            ["/endpoint", (l) => (l.endpoint = 5)],
            ["/params", (l) => (l.params = null)],
            ["/limits/maxNodes", (l) => (l.limits = { maxNodes: 0 })],
            ["/pages", (l) => (l.pages = 0)],
            ["/next", (l) => (l.next = "page 2")],
            ["/expand/depth", (l) => (l.expand = { depth: 11 })],
            ["/expand/direction", (l) => (l.expand = { direction: "up" })],
            ["/expand/limit", (l) => (l.expand = { limit: 0 })],
            ["/expand/relationshipTypes", (l) => (l.expand = { relationshipTypes: [1] })],
            ["/expand/layout", (l) => (l.expand = { layout: "restart" })],
            ["/expansions", (l) => (l.expansions = {})],
            ...(
                [
                    ["seeds", []],
                    ["depth", 0],
                    ["direction", "up"],
                    ["limit", 0],
                    ["at", "yesterday"],
                    ["next", 3],
                ] as const
            ).map(([member, value]): [string, (ledger: JsonObject) => void] => [
                `/expansions/0/${member}`,
                (l) =>
                    (l.expansions = [
                        {
                            seeds: [{ space: "account", key: "acct-1001" }],
                            depth: 1,
                            direction: "both",
                            limit: 10,
                            at: "2026-11-14T17:45:00.000Z",
                            next: null,
                            validators: {},
                            [member]: value,
                        },
                    ]),
            ]),
        ];
        for (const [pointer, breakIt] of unread) {
            const copy = example();
            breakIt(copy.ledger);
            const { session, problems } = await open(copy.file);
            assert.deepStrictEqual(
                problems,
                [
                    {
                        code: "W_UNKNOWN_MEMBER",
                        params: { section: "data", pointer: `/sources/2/origin/ledger${pointer}` },
                    },
                ],
                pointer,
            );
            assert.strictEqual(session.data.nodes().length, 5, `${pointer}: the section is built`);
            session.dispose();
        }
    });

    it("builds an embedded source whose options are not an object, and writes them back as read", async () => {
        const copy = example();
        copy.accounts.options = "comma";
        const { session, problems } = await open(copy.file);
        assert.deepStrictEqual(problems, [
            { code: "W_UNKNOWN_MEMBER", params: { section: "data", pointer: "/sources/1/options" } },
        ]);
        assert.strictEqual(session.data.nodes().length, 5);
        session.dispose();
    });

    it("builds a network source with no ledger, and one with no mapping, columns or settings", async () => {
        const copy = example();
        delete (copy.network.origin as JsonObject).ledger;
        const { session, problems } = await open(copy.file);
        assert.deepStrictEqual(problems, []);
        assert.strictEqual(session.data.nodes().length, 5);
        session.dispose();
    });
});

/** A ULID for a hand-written source's copy, from one letter. */
const ulid = (letter: string): string => letter.repeat(26);

/**
 * An embedded derived source of node and edge rows in the space `p`: nodes keyed by `id`, edges by
 * `source` and `target`, weighted by `w` when its rows carry it.
 * @param letter - Its id's letter.
 * @param tables - Its rows.
 * @param tables.nodes - Node columns.
 * @param tables.edges - Edge columns.
 * @param settings - Its settings.
 * @returns The record.
 */
function source(
    letter: string,
    tables: { nodes?: Record<string, unknown[]>; edges?: Record<string, unknown[]> },
    settings: JsonObject = {},
): JsonObject {
    const declared = (table?: Record<string, unknown[]>): JsonObject =>
        Object.fromEntries(Object.keys(table ?? {}).map((name) => [name, { name, dtype: "json" }]));
    return {
        id: `src_${ulid(letter)}`,
        kind: "derived",
        origin: { copy: ulid(letter) },
        mapping: {
            nodes: { key: "id", space: "p" },
            edges: {
                source: "source",
                sourceSpace: "p",
                target: "target",
                targetSpace: "p",
                ...(tables.edges?.w === undefined ? {} : { weight: "w" }),
                ...(tables.edges?.eid === undefined ? {} : { edgeId: "eid" }),
            },
        },
        settings,
        copy: tables,
        columns: { nodes: declared(tables.nodes), edges: declared(tables.edges) },
    };
}

/**
 * A data file of embedded sources, one `join.add` each in order.
 * @param sources - The sources.
 * @param extra - Other members, `joins` and `directed` among them.
 * @returns The file.
 */
function file(sources: JsonObject[], extra: JsonObject = {}): JsonObject {
    return {
        kind: "graphty-data",
        version: 2,
        generator: { name: "graphty-element", version: "0.0.0" },
        id: "data-1",
        build: ulid("0"),
        directed: true,
        sources,
        types: [],
        joins: sources.map((each) => ({ op: "join.add", source: each.id })),
        graph: { directed: true, multigraph: false, graph: {}, nodes: [], links: [] },
        ...extra,
    };
}

/**
 * A node's values by id: a key in the space `p` is the id `p:<key>`.
 * @param session - The session.
 * @param id - The node.
 * @returns Its values.
 */
const nodeOf = (session: GraphSession, id: string): JsonObject =>
    session.data.nodes().find((node) => node.id === id) as JsonObject;

describe("a hand-written data file, built", () => {
    it("shows what vote, min and max compute over every source's value, and keeps a value a rule cannot read", async () => {
        const sources = [
            source("A", {
                nodes: {
                    id: ["n"],
                    pick: ["x"],
                    lo: [5],
                    hi: [5],
                    day: ["2020-01-01"],
                    late: ["2020-01-01"],
                    odd: [1],
                },
            }),
            source("B", {
                nodes: {
                    id: ["n"],
                    pick: ["y"],
                    lo: [3],
                    hi: [3],
                    day: ["2021-06-01"],
                    late: ["2021-06-01"],
                    odd: ["one"],
                },
            }),
            source("C", {
                nodes: {
                    id: ["n"],
                    pick: ["y"],
                    lo: [9],
                    hi: [9],
                    day: ["2019-01-01"],
                    late: ["2019-01-01"],
                    odd: [2],
                },
            }),
        ];
        const clash = { pick: "vote", lo: "min", hi: "max", day: "min", late: "max", odd: "max" };
        const tie = await open(
            file(sources.slice(0, 2), {
                joins: sources.slice(0, 2).map((each) => ({ op: "join.add", source: each.id, clash })),
            }),
        );
        assert.strictEqual(nodeOf(tie.session, "p:n").pick, "x", "a tie keeps the held value");
        tie.session.dispose();

        const { session, problems } = await open(
            file(sources, { joins: sources.map((each) => ({ op: "join.add", source: each.id, clash })) }),
        );
        const node = nodeOf(session, "p:n");
        assert.strictEqual(node.pick, "y", "two sources of three hold y");
        assert.strictEqual(node.lo, 3);
        assert.strictEqual(node.hi, 9);
        assert.strictEqual(node.day, "2019-01-01");
        assert.strictEqual(node.late, "2021-06-01");
        assert.strictEqual(node.odd, 1, "a number rule meeting text keeps the held value");
        assert.deepInclude(problems, {
            code: "W_CLASH_RULE_TYPE",
            params: { step: 1, column: "odd", rule: "max", cells: 1 },
        });
        session.dispose();
    });

    it("leaves out an edge row with an empty end, and counts it by the end's column", async () => {
        const { session, problems } = await open(
            file([
                source("A", {
                    nodes: { id: ["a", "b"] },
                    edges: { source: [null, "a", "a"], target: ["b", "", "b"] },
                }),
            ]),
        );
        assert.strictEqual(session.data.edges().length, 1);
        const id = `src_${ulid("A")}`;
        assert.includeDeepMembers(problems, [
            { code: "W_KEY_EMPTY", params: { source: id, column: "source", rows: 1 } },
            { code: "W_KEY_EMPTY", params: { source: id, column: "target", rows: 1 } },
        ]);
        session.dispose();
    });

    it("fills a repeated edge's unset columns from its later rows under merge", async () => {
        const { session } = await open(
            file([
                source(
                    "A",
                    {
                        nodes: { id: ["a", "b"] },
                        edges: {
                            eid: ["e", "e"],
                            source: ["a", "a"],
                            target: ["b", "b"],
                            tag: [null, "late"],
                            w: [1, 2],
                        },
                    },
                    { duplicateIds: "merge" },
                ),
            ]),
        );
        const edges = session.data.edges();
        assert.lengthOf(edges, 1);
        assert.strictEqual(edges[0].tag, "late");
        assert.strictEqual(edges[0].w, 1, "the first row's value stands");
        session.dispose();
    });

    it("leaves out an edge of a leave-out source whose end no source supplies, and the node it named", async () => {
        const { session, problems } = await open(
            file([
                source(
                    "A",
                    { nodes: { id: ["a"] }, edges: { source: ["a", "a"], target: ["a", "ghost"] } },
                    { unmatched: "leave-out" },
                ),
            ]),
        );
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["p:a"],
        );
        assert.lengthOf(session.data.edges(), 1);
        assert.deepInclude(problems, { code: "W_EDGE_END_MISSING", params: { source: `src_${ulid("A")}`, count: 1 } });
        session.dispose();
    });

    it("sums repeats of one unordered pair on an undirected graph, an unweighted edge weighing 1", async () => {
        const weighted = source("A", {
            nodes: { id: ["a", "b"] },
            edges: { source: ["b", "a"], target: ["a", "b"], w: [2, "x"] },
        });
        const plain = source("B", { edges: { source: ["a"], target: ["b"] } });
        const { session } = await open(file([weighted, plain], { directed: false, repeatedEdges: "sum" }));
        const edges = session.data.edges();
        assert.lengthOf(edges, 1, "b-a, a-b and a-b are one pair");
        assert.strictEqual(edges[0].w, 4, "2, then 1 for the text weight, then 1 for none");
        session.dispose();
    });

    it("applies the reader's removes and edits to edges and nodes, and reports the ones naming nothing", async () => {
        const rows = source("A", {
            nodes: { id: ["a", "b", "c"] },
            edges: { eid: ["e1", "e2"], source: ["a", "b"], target: ["b", "c"], w: [1, 2] },
        });
        const load = String(rows.id);
        const operations = [
            { op: "edit", edge: { load, key: "e1" }, column: "w", value: 5, was: 1 },
            { op: "remove", edge: { load, key: "e2" } },
            { op: "remove", node: { space: "p", key: "a" } },
            { op: "remove", edge: { load, key: "gone" } },
            { op: "edit", edge: { load, key: "gone" }, column: "w", value: 1 },
            {
                op: "add",
                edge: { load: "reader", key: "r1" },
                from: { space: "p", key: "b" },
                to: { space: "p", key: "nobody" },
                dtypes: {},
            },
            { op: "add", node: { space: "p", key: "d" }, dtypes: {} },
        ];
        const reader = { id: "reader", kind: "reader", origin: { copy: ulid("R") }, copy: { operations } };
        const body = file([rows]);
        body.sources = [reader, rows];
        const { session, problems } = await open(body);
        assert.deepStrictEqual(
            session.data
                .nodes()
                .map((node) => node.id)
                .sort(),
            ["p:b", "p:c", "p:d"],
        );
        assert.lengthOf(session.data.edges(), 0, "e2 removed, e1 gone with a");
        assert.deepStrictEqual(
            problems
                .filter((problem) => problem.code === "W_REFERENCE_UNBOUND")
                .map((problem) => problem.params.pointer),
            [
                "/sources/reader/copy/operations/3",
                "/sources/reader/copy/operations/4",
                "/sources/reader/copy/operations/5",
            ],
        );
        session.dispose();
    });
});
