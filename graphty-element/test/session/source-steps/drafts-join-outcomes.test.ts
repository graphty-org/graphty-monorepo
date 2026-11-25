/**
 * @file What a set of matches can make: the outcomes a draft offers for each shape of matches, the
 * acts that make them, and the one a step makes now.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import type { SourceDraft, SourceJoinAct, SourceJoinMatch, SourceJoinOutcome } from "../../../src/session/types";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

const FILES = {
    people: csv("people.csv", "person_id,badge,name,tags", "P1,B1,Ann,x", "P2,B2,Bo,x", "P3,B3,Cy,y"),
    buildings: csv("buildings.csv", "building,city", "D1,Rome", "D2,Oslo"),
    entries: csv("entries.csv", "entry,person,badge,building,hour", "E1,P1,B1,D1,9", "E2,P2,B2,D2,9", "E3,P1,B1,D1,11"),
    accounts: csv("accounts.csv", "account,name", "A1,a", "A2,b", "A3,c"),
    ids: csv("ids.csv", "account_id,phone,device", "A1,p1,d1", "A1,p2,d2", "A2,p3,d3", "A3,p4,d1"),
    watch: csv("watch.csv", "value,risk", "p1,high", "d1,mid", "404,none"),
    transfers: csv("transfers.csv", "tx,to,from", "T1,A2,A1", "T2,A3,A2"),
    network: csv("network.csv", "id,score", "N1,1", "N2,2"),
    map: csv("map.csv", "protein,symbol", "N1,TP53", "N2,EGFR"),
    expression: csv("expression.csv", "symbol,tpm", "TP53,5", "EGFR,7"),
    suppliersA: csv("suppliers_a.csv", "id,duns,city", "1,x,Rome", "2,y,Oslo"),
    suppliersB: csv("suppliers_b.csv", "id,duns,city", "7,x,Bonn", "8,z,Nice"),
    contacts: csv("contacts.csv", "contact,phone,device", "C1,p1,d1", "C2,p9,d3"),
} as const;

const KEYS: Partial<Record<keyof typeof FILES, string>> = {
    people: "person_id",
    buildings: "building",
    entries: "entry",
    accounts: "account",
    watch: "value",
    transfers: "tx",
    network: "id",
    expression: "symbol",
    suppliersA: "id",
    suppliersB: "id",
    contacts: "contact",
};

type File = keyof typeof FILES;

/** The files a case opens, and where they are. */
interface Opened {
    readonly session: GraphSession;
    readonly draft: SourceDraft;
    readonly key: Readonly<Record<File, string>>;
}

/**
 * Files in the graph, files waiting, and a draft.
 * @param loaded - The files in the graph, in order.
 * @param waiting - The files waiting, in order.
 * @returns The session, the draft and each file's key.
 */
async function opened(loaded: readonly File[], waiting: readonly File[]): Promise<Opened> {
    const session = createGraphSession({ features: ["source-steps"] });
    const key: Partial<Record<File, string>> = {};
    for (const file of [...loaded, ...waiting]) {
        const at = KEYS[file];
        key[file] = await session.data.stage(FILES[file], at === undefined ? {} : { key: at });
        if (loaded.includes(file)) {
            await session.data.add(key[file]);
        }
    }
    return { session, draft: session.data.draft(), key: key as Record<File, string> };
}

/**
 * A match written `file.field = file.field`, or `file.field = new`.
 * @param key - Each file's key.
 * @param text - The match.
 * @returns The match.
 */
function match(key: Opened["key"], text: string): SourceJoinMatch {
    const ref = (part: string): { source: string; field: string } => {
        const [file, field] = part.split(".");
        return { source: key[file as File], field };
    };
    const [a, b] = text.split(" = ");
    return { a: ref(a), b: b === "new" ? { new: true } : ref(b) };
}

/**
 * An outcome in one line: its code, whose rows land on what, and its fields.
 * @param key - Each file's key.
 * @param o - The outcome.
 * @returns The line.
 */
