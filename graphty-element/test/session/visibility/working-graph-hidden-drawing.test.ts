/**
 * @file With the working graph on, nothing outside the view is drawn (design/working-graph/design.md
 * section 3): `visibility.showContext`, a branches view's `hold` and its `base: "full"` are kept but
 * draw no hidden node, and each is reported as a `W_HIDDEN_NOT_DRAWN` fact. With the option off they
 * draw as before. Read through the masks the renderer draws by (`drawnMasks`, `drawsContext`).
 */

import { assert, describe, it } from "vitest";

import type { UnionLeaf } from "../../../src/catalog/types";
import { createGraphSession } from "../../../src/session";
import type { ElementSession } from "../../../src/session/types";
import { lesMiserables } from "../../helpers/les-miserables";

const LES_MISERABLES = await lesMiserables();
const IDS = (LES_MISERABLES.ids ?? []).map(String);

/**
 * Les Miserables, with Valjean's neighborhood excluded by one condition.
 * @param workingGraph - Whether the working graph starts on.
 * @returns The session and the condition's id.
 */
async function filtered(workingGraph: boolean): Promise<{ session: ElementSession; condition: string }> {
    const session = createGraphSession({ workingGraph }) as ElementSession;
    await session.data.addNodes(IDS.map((id) => ({ id })));
    await session.data.addEdges(
        [...LES_MISERABLES.src].map((src, e) => ({ source: IDS[src], target: IDS[LES_MISERABLES.dst[e]] })),
    );
    const { id } = await session.visibility.addCondition({
        effect: "exclude",
        rule: { kind: "neighborhood", seeds: ["Valjean"], depth: 1 },
    });
    return { session, condition: id };
}

const NEAR_VALJEAN: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "graph",
    branches: [
        {
            start: "none",
            color: "#009E73",
            steps: [{ op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 1 } }],
        },
    ],
};

/**
 * Whether the renderer draws a node now.
 * @param session - The session.
 * @param node - The node.
 * @returns True when drawn.
 */
function drawn(session: ElementSession, node: string): boolean {
    return session.visibility.drawnMasks.nodes().hasId(node);
}

/**
 * The `asked` of each fact in a list.
 * @param facts - The facts.
 * @returns What was asked for.
 */
function asked(facts: readonly { readonly code: string; readonly params: { readonly asked: string } }[]): string[] {
    assert.isTrue(
        facts.every((fact) => fact.code === "W_HIDDEN_NOT_DRAWN"),
        "every fact is the one code",
    );
    return facts.map((fact) => fact.params.asked);
}

describe("showContext and the working graph", () => {
    it("draws hidden nodes faintly with the option off, as before", async () => {
        const { session } = await filtered(false);
        session.visibility.showContext = true;
        await session.styles.settled();
        assert.isTrue(session.visibility.drawsContext);
        assert.deepStrictEqual(asked(session.visibility.notDrawn), []);
        session.dispose();
    });

    it("draws nothing outside the view with the option on, and says why", async () => {
        const { session } = await filtered(true);
        session.visibility.showContext = true;
        await session.styles.settled();
        assert.isTrue(session.visibility.showContext, "the flag is kept");
        assert.isFalse(session.visibility.drawsContext, "nothing hidden is drawn");
        assert.deepStrictEqual(asked(session.visibility.notDrawn), ["showContext"]);
        session.dispose();
    });

    it("stops drawing when the option turns on, and draws again when it turns off", async () => {
        const { session } = await filtered(false);
        session.visibility.showContext = true;
        await session.styles.settled();
        assert.isTrue(session.visibility.drawsContext);

        session.workingGraph = true;
        assert.isFalse(session.visibility.drawsContext);
        assert.deepStrictEqual(asked(session.visibility.notDrawn), ["showContext"]);

        session.workingGraph = false;
        assert.isTrue(session.visibility.drawsContext);
        assert.deepStrictEqual(asked(session.visibility.notDrawn), []);
        session.dispose();
    });

    it("a project saved with showContext on opens, draws nothing outside the view, and says why", async () => {
        const saved = await filtered(false);
        saved.session.visibility.showContext = true;
        await saved.session.styles.settled();
        const { text } = await saved.session.project.save();

        const opened = createGraphSession({ workingGraph: true }) as ElementSession;
        const report = await opened.project.open(text);
        assert.deepStrictEqual(report.problems, []);
        assert.isTrue(opened.visibility.showContext, "the saved flag is read back");
        assert.isFalse(opened.visibility.drawsContext);
        assert.deepStrictEqual(asked(opened.visibility.notDrawn), ["showContext"]);
        assert.isFalse(drawn(opened, "Valjean"));
        saved.session.dispose();
        opened.dispose();
    });
});

