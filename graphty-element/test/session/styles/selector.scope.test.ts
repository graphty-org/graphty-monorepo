/**
 * @file The `{match:"scope"}` selector (design/sets/sets-design.md section 11): a style layer that
 * names a set. Both declarations of `Selector` take it, a malformed one is `E_BAD_SELECTOR`, and a
 * scope that cannot be resolved paints nothing while the rest of the stack paints on.
 */

import { assert, describe, it } from "vitest";

import type { Selector as PublishedSelector } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { compileSelector, type Selector } from "../../../src/session/styles/selector";
import type { ElementSession } from "../../../src/session/types";
import { type Harness, makeSession } from "../helpers";

/**
 * Five nodes a..e on a path, frozen.
 * @returns The harness.
 */
function graph(): Harness {
    const h = makeSession({ directed: false });
    h.add(
        ["a", "b", "c", "d", "e"].map((id, index) => ({ id, weight: index + 1 })),
        ["ab", "bc", "cd", "de"].map(([src, dst]) => ({ src, dst })),
    );
    h.session.data.snapshot();

    return h;
}

/** The colour the element's own base layer paints every node. */
const BASE = "#6366f1";

/**
 * Every node's painted colour, by id.
 * @param h - The harness.
 * @returns id to hex, "none" where nothing painted colour.
 */
function colours(h: Harness): Record<string, string> {
    const snapshot = h.session.data.snapshot();
    const out: Record<string, string> = {};
    for (let index = 0; index < snapshot.nodeCount; index++) {
        out[String(snapshot.ids.idOf(index))] = painter(h).styleOf("node", index)["node.color"]?.hex ?? "none";
    }

    return out;
}

/**
 * Paint the whole graph from the stack, as the element does after a load.
 * @param h - The harness.
 */
async function paintAll(h: Harness): Promise<void> {
    await painter(h).repaintAll((h.session as ElementSession).styles.compiled(), { signal: new AbortController().signal, report: () => undefined });
}

/**
 * What the session's last passes painted.
 * @param h - The harness.
 * @returns The paint.
 */
function painter(h: Harness): ElementSession["paint"] {
    return (h.session as ElementSession).paint;
}

describe("the scope selector", () => {
    it("both declarations take the kind, and it compiles to a bit test", () => {
        const published: PublishedSelector = { match: "scope", scope: { set: "set_1" } };
        const internal: Selector = published;
        const compiled = compileSelector(internal, "node", {
            nodeValue: () => undefined,
            edgeValue: () => undefined,
            scope: () => ({ bits: () => Uint32Array.of(0b101), problem: () => undefined }),
        });

        assert.strictEqual(compiled.match, "scope");
        assert.deepStrictEqual([0, 1, 2].map((index) => compiled.test?.(index)), [true, false, true]);
        assert.deepStrictEqual(compiled.paths, []);
    });

    it("refuses a malformed scope with E_BAD_SELECTOR, and a session without sets with E_UNSUPPORTED", () => {
        const source = { nodeValue: () => undefined, edgeValue: () => undefined };
        for (const scope of [42, { set: 5 }, undefined, "search", { nodes: "a" }]) {
            try {
                compileSelector({ match: "scope", scope } as unknown as Selector, "node", { ...source, scope: () => ({ bits: () => null, problem: () => undefined }) });
                assert.fail(`accepted ${JSON.stringify(scope)}`);
            } catch (error) {
                assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_SELECTOR", String(error));
            }
        }

        try {
            compileSelector({ match: "scope", scope: "graph" }, "node", source);
            assert.fail("accepted a scope selector with no sets to resolve it");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_UNSUPPORTED", String(error));
        }

        const h = graph();
        const verdict = h.session.styles.validate({ name: "bad", selector: { match: "scope", scope: { set: 5 } } as unknown as PublishedSelector, set: { "node.color": "#ff0000" } });
        assert.isFalse(verdict.ok);
        assert.strictEqual(verdict.errors[0]?.code, "E_BAD_SELECTOR");
    });

    it("paints a kept set's members", async () => {
        const h = graph();
        const id = h.session.sets.create({ kind: "fixed", nodes: ["b", "d"], reading: "induced" }, { name: "S" });
        await h.session.styles.add({ name: "S", selector: { match: "scope", scope: { set: id } }, set: { "node.color": "#ff0000" } });
        await paintAll(h);

        assert.deepStrictEqual(colours(h), { a: BASE, b: "#ff0000", c: BASE, d: "#ff0000", e: BASE });
    });

    it("a detached or unresolvable scope paints nothing, and the layers above it still paint", async () => {
        const h = graph();
        const id = h.session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Gone" });
        h.session.sets.remove(id);
        await h.session.styles.add({ name: "detached", selector: { match: "scope", scope: { set: id } }, set: { "node.color": "#ff0000" } });
        await h.session.styles.add({ name: "never", selector: { match: "scope", scope: { set: "set_nowhere" } }, set: { "node.color": "#00ff00" } });
        await h.session.styles.add({ name: "above", selector: { match: "ids", nodes: ["c"] }, set: { "node.color": "#0000ff" } });
        await paintAll(h);

        assert.deepStrictEqual(colours(h), { a: BASE, b: BASE, c: "#0000ff", d: BASE, e: BASE });
        assert.deepStrictEqual(
            h.session.sets.usedBy(id).map((user) => user.kind),
            ["layer"],
            "a detached layer still names the set",
        );
    });

    it("a layer naming a removed set stays detached when a set of the same name is created", async () => {
        const h = graph();
        const id = h.session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "S" });
        await h.session.styles.add({ name: "S", selector: { match: "scope", scope: { set: id } }, set: { "node.color": "#ff0000" } });
        await paintAll(h);
        assert.strictEqual(colours(h).a, "#ff0000");

        h.session.sets.remove(id);
        const again = h.session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "S" });
        await h.session.styles.settled();
        await paintAll(h);

        assert.notStrictEqual(again, id);
        assert.deepStrictEqual(colours(h), { a: BASE, b: BASE, c: BASE, d: BASE, e: BASE });
        assert.deepStrictEqual(h.session.sets.usedBy(again), []);
    });

    it("importing a document whose layer names an unknown set keeps the layer and reports it detached", async () => {
        const h = graph();
        const report = await h.session.styles.applyTemplate({
            version: 1,
            layers: [{ name: "Suspects", selector: { match: "scope", scope: { set: "set_elsewhere" } }, set: { "node.color": "#ff0000" } }],
        });

        assert.deepStrictEqual(report.applied, []);
        assert.strictEqual(report.unbound.length, 1);
        assert.match(report.unbound[0].reason, /detached/);
        const kept = h.session.styles.get(report.unbound[0].layerId);
        assert.deepStrictEqual(kept?.selector, { match: "scope", scope: { set: "set_elsewhere" } });
        assert.deepStrictEqual(h.session.styles.toDocument().layers.map((layer) => layer.name), ["Suspects"]);
    });
});