function line(key: Opened["key"], o: SourceJoinOutcome): string {
    const name = (id: string | undefined): string =>
        Object.entries(key).find(([, each]) => each === id)?.[0] ?? String(id);
    const names = (all: SourceJoinOutcome["rows"]): string => all.map((s) => name(s.source ?? s.space)).join("+");
    const fields = o.fields.length === 0 ? "" : ` (${o.fields.join(",")})`;
    const uses = o.uses.length === 1 && o.uses[0] > 0 ? ` #${String(o.uses[0])}` : "";
    return `${o.code} ${names(o.rows)} -> ${names(o.onto)}${fields}${uses}`;
}

/**
 * Make an outcome's acts on a draft.
 * @param draft - The draft.
 * @param acts - The acts.
 */
function make(draft: SourceDraft, acts: readonly SourceJoinAct[]): void {
    draft.batch(() => {
        for (const act of acts) {
            if (act.act === "merge") {
                draft.merge(act.options);
            } else if (act.act === "connect") {
                draft.connect(act.options);
            } else if (act.act === "link") {
                draft.link(act.options);
            } else {
                draft.extract(act.source, act.options);
            }
        }
    });
}

/**
 * The outcomes of some matches, in one line each.
 * @param o - The files.
 * @param texts - The matches.
 * @returns The lines.
 */
function listed(o: Opened, texts: readonly string[]): string[] {
    return o.draft
        .joinOutcomes({ matches: texts.map((text) => match(o.key, text)) })
        .outcomes.map((each) => line(o.key, each));
}

/** One shape of matches: the files, the matches, and what they make. */
interface Case {
    readonly name: string;
    readonly loaded?: readonly File[];
    readonly waiting?: readonly File[];
    readonly matches: readonly string[];
    readonly makes: readonly string[];
}

