/**
 * @file The readers that take no scope of their own and read only what is shown while the working
 * graph is on (design/working-graph/design.md section 2, "The other view readers", and section 4):
 * `data.attributes`, `styles.agreement`, `styles.preview` and `catalog.optionsFor`. The contract test
 * (test/contracts/working-graph-readers.test.ts) classifies them as naming their target and probes
 * none of them, so each is probed here: with a filter hiding one node, it answers as on the graph
 * without that node, and with the option off it answers as before.
 *
 * Two answers keep the whole graph by agreement: a binding preview's scale is the automatic domain,
 * which reads the whole graph (decision 18), so only its bins count what is shown; and a column is
 * listed while any element carries it, so a filter never takes a column away.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";

/** The shown nodes: two hosts and two services, weighted 1 to 4. */
const SHOWN = [
    { id: "a", type: "host", weight: 1 },
    { id: "b", type: "host", weight: 2 },
    { id: "c", type: "service", weight: 3 },
    { id: "d", type: "service", weight: 4 },
];

/** The node the filter hides: a host whose weight is outside every shown one. */
const HIDDEN = { id: "x", type: "host", weight: 10 };

/** A probe of one reader. */
type Ask = (session: GraphSession) => unknown;

/**
 * A session over the shown nodes in a line, and the hidden node joined to both ends.
 * @param graph - Which graph: one node hidden by a filter, the graph without it, or nothing hidden.
 * @param working - Whether the working graph is on.
 * @returns The session.
 */
async function sessionOf(graph: "filtered" | "without" | "unfiltered", working = true): Promise<GraphSession> {
    const session = createGraphSession({ workingGraph: working });
    const withHidden = graph !== "without";
    await session.data.addNodes(withHidden ? [...SHOWN, HIDDEN] : SHOWN);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "d" },
        ...(withHidden
            ? [
                  { source: "a", target: "x" },
                  { source: "x", target: "d" },
              ]
            : []),
    ]);
    await session.styles.add({
        name: "By type",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.type", scale: "ordinal", palette: "okabe-ito" } },
    });
    if (graph === "filtered") {
        await session.visibility.set({ kind: "member", of: { nodes: SHOWN.map(({ id }) => id) } });
    }

    await session.styles.settled();
    return session;
}

/**
 * What a probe answers on the three graphs, as plain data.
 * @param ask - The probe.
 * @param working - Whether the working graph is on.
 * @returns The three answers.
 */
async function answers(
    ask: Ask,
    working = true,
): Promise<{ filtered: unknown; without: unknown; unfiltered: unknown }> {
    const sessions = await Promise.all(
        (["filtered", "without", "unfiltered"] as const).map((graph) => sessionOf(graph, working)),
    );
    try {
        const [filtered, without, unfiltered] = await Promise.all(
            sessions.map(async (each) => JSON.parse(JSON.stringify(await ask(each))) as unknown),
        );
        return { filtered, without, unfiltered };
    } finally {
        for (const each of sessions) {
            each.dispose();
        }
    }
}

/** The weight column's descriptor: its range and distinct values. */
const weightColumn: Ask = (s) => {
    const weight = s.data.attributes().find(({ kind, name }) => kind === "node" && name === "weight");
    return { min: weight?.min, max: weight?.max, uniqueCount: weight?.uniqueCount };
};

/** How many hosts one channel's agreement reads, and what the hosts' colors agree on. */
const hostAgreement: Ask = (s) => s.styles.agreement({ where: "type == 'host'" }, "node.color");

/** A size binding on the weight over 1 to 4: how many nodes fall in each bin, and above it. */
const weightPreview: Ask = (s) => {
    const { bins, above } = s.styles.preview(
        { by: "data.weight", scale: "linear", domain: [1, 4] },
        { channel: "node.size", bins: 2 },
    );
    return { counts: bins.map(({ count }) => count), above };
};

/** The node choices a walk from one node offers. */
const startChoices: Ask = async (s) =>
    (await s.catalog.optionsFor("bfs"))
        .filter((option) => option.type === "node-id")
        .map((option) => option.values?.map(({ value }) => value));

/**
 * The readers, and what each answers with the option off: the whole graph, or what a run would
 * run over (`optionsFor` offers the choices of the run's default scope, which is what is shown).
 */
const READERS: readonly (readonly [string, Ask, "unfiltered" | "without"])[] = [
    ["data.attributes()", weightColumn, "unfiltered"],
    ["styles.agreement()", hostAgreement, "unfiltered"],
    ["styles.preview()", weightPreview, "unfiltered"],
    ["catalog.optionsFor()", startChoices, "without"],
];

describe("a reader with no scope of its own reads what is shown", () => {
    for (const [reader, ask, off] of READERS) {
        it(`${reader} answers as on the graph without the hidden node`, async () => {
            const { filtered, without, unfiltered } = await answers(ask);
            assert.notDeepEqual(unfiltered, without, `${reader}'s probe tells the two graphs apart`);
            assert.deepStrictEqual(filtered, without, `${reader} reads the view`);
        });

        it(`${reader} answers as before with the option off`, async () => {
            const asked = await answers(ask, false);
            assert.deepStrictEqual(asked.filtered, asked[off], `${reader} with the option off`);
        });
    }
});
