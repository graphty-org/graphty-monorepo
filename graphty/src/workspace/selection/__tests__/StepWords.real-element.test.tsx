/**
 * What a selection step's row says on the REAL graphty-element's session: the value and the test of
 * each relative step (downstream, upstream, connected, edges touching, shares a value, while) and
 * how each kind of reference reads (hovered or selected, so far, the selection, a set, one node,
 * several nodes, any other scope).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, RuleTree, StepReference } from "@graphty/graphty-element/session";
import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import { waitFor } from "../../../test/test-utils";
import { referenceWords, stepWords } from "../words";

let session: GraphSession;

/**
 * A step's row words for a rule.
 * @param rule - the step's rule.
 * @param ends - which ends of an edge a node value reads, when given.
 * @returns "value | test".
 */
function said(rule: RuleTree, ends?: "both" | "either"): string {
    const words = stepWords(session, { op: "add", rule, ends }, "node");
    return `${words.value} | ${words.test}`;
}

describe("a selection step's words", () => {
    beforeAll(async () => {
        const element = document.createElement("graphty-element");
        document.body.append(element);
        session = await waitFor(() => {
            assert.isOk(element.session);
            return element.session;
        });
        await session.data.addNodes([
            { id: "a", tags: { name: "Valjean" } },
            { id: "b", tags: { name: "Javert" } },
        ]);
    });
    afterEach(() => {
        session.selection.clear();
    });
    afterAll(() => {
        document.querySelector("graphty-element")?.remove();
    });

    it("reads every kind of reference", () => {
        const read = (reference: StepReference | undefined): string => referenceWords(session, reference);
        assert.equal(read(undefined), "");
        assert.equal(read("hovered-or-selected"), "Hovered or selected");
        assert.equal(read("so-far"), "So far");
        assert.equal(read("selection"), "Selected (0)");
        assert.equal(read({ set: "gone" }), "A set");
        assert.equal(read({ nodes: ["a"] }), session.data.nodeName("a").name);
        assert.equal(read({ nodes: ["a", "b"] }), "2 nodes");
        assert.equal(read("graph"), "A scope");
    });

    it("names each relative step by its form, with its reference as the test", () => {
        assert.equal(said({ kind: "hops", direction: "out", max: 2, of: "so-far" }), "Downstream of | So far");
        assert.equal(said({ kind: "hops", direction: "in", max: 2, of: "so-far" }), "Upstream of | So far");
        assert.equal(said({ kind: "hops", of: "so-far" }), "Connected to | So far");
        assert.equal(said({ kind: "touching", ends: "both", of: "so-far" }), "Edges within | So far");
        assert.equal(said({ kind: "touching", ends: "one", of: "so-far" }), "Edges leaving | So far");
        assert.equal(said({ kind: "nonempty" }), "While ... has nodes | ");
        assert.equal(said({ kind: "nonempty", of: "so-far" }), "While | So far has nodes");
    });

    it("says when either end of an edge is enough, and leaves both ends unsaid", () => {
        const rule: RuleTree = { kind: "hops", max: 1, of: "so-far" };
        assert.equal(said(rule, "either"), "Within 1 hop of | So far either end");
        assert.equal(said(rule, "both"), "Within 1 hop of | So far");
    });
});