const CASES: readonly Case[] = [
    {
        name: "rows with repeats onto the people they name",
        loaded: ["people"],
        waiting: ["entries"],
        matches: ["people.person_id = entries.person"],
        makes: ["fields entries -> people", "link entries -> people"],
    },
    {
        name: "the same, both waiting: either side gives its fields",
        waiting: ["people", "entries"],
        matches: ["entries.person = people.person_id"],
        makes: ["fields entries -> people", "fields people -> entries", "link entries -> people"],
    },
    {
        name: "the same, entries in the graph and people waiting: entries' nodes fold into people",
        loaded: ["entries"],
        waiting: ["people"],
        matches: ["people.person_id = entries.person"],
        makes: ["fields people -> entries", "fold entries -> people", "link entries -> people"],
    },
    {
        name: "both in the graph: the one whose values repeat folds into the other, never the other way",
        loaded: ["people", "entries"],
        matches: ["people.person_id = entries.person"],
        makes: ["fold entries -> people", "link entries -> people"],
    },
    {
        name: "a graph's nodes never all fold into waiting rows for a few matches",
        loaded: ["suppliersA"],
        waiting: ["suppliersB"],
        matches: ["suppliersA.duns = suppliersB.duns"],
        makes: ["fields suppliersB -> suppliersA", "link suppliersB -> suppliersA"],
    },
    {
        name: "an edge per row between two sources, or its node linked to both",
        loaded: ["people", "buildings"],
        waiting: ["entries"],
        matches: ["buildings.building = entries.building", "entries.person = people.person_id"],
        makes: ["edge entries -> people+buildings", "middle entries -> people+buildings"],
    },
    {
        name: "an edge per row between two nodes of one source, by the columns' order",
        loaded: ["accounts"],
        waiting: ["transfers"],
        matches: ["transfers.from = accounts.account", "transfers.to = accounts.account"],
        makes: ["edge transfers -> accounts+accounts (to,from)", "middle transfers -> accounts+accounts (to,from)"],
    },
    {
        name: "one field matched with either of two",
        loaded: ["contacts"],
        waiting: ["watch"],
        matches: ["watch.value = contacts.phone", "watch.value = contacts.device"],
        makes: [
            "edge contacts -> watch+watch (phone,device)",
            "middle contacts -> watch+watch (phone,device)",
            "fields watch -> contacts (phone,device)",
        ],
    },
    {
        name: "two matches of different fields of one pair: either",
        loaded: ["contacts"],
        waiting: ["ids"],
        matches: ["ids.phone = contacts.phone", "ids.device = contacts.device"],
        makes: ["fields ids -> contacts (phone,device)"],
    },
    {
        name: "a third source through the one between",
        loaded: ["network"],
        waiting: ["map", "expression"],
        matches: ["network.id = map.protein", "expression.symbol = map.symbol"],
        makes: [
            "edge map -> network+expression",
            "middle map -> network+expression",
            "fields map+expression -> network",
        ],
    },
    {
        name: "nodes sharing a value of a field, or of any of several",
        waiting: ["contacts", "people"],
        matches: ["people.tags = people.tags", "people.name = people.name"],
        makes: ["shared people -> people (tags,name)", "shared-nodes people -> people (tags,name)"],
    },
    {
        name: "no value on two rows shares nothing",
        loaded: ["people"],
        matches: ["people.badge = people.badge"],
        makes: [],
    },
    {
        name: "nodes sharing a value their rows hold",
        loaded: ["accounts"],
        waiting: ["ids"],
        matches: ["ids.account_id = accounts.account", "ids.device = ids.device", "ids.phone = ids.phone"],
        makes: ["shared ids -> accounts (device,phone)", "shared-nodes ids -> accounts (device,phone)"],
    },
    {
        name: "two fields of one source",
        loaded: ["transfers"],
        matches: ["transfers.from = transfers.to"],
        makes: ["link transfers -> transfers (to,from)"],
    },
    {
        name: "the same, waiting",
        waiting: ["transfers"],
        matches: ["transfers.from = transfers.to"],
        makes: ["link transfers -> transfers (to,from)"],
    },
    {
        name: "a node per value",
        waiting: ["people"],
        matches: ["people.tags = new"],
        makes: ["new-nodes people -> people (tags)"],
    },
    {
        name: "an edge to the nodes of a value",
        loaded: ["people"],
        waiting: ["entries"],
        matches: ["entries.person = people.person_id", "entries.building = new"],
        makes: ["edge entries -> people (building)", "middle entries -> people (building)"],
    },
    {
        name: "a set no one join reads lists what each match makes",
        waiting: ["transfers", "entries", "people"],
        matches: ["transfers.from = transfers.to", "entries.person = people.person_id"],
        makes: [
            "link transfers -> transfers (to,from)",
            "fields entries -> people #1",
            "fields people -> entries #1",
            "link entries -> people #1",
        ],
    },
    {
        name: "two ends naming one waiting source are never offered together",
        waiting: ["transfers"],
        matches: ["transfers.from = transfers.to", "transfers.tx = transfers.to"],
        makes: ["link transfers -> transfers (to,from)"],
    },
    {
        name: "nothing matched makes nothing",
        loaded: ["people"],
        waiting: ["buildings"],
        matches: ["people.person_id = buildings.city"],
        makes: [],
    },
];

