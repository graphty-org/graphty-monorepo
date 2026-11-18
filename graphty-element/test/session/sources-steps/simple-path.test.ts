// The build of the simple path (design design/data/multiple-data-sources-design.md, 3.1 and 9.1):
// an edge file with typed ends, a node file for one end, and who supplied each node.
import { assert, describe, it } from "vitest";

import { csv, edgesOf, Fixture, nodeIn, nodesOf } from "./helpers";

const tx = { edges: csv("txn_id,account_id,merchant_id,merchant_name\nT1,A1,M1,Shop\nT2,A2,M1,Shop\nT3,A2,M2,Cafe\n") };
const accounts = { nodes: csv("account_id,holder\nA1,Ann\nA2,Bob\n") };
const typedEnds = { from: { column: "account_id", type: "account" }, to: { column: "merchant_id", type: "merchant" } };

function simplePath(): Fixture {
    const f = new Fixture();
    const t = f.import(tx, { edges: typedEnds });
    f.moveColumns(t, ["merchant_name"], "target");
    f.import(accounts, { key: "account_id", type: "account" });
    return f;
}

describe("simple path", () => {
    it("types an edge file's ends with `type`, so a scope by type reaches every transaction", () => {
        const r = simplePath().built();
        const typed = new Set(nodesOf(r).filter((n) => n.type === "account" || n.type === "merchant").map((n) => n.id));
        assert.equal(edgesOf(r).filter((e) => typed.has(e.from) && typed.has(e.to)).length, 3);
    });

    it("attaches a node file imported after the edge file to the nodes it named", () => {
        const r = simplePath().built();
        assert.equal(nodeIn(r, "account", "A1")?.values.holder, "Ann");
        assert.equal(nodesOf(r).filter((n) => n.key === "A1").length, 1, "one node per account");
        assert.equal(nodeIn(r, "merchant", "M2")?.values.merchant_name, "Cafe", "moved columns land on the target end");
        assert.notProperty(edgesOf(r)[0].values, "merchant_name", "a moved column leaves the edges");
    });
});

describe("supplied and named (3.1)", () => {
    it("credits a node only an edge list names to that edge source", () => {
        const f = new Fixture();
        const id = f.import({ edges: csv("a,b\nn1,n2\n") }, { mapping: { edges: { source: "a", sourceSpace: "person", target: "b", targetSpace: "person" } } });
        const nodes = nodesOf(f.built());
        assert.equal(nodes.length, 2);
        for (const n of nodes) {
            assert.deepEqual(n.loads, [id], `${n.key} is supplied by the edge list`);
        }
    });

    const people = { nodes: csv("person_id,name\nP1,Ann\nP2,Bob\n") };
    const visits = { edges: csv("person_id,room_id\nP1,R1\nP2,R1\n") };
    const vOpts = { edges: { from: { column: "person_id", type: "person" }, to: { column: "room_id", type: "room" } } };

    it("agrees on who supplied P1 whether people or visits loads first", () => {
        for (const order of [
            ["people", "visits"],
            ["visits", "people"],
        ]) {
            const f = new Fixture();
            const ids: Record<string, string> = {};
            for (const which of order) {
                ids[which] = which === "people" ? f.import(people, { key: "person_id", type: "person" }) : f.import(visits, vOpts);
            }
            const r = f.built();
            assert.equal(nodeIn(r, "person", "P1")?.loads[0], ids.people, order.join(" then "));
            const byVisits = nodesOf(r).filter((n) => n.space === "person" && n.loads.includes(ids.visits));
            assert.equal(byVisits.length, 0, "visits only names the people");
        }
    });

    it("credits an account to both edge files that reach it, whichever loads first", () => {
        const bankA = { edges: csv("account_id,merchant_id\nX1,M1\nX2,M1\n") };
        const bankB = { edges: csv("account_id,merchant_id\nX1,M2\nX3,M2\n") };
        const eOpts = { edges: { from: { column: "account_id", type: "account" }, to: { column: "merchant_id", type: "merchant" } } };
        for (const [first, second] of [
            [bankA, bankB],
            [bankB, bankA],
        ]) {
            const f = new Fixture();
            const a = f.import(first, eOpts);
            const b = f.import(second, eOpts);
            const x1 = nodeIn(f.built(), "account", "X1");
            assert.deepEqual([x1?.loads.includes(a), x1?.loads.includes(b)], [true, true]);
        }
    });

    it("lets values a step moved onto a node supply it, so another edge source that reaches it only names it", () => {
        const f = new Fixture();
        const map = { edges: { source: "acct", sourceSpace: "account", target: "merch", targetSpace: "merchant" } };
        const t = f.import({ edges: csv("acct,merch,acct_name\na1,m1,Ann\n") }, { mapping: map });
        f.moveColumns(t, ["acct_name"], "source");
        const b = f.import({ edges: csv("acct,merch\na1,m2\n") }, { mapping: map });
        const n = nodeIn(f.built(), "account", "a1");
        assert.deepEqual(n?.loads, [t]);
        assert.deepEqual(n?.named, [b]);
    });

    it("leaves a staged source unbuilt", () => {
        const f = new Fixture();
        const s = f.stage({ nodes: csv("id\nx\n") }, { nodes: { key: "id" } });
        assert.equal(f.built().nodes.size, 0);
        f.add(s);
        assert.equal(f.built().nodes.size, 1);
    });

    it("is pure: building twice gives the same graph and changes neither the input nor the copies", () => {
        const f = simplePath();
        const before = structuredClone({ input: f.input, copies: [...f.copies] });
        const once = f.built();
        const twice = f.built();
        assert.deepEqual(structuredClone({ input: f.input, copies: [...f.copies] }), before);
        assert.deepEqual([...once.nodes.keys()], [...twice.nodes.keys()]);
        assert.deepEqual(nodesOf(once), nodesOf(twice));
        assert.deepEqual(edgesOf(once), edgesOf(twice));
    });

    it("skips an off step and every step of a held source", () => {
        const f = simplePath();
        const [first, ...rest] = f.steps;
        f.steps = [{ ...first, off: true }, ...rest];
        assert.equal(nodeIn(f.built(), "merchant", "M2"), undefined, "the edge file's add is off, so its moved columns find no merchant");
        const g = simplePath();
        const t = g.steps[0].source;
        g.sources[t] = { ...g.sources[t], held: true };
        const r = g.built();
        assert.equal(r.edges.size, 0);
        assert.deepEqual(r.stats.map((x) => x.op), ["join.add"], "only the accounts file's add is built");
    });
});
