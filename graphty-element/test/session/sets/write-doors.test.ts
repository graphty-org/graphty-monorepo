/**
 * @file The write doors that take a scope (design/sets/sets-design.md section 15.2): every one
 * converts a session edge id inside an inline `{ define }` to its stable member, at any depth;
 * every one refuses a set id never issued and accepts a removed one; a run over an empty set is
 * refused with `E_SCOPE_EMPTY`, and so is the deprecated save of an empty selection.
 */

import { assert, describe, it } from "vitest";

import type { Filter, Scope, ScopeInput } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { edgeBetween, type Harness, makeSession } from "../helpers";
import { builtInRuns } from "./algorithms";

/** A session over a path a-b-c-d, running built-in algorithms. */
function fixture(): Harness {
    let harness: Harness | null = null;
    const made = makeSession({ directed: false, runs: { execute: builtInRuns(() => harness as Harness) } });
    harness = made;
    made.add(
        ["a", "b", "c", "d"].map((id) => ({ id })),
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
        ],
    );

    return made;
}

/**
 * The code a call refused with, synchronously or through its promise; null when it did not.
 * @param call - The call.
 * @returns The code.
 */
async function codeOf(call: () => unknown): Promise<string | null> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : `not-a-graphty-error: ${String(error)}`;
    }

    return null;
}

/**
 * An inline listed set holding one edge, named by its session id.
 * @param h - The harness.
 * @returns The scope.
 */
function edgeScope(h: Harness): ScopeInput {
    return { define: { kind: "fixed", nodes: [], edges: [edgeBetween(h, "a", "b")], reading: "listed" } };
}

describe("a session edge id inside an inline definition", () => {
    it("is accepted by a run, which records the stable member", async () => {
        const h = fixture();
        const run = h.session.runs.start("degree", {}, { scope: edgeScope(h), style: false });
        await run;

        const spec = run.record.scope.spec as unknown as { define: { edges: { source: string; target: string }[] } };
        assert.deepStrictEqual(
            spec.define.edges.map((member) => [member.source, member.target]),
            [["a", "b"]],
        );
    });

    it("is accepted by selection.apply, visibility.set and a scope layer", async () => {
        const h = fixture();
        await h.session.selection.apply({ scope: edgeScope(h) });
        assert.deepStrictEqual([...h.session.selection.edges].length, 1);

        await h.session.visibility.set({ kind: "scope", scope: edgeScope(h) as Scope });
        const leaf = h.session.visibility.filter as unknown as { scope: { define: { edges: unknown[] } } };
        assert.strictEqual(typeof leaf.scope.define.edges[0], "object", "the filter holds the stable member");

        const layer = await h.session.styles.add({ name: "Edge", selector: { match: "scope", scope: edgeScope(h) as Scope }, set: { "node.color": "#ff0000" } });
        const held = layer.selector as unknown as { scope: { define: { edges: unknown[] } } };
        assert.strictEqual(typeof held.scope.define.edges[0], "object", "the layer holds the stable member");
    });

    it("is accepted in a nested scope leaf of a kept rule", () => {
        const h = fixture();
        const where: Filter = { kind: "scope", scope: edgeScope(h) as Scope };
        const id = h.session.sets.create({ kind: "rule", where, reading: "listed" });

        const stored = h.session.sets.get(id)?.definition as unknown as { where: { scope: { define: { edges: unknown[] } } } };
        assert.strictEqual(typeof stored.where.scope.define.edges[0], "object");
    });
});

describe("a set id never issued", () => {
    const nope: Scope = { set: "set_nope" };

    it("is refused at every write door", async () => {
        const h = fixture();
        assert.strictEqual(await codeOf(() => h.session.selection.apply({ scope: nope })), "E_BAD_COMMAND");
        assert.strictEqual(await codeOf(() => h.session.visibility.set({ kind: "scope", scope: nope })), "E_BAD_COMMAND");
        assert.strictEqual(await codeOf(() => h.session.runs.start("degree", {}, { scope: nope, style: false })), "E_BAD_COMMAND");
        assert.strictEqual(
            await codeOf(() => h.session.sets.create({ kind: "rule", where: { kind: "scope", scope: nope }, reading: "induced" })),
            "E_BAD_COMMAND",
        );
        assert.notStrictEqual(
            await codeOf(() => h.session.styles.add({ name: "Nope", selector: { match: "scope", scope: nope }, set: { "node.color": "#ff0000" } })),
            null,
        );
    });

    it("is told apart from a removed set's id, which a filter and a layer still accept", async () => {
        const h = fixture();
        const id = h.session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" });
        h.session.sets.remove(id);

        assert.strictEqual(await codeOf(() => h.session.visibility.set({ kind: "scope", scope: { set: id } })), null);
        assert.strictEqual(
            await codeOf(() => h.session.styles.add({ name: "Gone", selector: { match: "scope", scope: { set: id } }, set: { "node.color": "#ff0000" } })),
            null,
        );
    });
});

describe("a run over an empty set", () => {
    it("is refused with E_SCOPE_EMPTY in every scope form", async () => {
        const h = fixture();
        const empty = h.session.sets.create({ kind: "fixed", nodes: [], reading: "induced" });
        for (const scope of [{ set: empty }, { nodes: [] }, { nodes: ["zz"] }, { where: "id == 'nope'" }] as Scope[]) {
            assert.strictEqual(await codeOf(() => h.session.runs.start("degree", {}, { scope, style: false })), "E_SCOPE_EMPTY", JSON.stringify(scope));
        }
    });

    it("is not refused over the whole graph, which a caller did not choose as a set", async () => {
        const h = makeSession({ directed: false, runs: { execute: () => Promise.resolve({ fields: [], nodes: new Map(), edges: new Map() }) as never } });
        assert.notStrictEqual(await codeOf(() => h.session.runs.start("degree", {}, { scope: "graph", style: false })), "E_SCOPE_EMPTY");
    });
});

describe("the deprecated scope.save", () => {
    it("refuses an empty selection, which it would freeze empty", () => {
        const h = fixture();
        let code: string | null = null;
        try {
            h.session.scope.save("Empty", "selection");
        } catch (error) {
            code = isGraphtyError(error) ? error.code : "other";
        }

        assert.strictEqual(code, "E_SCOPE_EMPTY");
    });
});

describe("an undirected edge member spelt with its ends reversed", () => {
    it("is the same member: adding it is a no-op and the revision is unchanged", () => {
        const h = fixture();
        const id = h.session.sets.create({ kind: "fixed", nodes: [], edges: [edgeBetween(h, "a", "b")], reading: "listed" });
        const before = h.session.sets.get(id);
        const member = (before?.definition as { edges: readonly { source: string; target: string }[] }).edges[0];

        h.session.sets.addMembers(id, { edges: [{ ...member, source: member.target, target: member.source }] });

        const after = h.session.sets.get(id);
        assert.strictEqual((after?.definition as { edges: readonly unknown[] }).edges.length, 1);
        assert.strictEqual(after?.revision, before?.revision);
    });
});