describe("source-steps drafts: what matches can make", () => {
    it.each(CASES)("$name", async ({ loaded = [], waiting = [], matches, makes }) => {
        const o = await opened(loaded, waiting);
        assert.deepStrictEqual(listed(o, matches), makes);
        const asked = matches.map((text) => match(o.key, text));
        for (const { acts, code, uses } of o.draft.joinOutcomes({ matches: asked }).outcomes) {
            make(o.draft, acts);
            const steps = o.draft.steps().filter((step) => step.op !== "join.add");
            assert.lengthOf(steps, acts.length, `${code} is a step per act`);
            for (const { buckets } of steps) {
                const did = (buckets?.matched ?? 0) + (buckets?.merged ?? 0) + (buckets?.newEdges ?? 0);
                assert.isAbove(did, 0, `${code} does something`);
            }
            // read back, the step is the matches it was made of and this outcome
            const back = o.draft.joinOutcomes({ step: steps.at(-1)?.index ?? -1 });
            if (acts.length === 1) {
                const now = back.outcomes.filter((each) => each.current).map((each) => each.code);
                assert.deepStrictEqual(now, [code]);
                const said = (all: readonly SourceJoinMatch[]): string[] =>
                    all.map(({ a, b }) => [JSON.stringify(a), JSON.stringify(b)].sort().join(" = "));
                assert.sameMembers(said(back.matches), said(uses.map((i) => asked[i])));
            }
            assert.isTrue(o.draft.undo(), "one undo takes the whole join back");
            assert.lengthOf(o.draft.steps(), loaded.length);
        }
        o.session.dispose();
    });

    it("a field an earlier merge brought is named by its space and never read as rows", async () => {
        const o = await opened(["accounts"], ["ids", "watch"]);
        const { draft, key } = o;
        draft.merge({
            from: { source: key.ids, field: "account_id" },
            into: { source: key.accounts },
            unmatchedFrom: "drop",
            aggregate: { "*": "list" },
        });
        const names = draft.sideFields({ source: key.accounts }).map(({ name, from }) => [name, from]);
        assert.sameDeepMembers(names, [
            ["account", null],
            ["name", null],
            ["phone", key.ids],
            ["device", key.ids],
            ["account_id", key.ids],
        ]);
        assert.deepStrictEqual(listed(o, ["accounts.phone = watch.value"]), [
            "fields watch -> accounts",
            "link watch -> accounts",
        ]);
        const { outcomes } = draft.joinOutcomes({ matches: [match(key, "accounts.phone = watch.value")] });
        assert.deepStrictEqual(outcomes[0]?.acts[0], {
            act: "merge",
            options: {
                from: { source: key.watch, field: "value" },
                into: { space: draft.spaces()[0]?.space ?? "", field: "phone" },
            },
        });
        assert.deepStrictEqual(listed(o, ["accounts.phone = accounts.phone"]), [], "no phone is on two accounts");
        const shared = draft.joinOutcomes({ matches: [match(key, "accounts.device = accounts.device")] }).outcomes;
        assert.deepStrictEqual(
            shared.map((each) => line(key, each)),
            ["shared accounts -> accounts (device)", "shared-nodes accounts -> accounts (device)"],
        );
        make(draft, shared[0]?.acts ?? []);
        assert.strictEqual(draft.steps().at(-1)?.buckets?.newEdges, 1, "A1 and A3 share d1");
        draft.undo();
        assert.deepStrictEqual(
            listed(o, ["watch.value = accounts.phone", "watch.value = accounts.device"]),
            ["fields watch -> accounts (phone,device)"],
            "rows of accounts hold neither, so no edge reads them",
        );
        o.session.dispose();
    });

    it("a source merged with Skip still gives fields to its second card; kept as nodes, its nodes fold", async () => {
        const o = await opened(["contacts"], ["watch"]);
        const merge = (unmatchedFrom: "keep" | "drop"): void => {
            o.draft.merge({
                from: { source: o.key.watch, field: "value" },
                into: { source: o.key.contacts, field: "phone" },
                unmatchedFrom,
            });
        };
        merge("drop");
        assert.include(listed(o, ["watch.value = contacts.device"]), "fields watch -> contacts");
        o.draft.undo();
        merge("keep");
        assert.include(listed(o, ["watch.value = contacts.device"]), "fold watch -> contacts");
        o.session.dispose();
    });

    it("chains the fields of two sources onto a third, or onto the other end", async () => {
        const o = await opened(["network"], ["map", "expression"]);
        const matches = [match(o.key, "network.id = map.protein"), match(o.key, "map.symbol = expression.symbol")];
        const chain = o.draft.joinOutcomes({ matches }).outcomes.find((each) => each.code === "fields");
        assert.strictEqual(chain?.acts.length, 2);
        make(o.draft, chain?.acts ?? []);
        await o.draft.commit();
        assert.sameMembers(
            o.session.data
                .nodes()
                .flatMap((node) => (node.tpm === undefined ? [] : [`${String(node.id)} ${JSON.stringify(node.tpm)}`])),
            ["N1 5", "N2 7"],
        );
        o.session.dispose();
    });

    it("counts the edges that already join the nodes an edge's rows name", async () => {
        const o = await opened(["people", "buildings"], ["entries"]);
        const matches = [
            match(o.key, "entries.person = people.person_id"),
            match(o.key, "entries.building = buildings.building"),
        ];
        const edge = (): SourceJoinOutcome | undefined =>
            o.draft.joinOutcomes({ matches }).outcomes.find((each) => each.code === "edge");
        assert.strictEqual(edge()?.edgesBetween, 0);
        make(o.draft, edge()?.acts ?? []);
        assert.strictEqual(edge()?.edgesBetween, 3, "E1, E2 and E3's edges");
        const at = o.draft.steps().findIndex((step) => step.act !== null);
        const now = o.draft.joinOutcomes({ step: at }).outcomes.find((each) => each.current);
        assert.strictEqual(now?.edgesBetween, 0, "a step's own edges are not there before it");
        o.session.dispose();
    });

    it("a step whose earlier join was removed still reads its matches and its own outcome", async () => {
        const { session, draft, key } = await opened(["accounts"], ["ids", "watch"]);
        draft.merge({
            from: { source: key.ids, field: "account_id" },
            into: { source: key.accounts },
            unmatchedFrom: "drop",
            aggregate: { "*": "list" },
        });
        draft.merge({
            from: { source: key.watch, field: "value" },
            into: { space: draft.spaces()[0]?.space ?? "", field: "phone" },
            unmatchedFrom: "drop",
        });
        const first = draft.steps().findIndex((step) => step.act?.from.source === key.ids);
        draft.removeStep(first, { adds: "remove" });
        const at = draft.steps().findIndex((step) => step.act !== null);
        const { matches, outcomes } = draft.joinOutcomes({ step: at });
        assert.deepStrictEqual(matches[0]?.a, { source: key.watch, field: "value" });
        assert.deepStrictEqual(
            outcomes.map((each) => [each.code, each.current]),
            [["fields", true]],
        );
        session.dispose();
    });

    it("a field the source does not hold is refused, by the outcomes and by the acts", async () => {
        const { session, draft, key } = await opened(["accounts"], ["ids", "watch"]);
        draft.merge({ from: { source: key.ids, field: "account_id" }, into: { source: key.accounts } });
        const before = draft.steps().length;
        const no = (act: () => unknown): void => {
            try {
                act();
                assert.fail("it is refused");
            } catch (error) {
                assert.deepInclude(error, { code: "E_BAD_COMMAND" });
                assert.deepInclude((error as { details: object }).details, { reason: "no-column" });
            }
        };
        const from = { source: key.watch, field: "value" };
        const into = { source: key.accounts, field: "phone" };
        no(() => draft.joinOutcomes({ matches: [match(key, "watch.nothing = accounts.account")] }));
        no(() =>
            draft.joinRows({
                a: { source: key.watch },
                b: { source: key.accounts },
                match: match(key, "watch.nothing = accounts.account"),
            }),
        );
        no(() => {
            draft.merge({ from, into, unmatchedFrom: "drop" });
        });
        no(() => {
            draft.merge({ from: { source: key.accounts, field: "phone" }, into: { source: key.watch } });
        });
        no(() => draft.connect({ from: { source: key.accounts, field: "phone" }, into: { source: key.watch } }));
        no(() => draft.connect({ from, into }));
        no(() =>
            draft.connect({
                from,
                into: { source: key.accounts },
                to: { field: "nothing", into: { source: key.accounts } },
            }),
        );
        no(() => draft.link({ source: key.accounts, columns: ["phone"] }));
        no(() => draft.link({ source: key.watch, columns: ["risk"], field: "value", into }));
        assert.lengthOf(draft.steps(), before, "a refused act changes nothing");
        session.dispose();
    });

    it("two ends naming the rows' own waiting source add it, so the edges have their nodes", async () => {
        const { session, draft, key } = await opened([], ["people"]);
        draft.connect({
            from: { source: key.people, field: "person_id" },
            into: { source: key.people },
            to: { field: "badge", into: { source: key.people, field: "badge" } },
        });
        assert.deepInclude(draft.preview().after, { nodes: 3, edges: 3 });
        session.dispose();
    });

    it("suggests the matches of one side, either way round", async () => {
        const { session, draft, key } = await opened(["suppliersA", "people"], ["suppliersB", "entries"]);
        const pairs = (source: string, other: string): unknown[] =>
            draft
                .suggestMatches(source, { with: { source: other } })
                .map(({ matches }) => [matches[0]?.from.source, matches[0]?.from.field, matches[0]?.into.field]);
        assert.deepStrictEqual(pairs(key.suppliersB, key.suppliersA)[0], [key.suppliersB, "duns", "duns"]);
        assert.deepInclude(pairs(key.people, key.entries), [key.entries, "person", undefined]);
        assert.notExists(
            pairs(key.people, key.entries).find((each) => (each as unknown[]).includes(key.suppliersA)),
            "only the two sides",
        );
        session.dispose();
    });

    it("judges a match by the values that match: a value the other side lacks may repeat", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("a.csv", "id,phone", "A1,p1", "A2,p1", "A3,p2"), { key: "id" });
        const names = ["p1,high", "Zoe,low", "Zoe,mid"];
        const watch = await session.data.stage(csv("w.csv", "value,risk", ...names), {});
        const draft = session.data.draft();
        const a = { source: session.data.sources()[0].key, field: "phone" };
        const match = { a, b: { source: watch, field: "value" } };
        assert.deepStrictEqual(
            draft.joinOutcomes({ matches: [match] }).outcomes.map((each) => each.code),
            ["fields", "link"],
        );
        assert.strictEqual(draft.joinRows({ a: { source: a.source }, b: { source: watch }, match }).rowsOf, "a");
        session.dispose();
    });

    it("never suggests the numbers rows were given for want of a key, nor a column a source brought itself", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("a.csv", "id,rating,duns", "S1,0,x", "S2,1,y"), { key: "id" });
        const own = session.data.sources()[0].key;
        const b = await session.data.stage(csv("b.csv", "duns,city", "x,Rome", "y,Oslo"), {});
        await session.data.setMapping(b, { nodes: {} });
        const draft = session.data.draft();
        const pairs = (): unknown[] =>
            draft
                .suggestMatches(b, { with: { source: own } })
                .map(({ matches }) => [matches[0]?.from.field, matches[0]?.into.field]);
        assert.notDeepInclude(pairs(), ["rating", undefined]);
        draft.merge({
            from: { source: b, field: "duns" },
            into: { source: own, field: "duns" },
            unmatchedFrom: "drop",
        });
        assert.notDeepInclude(pairs(), ["city", "city"]);
        session.dispose();
    });

    it("reads as rows the side with no nodes of its own, then the one loaded later", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const first = await session.data.stage(FILES.suppliersA, { key: "id" });
        const second = await session.data.stage(FILES.suppliersB, { key: "id" });
        const match = { a: { source: first, field: "duns" }, b: { source: second, field: "duns" } };
        const rowsOf = (): unknown => {
            const draft = session.data.draft();
            const { rowsOf: side } = draft.joinRows({ a: { source: first }, b: { source: second }, match });
            draft.dispose();
            return side;
        };
        assert.strictEqual(rowsOf(), "b", "both wait: the one loaded later");
        await session.data.add(second);
        assert.strictEqual(rowsOf(), "a", "the one that waits, though it was loaded first");
        session.dispose();
    });

    it("never chains through a column the third source has of its own", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("n.csv", "id,symbol", "N1,x", "N2,y"), { key: "id" });
        const map = await session.data.stage(FILES.map, {});
        const expression = await session.data.stage(FILES.expression, { key: "symbol" });
        const matches = [
            { a: { source: session.data.sources()[0].key, field: "id" }, b: { source: map, field: "protein" } },
            { a: { source: map, field: "symbol" }, b: { source: expression, field: "symbol" } },
        ];
        const codes = session.data
            .draft()
            .joinOutcomes({ matches })
            .outcomes.map((each) => each.code);
        assert.deepStrictEqual(codes, ["edge", "middle"], "its own symbol would stand in for the map's");
        session.dispose();
    });

    it("suggests a column an earlier merge brought", async () => {
        const { session, draft, key } = await opened(["accounts"], ["ids", "watch"]);
        draft.merge({
            from: { source: key.ids, field: "account_id" },
            into: { source: key.accounts },
            unmatchedFrom: "drop",
            aggregate: { "*": "list" },
        });
        const found = draft.suggestMatches(key.watch, { with: { source: key.accounts } });
        assert.sameMembers(
            found.map(({ matches }) => matches[0]?.into.field),
            ["phone", "device"],
        );
        session.dispose();
    });
});

