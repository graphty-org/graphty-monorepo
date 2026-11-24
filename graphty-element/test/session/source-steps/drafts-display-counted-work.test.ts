/**
 * @file What drawing a source draft costs: `display(true)`, `show("after")` and an act while After is
 * drawn each write the draft's graph into the live one and repaint it, reading `graphty.draft` once
 * per element; `styles.showDraft` draws the join preview over it and its `end()` takes it off. The work stays in step with the graph, so a graph four times larger costs at most
 * about four times as much.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceDraft } from "../../../src/session";
import { assertScalesLinearly, visitsDuring } from "../../helpers/cost";

/**
 * A transfers file of `size` rows between accounts and merchants, a layer reading `graphty.draft`
 * on nodes and on edges, and a draft that merges an accounts file of `size` rows onto the accounts.
 * @param size - How many rows each file holds.
 * @returns The session, the draft and the accounts' source.
 */
async function drafted(size: number): Promise<{ session: GraphSession; d: SourceDraft; a: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    const transfers = Array.from(
        { length: size },
        (_, i) => `T${String(i)},A${String(i)},M${String(i % 7)},${String(i)}`,
    );
    await session.data.import(
        { type: "csv", config: { data: `txn,account,merchant,amount\n${transfers.join("\n")}` }, name: "t.csv" },
        {
            edges: {
                from: { column: "account", space: "account" },
                to: { column: "merchant", space: "merchant" },
                id: "txn",
            },
        },
    );
    const accounts = Array.from({ length: size }, (_, i) => `A${String(i)},holder ${String(i)}`);
    const a = await session.data.stage(
        { type: "csv", config: { data: `account,holder\n${accounts.join("\n")}` }, name: "a.csv" },
        { key: "account", type: "account" },
    );
    for (const target of ["node", "edge"] as const) {
        await session.styles.add({
            name: `${target} drafted`,
            target,
            selector: { match: "expression", where: "graphty.draft == 'merged' || graphty.draft == 'unchanged'" },
            set: target === "node" ? { "node.size": 2 } : { "edge.width": 2 },
        });
    }
    const d = session.data.draft();
    d.merge({ from: { source: a, field: "account" }, into: { space: "account" } });
    return { session, d, a };
}

describe("source-steps drafts: counted work of drawing a draft", () => {
    it("display(true) draws After in step with the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const { session, d } = await drafted(size);
                const visits = await visitsDuring(async () => {
                    await d.display(true);
                    await session.styles.settled();
                });
                assert.strictEqual(session.data.count().edges, size, "After draws every transfer");
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], counter: "elements visited drawing After" },
        );
    });

    it('show("after") from Before draws After in step with the graph', async () => {
        await assertScalesLinearly(
            async (size) => {
                const { session, d } = await drafted(size);
                await d.display(true);
                await d.show("before");
                await session.styles.settled();
                const visits = await visitsDuring(async () => {
                    await d.show("after");
                    await session.styles.settled();
                });
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], counter: "elements visited switching to After" },
        );
    });

    it("an act while After is drawn redraws it in step with the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const { session, d, a } = await drafted(size);
                await d.display(true);
                await session.styles.settled();
                const visits = await visitsDuring(async () => {
                    d.renameColumn({ kind: "node", name: "holder" }, "owner", { source: a });
                    await d.display(true);
                    await session.styles.settled();
                });
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], counter: "elements visited redrawing After after an act" },
        );
    });

    it("showDraft draws the join preview, and its end takes it off, in step with the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const { session, d } = await drafted(size);
                await d.display(true);
                await session.styles.settled();
                const visits = await visitsDuring(async () => {
                    const view = session.styles.showDraft({ merged: "#7048E8", new: "#E8590C" });
                    await session.styles.settled();
                    view.end();
                    await session.styles.settled();
                });
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], counter: "elements visited drawing and ending the join preview" },
        );
    });
});
