/**
 * Every way two sources' fields can be joined, on the REAL graphty-element with the source-steps experiment
 * on (issue #10054), each picked by clicks on one card and drawn: fields onto the nodes a row names or the
 * other way, one kind's nodes folded into another's, a node or an edge per row to one or two ends, one
 * field or either of two, a third source through the one between, nodes sharing a value of their own or
 * of rows that name them, one source's own columns, and a column's values made nodes.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import {
    addMatch,
    advanced,
    checkedWay,
    choose,
    done,
    draftOf,
    emptyProject,
    fromHeadMenu,
    joinAs,
    joinLines,
    joinsOf,
    newest,
    openJoins,
    pickableWays,
    pickFields,
    pickSources,
    removeOpen,
    selectJoin,
    waysToJoin,
} from "./sourceSteps";

withFeatures(["source-steps"]);

/** Each file, and the column its rows are keyed by. */
const FILES = {
    people: ["person_id", "person_id,badge,name,tags", "P1,B1,Ann,x", "P2,B2,Bo,x", "P3,B3,Cy,y"],
    buildings: ["building", "building,city", "D1,Rome", "D2,Oslo"],
    entries: ["entry", "entry,person,badge,building", "E1,P1,B1,D1", "E2,P2,B2,D2", "E3,P1,B1,D1", "E4,P9,,D1"],
    accounts: ["account", "account,name", "A1,a", "A2,b", "A3,c"],
    identifiers: ["row", "row,account_id,phone,device", "1,A1,p1,d1", "2,A1,p2,d2", "3,A2,p3,d3", "4,A3,p4,d1"],
    watch: ["value", "value,risk", "p1,high", "d3,mid", "404,none"],
    transfers: ["tx", "tx,from,to", "T1,A1,A2", "T2,A2,A3"],
    network: ["id", "id,score", "N1,1", "N2,2"],
    map: ["protein", "symbol,protein", "TP53,N1", "EGFR,N2"],
    expression: ["symbol", "symbol,tpm", "TP53,5", "EGFR,7"],
    supplierlist: ["id", "id,duns,city", "S1,x,Rome", "S2,y,Oslo"],
    supplierother: ["id", "id,duns,city", "R7,x,Bonn", "R8,z,Nice"],
    staff: ["sid", "sid,boss,desk", "S1,,d1", "S2,S1,d2", "S3,S1,d2"],
} as const;

type File = keyof typeof FILES;

/**
 * Files in the graph, files waiting, and the workspace open.
 * @param loaded - the files in the graph, in order.
 * @param waiting - the files waiting, in order.
 * @returns the session, and the workspace.
 */
async function opened(
    loaded: readonly File[],
    waiting: readonly File[],
): Promise<{ session: GraphSession; modal: HTMLElement }> {
    await page.viewport(1366, 1024);
    const { store, session } = await emptyProject();
    store.set({ dockOpen: false, dockMaximized: false });
    for (const file of [...loaded, ...waiting]) {
        const [key, ...rows] = FILES[file];
        const id = await session.data.stage(
            { type: "csv", config: { data: rows.join("\n") }, name: `${file}.csv` },
            { key },
        );
        if (loaded.includes(file)) {
            await session.data.add(id, { overlap: "separate" });
        }
    }
    const modal = await openJoins();
    return { session, modal };
}

/**
 * The nodes and edges of the draft as drawn.
 * @param session - the session.
 * @returns how many of each.
 */
function after(session: GraphSession): readonly [number, number] {
    const { nodes, edges } = draftOf(session).preview().after;
    return [nodes, edges];
}

/** An end of a match: a source and its field, the field null for new nodes. */
type End = readonly [string, string | null];