describe("source-steps drafts: a join's rows that are nodes already", () => {
    it("are taken out by unlinked remove when nothing links them, and kept by drop", async () => {
        const { session, draft, key } = await opened(["people", "entries"], []);
        const options = { from: { source: key.entries, field: "hour" }, into: { source: key.people } };
        draft.connect({ ...options, unlinked: "drop" });
        assert.strictEqual(draft.preview().after.nodes, 6, "they were in the graph before");
        draft.undo();
        draft.connect({ ...options, unlinked: "remove" });
        assert.deepInclude(draft.preview().after, { nodes: 3, edges: 0 });
        assert.strictEqual(draft.preview().marks.nodes.removed, 3, "the entries");
        const at = draft.steps().length - 1;
        assert.strictEqual(draft.steps()[at]?.act?.unlinked, "remove", "it reads back");
        await draft.commit();
        const { text } = await session.project.save();
        const other = createGraphSession({ features: ["source-steps"] });
        await other.project.open(text);
        assert.lengthOf(other.data.nodes(), 3, "a saved step removes them too");
        assert.strictEqual(other.data.steps().at(-1)?.act?.unlinked, "remove");
        other.dispose();
        session.dispose();
    });

    it("stay when another source's row is the node too, or an edge of another step reaches them", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("p.csv", "id,boss", "P1,", "P2,P1", "P3,"), { key: "id", type: "person" });
        const more = await session.data.stage(csv("m.csv", "emp,lead", "P2,P1", "P3,"), { key: "emp", type: "emp" });
        const draft = session.data.draft();
        draft.merge({ from: { source: more, field: "emp" }, into: { space: "person" } });
        draft.connect({ from: { source: more, field: "lead" }, into: { space: "person" }, unlinked: "remove" });
        assert.strictEqual(draft.preview().after.nodes, 3, "P3 is people.csv's too");
        draft.undo();
        const people = session.data.sources()[0].key;
        draft.undo();
        draft.connect({ from: { source: people, field: "boss" }, into: { space: "person" }, unlinked: "remove" });
        assert.sameMembers(
            draft
                .preview()
                .rows({ step: draft.steps().length - 1, bucket: "unmatched" })
                .rows.map((row) => row.key),
            [],
        );
        assert.strictEqual(draft.preview().after.nodes, 2, "P1 and P2 are linked; P3 is not");
        session.dispose();
    });
});