describe("a branches view's hold and the working graph", () => {
    it("draws what the held condition removes with the option off, as before", async () => {
        const { session, condition } = await filtered(false);
        assert.isFalse(drawn(session, "Valjean"));
        const view = session.styles.showBranches({ rule: NEAR_VALJEAN, rest: "faint", hold: condition });
        await session.styles.settled();
        assert.isTrue(drawn(session, "Valjean"), "the held condition's removal is drawn");
        assert.deepStrictEqual(asked(view.notDrawn), []);
        assert.deepStrictEqual(asked(session.visibility.notDrawn), []);
        view.end();
        await session.styles.settled();
        session.dispose();
    });

    it("draws nothing outside the view with the option on, and says why", async () => {
        const { session, condition } = await filtered(true);
        const visible = session.visibility.summary.visibleNodes;
        const view = session.styles.showBranches({ rule: NEAR_VALJEAN, rest: "faint", hold: condition });
        await session.styles.settled();
        assert.isFalse(drawn(session, "Valjean"), "the held condition's removal is not drawn");
        assert.strictEqual(session.visibility.drawnMasks.nodes().size, visible, "only what is shown is drawn");
        assert.isFalse(session.visibility.ghosting);
        assert.deepStrictEqual(asked(view.notDrawn), ["hold"]);
        assert.deepStrictEqual(asked(session.visibility.notDrawn), ["hold"]);

        view.end();
        await session.styles.settled();
        assert.deepStrictEqual(asked(session.visibility.notDrawn), [], "ending the view ends the fact");
        session.dispose();
    });

    it("follows the option turning on and off while the view is shown", async () => {
        const { session, condition } = await filtered(false);
        const view = session.styles.showBranches({ rule: NEAR_VALJEAN, rest: "faint", hold: condition });
        await session.styles.settled();
        assert.isTrue(drawn(session, "Valjean"));

        session.workingGraph = true;
        assert.isFalse(drawn(session, "Valjean"));
        assert.deepStrictEqual(asked(session.visibility.notDrawn), ["hold"]);

        session.workingGraph = false;
        assert.isTrue(drawn(session, "Valjean"));
        assert.deepStrictEqual(asked(session.visibility.notDrawn), []);
        view.end();
        await session.styles.settled();
        session.dispose();
    });
});

describe("a branches view over the full graph and the working graph", () => {
    /**
     * Les Miserables with two conditions: Napoleon's neighborhood and Cravatte's, the second the
     * one being edited.
     * @param workingGraph - Whether the working graph is on.
     * @returns The session and the edited condition.
     */
    async function twoConditions(workingGraph: boolean): Promise<{ session: ElementSession; condition: string }> {
        const { session } = await filtered(workingGraph);
        await session.visibility.setConditions([
            { id: "napoleon", effect: "exclude", rule: { kind: "neighborhood", seeds: ["Napoleon"], depth: 1 } },
            { id: "cravatte", effect: "exclude", rule: { kind: "neighborhood", seeds: ["Cravatte"], depth: 1 } },
        ]);
        return { session, condition: "cravatte" };
    }

    it("draws what another condition removes with the option off, as before", async () => {
        const { session, condition } = await twoConditions(false);
        assert.isFalse(drawn(session, "Napoleon"));
        const view = session.styles.showBranches({ rule: NEAR_VALJEAN, hold: condition, base: "full" });
        await session.styles.settled();
        assert.isTrue(drawn(session, "Napoleon"), "every condition is lifted");
        assert.deepStrictEqual(asked(view.notDrawn), []);
        view.end();
        await session.styles.settled();
        session.dispose();
    });

    it("draws nothing outside the view with the option on, and says why", async () => {
        const { session, condition } = await twoConditions(true);
        const view = session.styles.showBranches({ rule: NEAR_VALJEAN, hold: condition, base: "full" });
        await session.styles.settled();
        assert.isFalse(drawn(session, "Napoleon"), "nothing another condition removes is drawn");
        assert.isFalse(drawn(session, "Myriel"), "not even a branch member");
        assert.deepStrictEqual(asked(view.notDrawn), ["hold", "full"]);
        assert.deepStrictEqual(asked(session.visibility.notDrawn), ["hold", "full"]);
        view.end();
        await session.styles.settled();
        session.dispose();
    });
});