/** One way to join. */
interface Case {
    readonly name: string;
    readonly loaded?: readonly File[];
    readonly waiting?: readonly File[];
    readonly matches: readonly (readonly [readonly [string, string], End])[];
    /** Every way the card lists. */
    readonly ways: readonly string[];
    /** The way picked. */
    readonly pick: string;
    /** The card's line in the list, its sources in the order picked: one card, whatever steps it writes. */
    readonly lines: readonly string[];
    /** The steps it writes, when more than one. */
    readonly steps?: number;
    /** The nodes and edges with it drawn. */
    readonly makes: readonly [number, number];
}

const CASES: readonly Case[] = [
    {
        name: "fields of the rows on the nodes they name",
        loaded: ["people"],
        waiting: ["entries"],
        matches: [
            [
                ["people", "person_id"],
                ["entries", "person"],
            ],
        ],
        ways: ["Fields of entries on people", "Node per entries row, linked to people"],
        pick: "Fields of entries on people",
        lines: ["people + entries"],
        makes: [3, 0],
    },
    {
        name: "fields either way while both wait",
        waiting: ["people", "entries"],
        matches: [
            [
                ["people", "person_id"],
                ["entries", "person"],
            ],
        ],
        ways: ["Fields of people on entries", "Fields of entries on people", "Node per entries row, linked to people"],
        pick: "Fields of people on entries",
        lines: ["people + entries"],
        makes: [4, 0],
    },
    {
        name: "the graph's entries folded into waiting people",
        loaded: ["entries"],
        waiting: ["people"],
        matches: [
            [
                ["entries", "person"],
                ["people", "person_id"],
            ],
        ],
        ways: ["Merge entries nodes into people", "Fields of people on entries", "Edge from people to entries"],
        pick: "Merge entries nodes into people",
        lines: ["entries + people"],
        makes: [4, 0],
    },
    {
        name: "an edge between nodes the graph holds",
        loaded: ["people", "entries"],
        matches: [
            [
                ["people", "person_id"],
                ["entries", "person"],
            ],
        ],
        ways: ["Merge entries nodes into people", "Edge from people to entries"],
        pick: "Edge from people to entries",
        lines: ["people + entries"],
        makes: [7, 3],
    },
    {
        name: "a node per row, linked to what it names",
        loaded: ["people"],
        waiting: ["entries"],
        matches: [
            [
                ["entries", "person"],
                ["people", "person_id"],
            ],
        ],
        ways: ["Fields of entries on people", "Node per entries row, linked to people"],
        pick: "Node per entries row, linked to people",
        lines: ["entries + people"],
        makes: [7, 3],
    },
    {
        name: "the watchlist's fields on the accounts, and the suppliers' on the list the graph holds",
        loaded: ["supplierlist"],
        waiting: ["supplierother"],
        matches: [
            [
                ["supplierother", "duns"],
                ["supplierlist", "duns"],
            ],
        ],
        ways: ["Fields of supplierother on supplierlist", "Node per supplierother row, linked to supplierlist"],
        pick: "Fields of supplierother on supplierlist",
        lines: ["supplierother + supplierlist"],
        makes: [2, 0],
    },
    {
        name: "an edge per row between two sources",
        loaded: ["people", "buildings"],
        waiting: ["entries"],
        matches: [
            [
                ["people", "person_id"],
                ["entries", "person"],
            ],
            [
                ["entries", "building"],
                ["buildings", "building"],
            ],
        ],
        ways: ["Edge per entries row, people to buildings", "Node per entries row, linked to people and buildings"],
        pick: "Edge per entries row, people to buildings",
        lines: ["people + entries + buildings"],
        makes: [5, 3],
    },
    {
        name: "a node per row, linked to two sources",
        loaded: ["people", "buildings"],
        waiting: ["entries"],
        matches: [
            [
                ["people", "person_id"],
                ["entries", "person"],
            ],
            [
                ["entries", "building"],
                ["buildings", "building"],
            ],
        ],
        ways: ["Edge per entries row, people to buildings", "Node per entries row, linked to people and buildings"],
        pick: "Node per entries row, linked to people and buildings",
        lines: ["people + entries + buildings"],
        makes: [9, 7],
    },
    {
        name: "an edge per row between two nodes of one source, its columns saying which way",
        loaded: ["accounts"],
        waiting: ["transfers"],
        matches: [
            [
                ["transfers", "to"],
                ["accounts", "account"],
            ],
            [
                ["transfers", "from"],
                ["accounts", "account"],
            ],
        ],
        ways: [
            "Edge per transfers row, accounts to accounts, from -> to",
            "Node per transfers row, linked to accounts by from and to",
        ],
        pick: "Edge per transfers row, accounts to accounts, from -> to",
        lines: ["transfers + accounts"],
        makes: [3, 2],
    },
    {
        name: "a node per row, linked to two nodes of one source",
        loaded: ["accounts"],
        waiting: ["transfers"],
        matches: [
            [
                ["transfers", "from"],
                ["accounts", "account"],
            ],
            [
                ["transfers", "to"],
                ["accounts", "account"],
            ],
        ],
        ways: [
            "Edge per transfers row, accounts to accounts, from -> to",
            "Node per transfers row, linked to accounts by from and to",
        ],
        pick: "Node per transfers row, linked to accounts by from and to",
        lines: ["transfers + accounts"],
        makes: [5, 4],
    },
    {
        name: "fields matching either of two fields",
        loaded: ["identifiers"],
        waiting: ["watch"],
        matches: [
            [
                ["identifiers", "phone"],
                ["watch", "value"],
            ],
            [
                ["identifiers", "device"],
                ["watch", "value"],
            ],
        ],
        ways: [
            "Edge per identifiers row, watch to watch, phone -> device",
            "Node per identifiers row, linked to watch by phone and device",
            "Fields of watch on identifiers, matching phone or device",
        ],
        pick: "Fields of watch on identifiers, matching phone or device",
        lines: ["identifiers + watch"],
        steps: 2,
        makes: [4, 0],
    },
    {
        name: "fields of two sources on a third, through the one between",
        loaded: ["network"],
        waiting: ["map", "expression"],
        matches: [
            [
                ["network", "id"],
                ["map", "protein"],
            ],
            [
                ["map", "symbol"],
                ["expression", "symbol"],
            ],
        ],
        ways: [
            "Edge per map row, expression to network",
            "Node per map row, linked to expression and network",
            "Fields of map and expression on network",
        ],
        pick: "Fields of map and expression on network",
        lines: ["network + map + expression"],
        steps: 2,
        makes: [2, 0],
    },
    {
        name: "edges between nodes sharing a value of one field or another",
        loaded: ["people"],
        matches: [
            [
                ["people", "tags"],
                ["people", "tags"],
            ],
            [
                ["people", "name"],
                ["people", "name"],
            ],
        ],
        ways: ["Edge between people sharing tags or name", "Node per tags or name, linked to people"],
        pick: "Edge between people sharing tags or name",
        lines: ["people, tags"],
        makes: [3, 1],
    },
    {
        name: "a node per shared value",
        loaded: ["people"],
        matches: [
            [
                ["people", "tags"],
                ["people", "tags"],
            ],
        ],
        ways: ["Edge between people sharing tags", "Node per tags, linked to people"],
        pick: "Node per tags, linked to people",
        lines: ["people, tags"],
        makes: [4, 2],
    },
    {
        name: "edges between the nodes rows of another source give a shared value",
        loaded: ["accounts"],
        waiting: ["identifiers"],
        matches: [
            [
                ["accounts", "account"],
                ["identifiers", "account_id"],
            ],
            [
                ["identifiers", "phone"],
                ["identifiers", "phone"],
            ],
            [
                ["identifiers", "device"],
                ["identifiers", "device"],
            ],
        ],
        ways: ["Edge between accounts sharing phone or device", "Node per phone or device, linked to accounts"],
        pick: "Edge between accounts sharing phone or device",
        lines: ["accounts + identifiers"],
        makes: [3, 1],
    },
    {
        name: "a node per value rows of another source give",
        loaded: ["accounts"],
        waiting: ["identifiers"],
        matches: [
            [
                ["accounts", "account"],
                ["identifiers", "account_id"],
            ],
            [
                ["identifiers", "device"],
                ["identifiers", "device"],
            ],
        ],
        ways: ["Edge between accounts sharing device", "Node per device, linked to accounts"],
        pick: "Node per device, linked to accounts",
        lines: ["accounts + identifiers"],
        makes: [4, 2],
    },
    {
        name: "an edge from each row to the row of its own source it names",
        waiting: ["staff"],
        matches: [
            [
                ["staff", "sid"],
                ["staff", "boss"],
            ],
        ],
        ways: ["Edge from staff to staff, sid -> boss"],
        pick: "Edge from staff to staff, sid -> boss",
        lines: ["staff, boss"],
        makes: [3, 2],
    },
    {
        name: "a node per value of a column",
        loaded: ["people"],
        matches: [
            [
                ["people", "tags"],
                ["As new nodes", null],
            ],
        ],
        ways: ["Node per tags, linked to people"],
        pick: "Node per tags, linked to people",
        lines: ["people + tags"],
        makes: [5, 3],
    },
    {
        name: "an edge per row to new nodes",
        loaded: ["people"],
        waiting: ["entries"],
        matches: [
            [
                ["people", "person_id"],
                ["entries", "person"],
            ],
            [
                ["entries", "building"],
                ["As new nodes", null],
            ],
        ],
        ways: [
            "Edge per entries row, people to new building nodes",
            "Node per entries row, linked to people and new building nodes",
        ],
        pick: "Edge per entries row, people to new building nodes",
        lines: ["people + entries + building"],
        makes: [5, 3],
    },
    {
        name: "a node per row, linked to what it names and to new nodes",
        loaded: ["people"],
        waiting: ["entries"],
        matches: [
            [
                ["people", "person_id"],
                ["entries", "person"],
            ],
            [
                ["entries", "building"],
                ["As new nodes", null],
            ],
        ],
        ways: [
            "Edge per entries row, people to new building nodes",
            "Node per entries row, linked to people and new building nodes",
        ],
        pick: "Node per entries row, linked to people and new building nodes",
        lines: ["people + entries + building"],
        makes: [9, 7],
    },
];