describe("source-steps: removing the source a join went into", () => {
    const joinedWatch = async (unmatchedFrom: "keep" | "drop"): Promise<{ session: GraphSession; watch: string }> => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(FILES.contacts, { key: "contact" });
        await session.data.import(FILES.buildings, { key: "building", mode: "merge" });
        const watch = await session.data.stage(FILES.watch, { key: "value" });
        const draft = session.data.draft();
        const into = { source: session.data.sources()[0].key, field: "phone" };
        draft.merge({ from: { source: watch, field: "value" }, into, unmatchedFrom });
        await draft.commit();
        return { session, watch };
    };

    it("puts a source whose rows it skipped back to waiting, none of them a node", async () => {
        const { session, watch } = await joinedWatch("drop");
        assert.lengthOf(session.data.nodes(), 4, "two contacts and two buildings");
        const draft = session.data.draft();
        draft.removeSource(session.data.sources()[0].key, { adds: "remove" });
        await draft.commit();
        assert.sameMembers(
            session.data.nodes().map((node) => node.id),
            ["D1", "D2"],
        );
        assert.include(
            session.data.staged().map((each) => each.key),
            watch,
        );
        await session.undo();
        assert.lengthOf(session.data.nodes(), 4);
        session.dispose();
    });

    it("leaves the rows a join kept as nodes, and by default the skipped ones too", async () => {
        for (const [unmatchedFrom, adds] of [
            ["keep", "remove"],
            ["drop", "keep"],
        ] as const) {
            const { session } = await joinedWatch(unmatchedFrom);
            const draft = session.data.draft();
            draft.removeSource(session.data.sources()[0].key, { adds });
            await draft.commit();
            assert.includeMembers(
                session.data.nodes().map((node) => String(node.id)),
                ["d1", "404"],
            );
            session.dispose();
        }
    });
});
