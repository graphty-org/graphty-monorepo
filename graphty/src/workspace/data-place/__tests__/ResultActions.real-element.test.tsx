/**
 * A result row's Run again and Copy items (#177), on the REAL graphty-element and Les Miserables:
 * each Copy item puts graphty-element's own form of the result on the clipboard, TSV at full
 * stored precision, and Run again with changes... opens Analyze on the result's algorithm, whose
 * Run adds a second result.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

/**
 * The workspace on Les Miserables, with one finished PageRank result.
 * @returns the session and the result's id.
 */
async function withResult(): Promise<{ session: GraphSession; id: string }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    const run = session.runs.start("pagerank", {});
    await run;
    await userEvent.click(await screen.findByRole("tab", { name: "Calculated" }));
    return { session, id: run.id };
}

/**
 * Opens a result row's "..." and picks one item.
 * @param id - the result.
 * @param item - the item's words.
 */
async function pick(id: string, item: string): Promise<void> {
    const list = await screen.findByRole("list", { name: "Results" });
    const row = await waitFor(() => {
        const found = list.querySelector<HTMLElement>(`[data-run="${id}"]`);
        assert.isNotNull(found);
        return found;
    });
    if (row === null) {
        throw new Error("no row");
    }
    await userEvent.hover(row);
    await userEvent.click(within(row).getByRole("button", { name: /^More for/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: new RegExp(`^${item}`) }));
}

describe("a result row's Copy items", () => {
    it("copy the result as TSV at full precision, as JSON, as a command, as methods text and as member ids", async () => {
        const { session, id } = await withResult();
        const run = session.runs.get(id);
        const result = run?.result;
        assert.isDefined(result);

        await pick(id, "Copy as TSV");
        await screen.findByText("Copied as TSV");
        const tsv = await navigator.clipboard.readText();
        assert.strictEqual(tsv, result?.toTsv());
        const [header, first] = tsv.split("\n");
        assert.match(header ?? "", /^id\tvalue/);
        // The stored value, not a rounded one.
        const [firstId, value] = (first ?? "").split("\t");
        assert.strictEqual(Number(value), result?.node(firstId ?? "")?.value);

        await pick(id, "Copy as JSON");
        await screen.findByText("Copied as JSON");
        assert.deepStrictEqual(
            JSON.parse(await navigator.clipboard.readText()),
            JSON.parse(JSON.stringify(run?.record)),
        );

        await pick(id, "Copy as command");
        await screen.findByText("Copied as command");
        const command = JSON.parse(await navigator.clipboard.readText()) as { op: string; algorithm: string };
        assert.strictEqual(command.op, "algo.run");
        assert.strictEqual(command.algorithm, "pagerank");

        await pick(id, "Copy methods text");
        await screen.findByText("Copied methods text");
        assert.include(await navigator.clipboard.readText(), "graphty-element");

        await pick(id, "Copy member ids");
        await screen.findByText("Copied member ids");
        assert.strictEqual((await navigator.clipboard.readText()).split("\n").length, result?.memberIds().length);
    });
});

describe("a result row's Run again with changes...", () => {
    it("opens Analyze on the result's algorithm, and a changed setting's Run adds a second result", async () => {
        const { session, id } = await withResult();

        await pick(id, "Run again with changes");
        // Its own settings, unchanged, are up to date; a changed one runs.
        await userEvent.click(await screen.findByRole("button", { name: "Settings for PageRank" }));
        const damping = await screen.findByRole("spinbutton", { name: /^Damping factor/ });
        await userEvent.tripleClick(damping);
        await userEvent.keyboard("0.5{Tab}");
        await userEvent.click(await screen.findByRole("button", { name: /^Run\b/ }));

        await waitFor(() => {
            assert.strictEqual(session.runs.list().filter((each) => each.algorithm === "pagerank").length, 2);
        });
    });
});