/**
 * The number the key above the graph gives one of its items.
 * @param modal - the workspace.
 * @param label - the item's label, such as "nodes new".
 * @returns the number.
 */
function keyCount(modal: HTMLElement, label: string): number {
    const item = [...modal.querySelectorAll("[aria-label]")].find((each) =>
        new RegExp(`^${label} \\d+$`).test(each.getAttribute("aria-label") ?? ""),
    );
    return Number(item?.getAttribute("aria-label")?.split(" ").at(-1) ?? 0);
}

/**
 * Checks that the open card counts the new nodes and new edges the key counts: one card is the whole join.
 * @param modal - the workspace, with one card written.
 */
async function countsAgree(modal: HTMLElement): Promise<void> {
    await waitFor(() => {
        const counts = modal.querySelector(".jw-counts")?.textContent ?? "";
        for (const [label, one, many] of [
            ["nodes new", "new node", "new nodes"],
            ["edges new", "new edge", "new edges"],
        ] as const) {
            const n = keyCount(modal, label);
            const said = counts.match(new RegExp(`(\\d+) (${many}|${one})(?![a-z])`))?.[1];
            assert.strictEqual(Number(said ?? 0), n, `the card's ${many} and the key's ${label}: ${counts}`);
        }
    });
}

describe("a join card's ways to join (source-steps)", () => {
    it.each(CASES)("$name", async ({ loaded = [], waiting = [], matches, ways, pick, lines, steps = 1, makes }) => {
        const { session, modal } = await opened(loaded, waiting);
        const [[one, two], ...more] = matches;
        await pickSources(modal, one[0], two[0]);
        await pickFields(modal, one[1], two[1]);
        for (const [at, [a, b]] of more.entries()) {
            await addMatch(modal, at + 2, a, b);
        }
        assert.deepStrictEqual(waysToJoin(modal), ways);
        // A complete match joins at once by a default type, which the reader's pick then replaces.
        const first = checkedWay(modal);
        assert.strictEqual(joinsOf(session).length > 0, first !== null, "a default type is applied as it is picked");
        await joinAs(modal, pick);
        await waitFor(() => {
            assert.lengthOf(joinsOf(session), steps);
        });
        assert.deepStrictEqual(after(session), makes);
        await countsAgree(modal);
        assert.deepStrictEqual(joinLines(modal), lines);
        // Undo takes the card's last write back as one step, and Redo makes the picked join again.
        const made = JSON.stringify(draftOf(session).steps());
        await fromHeadMenu(modal, "Undo");
        await waitFor(() => {
            assert.notStrictEqual(JSON.stringify(draftOf(session).steps()), made, "the last write is taken back");
        });
        await fromHeadMenu(modal, "Redo");
        await waitFor(() => {
            assert.strictEqual(checkedWay(modal), pick);
            assert.lengthOf(joinsOf(session), steps);
        });
        await done(modal);
        const counts = session.data.statistics({ scope: "all" });
        assert.deepStrictEqual([counts.nodeCount, counts.edgeCount], makes, "committed as drawn");

        // Reopened, its card reads back on the same way to join.
        const again = await openJoins();
        assert.deepStrictEqual(joinLines(again), [...lines, "New join"]);
        if (lines.length === 1) {
            await selectJoin(again, lines[0]);
            await within(again).findByRole("radio", { checked: true, name: pick });
            assert.lengthOf(waysToJoin(again), ways.length);
            const boxes = [...again.querySelectorAll<HTMLInputElement>(".jw-line input")];
            const shown = boxes.filter((box) => box.type !== "hidden").map((box) => box.value);
            assert.notInclude(shown, "", "every source and field is read back");
            const source = (at: number, end: 1 | 2): string =>
                within(again).getByRole<HTMLInputElement>("combobox", {
                    name: at === 0 ? `Source ${String(end)}` : `Match ${String(at + 1)} source ${String(end)}`,
                }).value;
            assert.deepStrictEqual(
                matches.flatMap((_, at) => [source(at, 1), source(at, 2)]),
                matches.flatMap(([one, two]) => [one[0], two[0]]),
                "its sources in the order picked",
            );
            if (makes[1] > 0) {
                // An option set on it leaves what it makes, and which way its edges run, as they were.
                const edges = (): string[] =>
                    session.data
                        .edges()
                        .map((edge) => `${String(edge.source)}->${String(edge.target)}`)
                        .sort();
                const was = edges();
                await advanced(again);
                await userEvent.fill(within(again).getByRole("combobox", { name: "Edge type" }), "linked");
                await userEvent.keyboard("{Enter}");
                await waitFor(() => {
                    const [row] = joinsOf(session);
                    const set = row.act ?? row.link ?? row.extract;
                    assert.strictEqual(set?.edgeType, "linked");
                });
                await done(again);
                assert.deepStrictEqual(edges(), was);
            }
        }
    });

    it("the card counts the nodes it matched, which the header's nodes merged need not be", async () => {
        const { session, modal } = await opened([], ["people", "entries"]);
        await pickSources(modal, "people", "entries");
        await pickFields(modal, "person_id", "person");
        await joinAs(modal, "Fields of people on entries");
        await newest(session, (step) => step.act?.act === "merge", "people's fields on the entries");
        const counts = await waitFor(() => {
            const found = modal.querySelector(".jw-counts");
            assert.isNotNull(found);
            return found?.textContent ?? "";
        });
        assert.include(counts, "nodes matched", "both wait: the entries are new nodes, which the rows matched");
        assert.notInclude(counts, "merged");
        assert.isNotNull(within(modal).getByLabelText("nodes merged 0"), "none of the graph's nodes is merged");
    });

    it("a set of matches no one join reads lists what each makes by itself, and picking one leaves the others out", async () => {
        const { session, modal } = await opened(["staff", "people"], ["entries"]);
        await pickSources(modal, "people", "entries");
        await pickFields(modal, "person_id", "person");
        await addMatch(modal, 2, ["entries", "badge"], ["people", "badge"]);
        await addMatch(modal, 3, ["entries", "building"], ["staff", "desk"]);
        const either = "Fields of entries on people, matching person_id";
        assert.include(waysToJoin(modal), either);
        await joinAs(modal, either);
        await newest(session, (step) => step.act?.act === "merge", "by the one match");
        assert.isNull(within(modal).queryByRole("combobox", { name: "Match 2 field 1" }));
    });

    it("the key names the wider ring a three-source card draws on what its last source reaches (#10211)", async () => {
        // The identifiers reach every account, the watchlist through them only A1 (phone p1).
        const { session, modal } = await opened(["accounts"], ["identifiers", "watch"]);
        await pickSources(modal, "accounts", "identifiers");
        await pickFields(modal, "account", "account_id");
        await addMatch(modal, 2, ["identifiers", "phone"], ["watch", "value"]);
        await joinAs(modal, "Fields of identifiers and watch on accounts");
        await waitFor(() => {
            assert.lengthOf(joinsOf(session), 2);
        });
        assert.deepStrictEqual(joinLines(modal), ["accounts + identifiers + watch"], "one card");
        const ring = (id: string): number => session.styles.explain({ node: id }).merged["node.haloScale"] ?? 0;
        for (const look of ["Card colors", "Styled"]) {
            await userEvent.click(within(modal).getByText(look));
            await waitFor(() => {
                assert.strictEqual(keyCount(modal, "nodes merged"), 3, look);
                const wider = ["A1", "A2", "A3"].filter((id) => ring(id) > ring("A2"));
                assert.deepStrictEqual(wider, ["A1"], `A1 alone rings wider (${look})`);
                assert.strictEqual(keyCount(modal, "nodes every step merges"), wider.length, `its key row (${look})`);
            });
        }
    });

    it("a match of no row offers nothing new, while a written card always shows its own way", async () => {
        const { session, modal } = await opened(["accounts"], ["identifiers", "watch"]);
        await pickSources(modal, "accounts", "identifiers");
        await pickFields(modal, "account", "account_id");
        await joinAs(modal, "Fields of identifiers on accounts");
        await userEvent.click(
            within(within(modal).getByRole("radiogroup", { name: "Rows per node" })).getByText("List all"),
        );
        await newest(session, (step) => step.act?.aggregate?.["*"] === "list", "every phone");
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        await pickSources(modal, "accounts", "watch");
        await pickFields(modal, "account", "value");
        assert.isNotEmpty(waysToJoin(modal), "no account is a watched value: its ways still show");
        assert.deepStrictEqual(pickableWays(modal), [], "and none can be picked");
        await pickFields(modal, "phone", "value");
        await joinAs(modal, "Fields of watch on accounts");
        await newest(session, (step) => step.act?.into.field === "phone", "on the phones the first card brought");
        assert.strictEqual(after(session)[0], 3);
        await selectJoin(modal, "accounts + identifiers");
        await removeOpen(modal);
        await selectJoin(modal, "accounts + watch");
        await within(modal).findByRole("radio", { checked: true, name: "Fields of watch on accounts" });
        await within(modal).findByRole("radiogroup", { name: /^Unmatched /u });
        await screen.findByRole("dialog", { name: "Join" });
        await choose(modal, "Source 1", "identifiers");
        assert.lengthOf(joinsOf(session), 0, "its source changed, the card asks again");
    });
});
