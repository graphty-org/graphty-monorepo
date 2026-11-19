/**
 * A result row's Run again and Copy items (#177), on the REAL graphty-element and Les Miserables:
 * each Copy item puts graphty-element's own form of the result on the clipboard, TSV at full
 * stored precision, and Run again with changes... opens Analyze on the result's algorithm, whose
 * Run adds a second result. The inspector's header "..." for a result holds the same items.
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
 * The workspace on Les Miserables, with one finished result.
 * @param algorithm - the result's algorithm.
 * @param params - its settings.
 * @returns the session and the result's id.
 */
async function withResult(
    algorithm: string,
    params: Record<string, unknown> = {},
): Promise<{ session: GraphSession; id: string }> {
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
    const run = session.runs.start(algorithm, params);
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

/**
 * Clicks a result's row, which opens it in the inspector.
 * @param id - the result.
 */
async function openResult(id: string): Promise<void> {
    const list = await screen.findByRole("list", { name: "Results" });
    const row = await waitFor(() => {
        const found = list.querySelector<HTMLElement>(`[data-run="${id}"] .dp-run-main`);
        assert.isNotNull(found);
        return found;
    });
    if (row === null) {
        throw new Error("no row");
    }
    await userEvent.click(row);
}

describe("a result row's Copy items", () => {
    it("copy the result as TSV at full precision, as JSON, as a command, as methods text and as member ids", async () => {
        const { session, id } = await withResult("pagerank");
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

describe("the inspector's result view", () => {
    it("holds the same Copy and Run again items in its header's ...", async () => {
        const { session, id } = await withResult("pagerank");
        const result = session.runs.get(id)?.result;
        await openResult(id);

        await userEvent.click(await screen.findByRole("button", { name: "Measure actions" }));
        await screen.findByRole("menuitem", { name: /^Run again with changes/ });
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Copy as TSV/ }));
        await screen.findByText("Copied as TSV");
        assert.strictEqual(await navigator.clipboard.readText(), result?.toTsv());
    });

    it("heads an edge-set result (Kruskal) Edge set, not Groups, since it publishes no groups", async () => {
        const { session, id } = await withResult("kruskal");
        assert.strictEqual(session.runs.get(id)?.shape, "edge-set");
        await openResult(id);

        const inspector = within(await screen.findByRole("complementary", { name: "Inspector" }));
        assert.isNotNull(await inspector.findByText("Edge set"));
        assert.isNull(inspector.queryByText("Groups"));
    });
});

describe("a result row's Run again with changes...", () => {
    it("opens Analyze on the result's algorithm, and a changed setting's Run adds a second result", async () => {
        const { session, id } = await withResult("katz", { alpha: 0.01 });

        await pick(id, "Run again with changes");
        // It opens with the result's own settings (the button says it holds set values); unchanged
        // they are up to date, and a changed one runs.
        await userEvent.click(await screen.findByRole("button", { name: /^Settings for Katz.+/ }));
        const attenuation = await screen.findByRole("spinbutton", { name: /^Attenuation/ });
        await userEvent.tripleClick(attenuation);
        await userEvent.keyboard("0.02{Tab}");
        // Named for the result it paints over: "Update Katz layer" while that layer shows.
        await userEvent.click(await screen.findByRole("button", { name: /^Update Katz layer/ }));

        await waitFor(() => {
            const katz = session.runs.list().filter((each) => each.algorithm === "katz");
            assert.deepEqual(
                katz.map((each) => each.params.alpha),
                [0.01, 0.02],
            );
        });
    });
});

describe("a result row's Combine into a score...", () => {
    it("opens Custom score on the result's metric, adds a second weighted metric, and creates the column", async () => {
        const { session, id } = await withResult("pagerank");
        const degree = session.runs.start("degree", {});
        await degree;

        await pick(id, "Combine into a score");
        const dialog = await screen.findByRole("dialog", { name: "Custom score" });
        const first = within(dialog).getByRole("combobox", { name: /^Metric 1/ });
        assert.strictEqual((first as HTMLInputElement).value, "PageRank");

        await userEvent.click(within(dialog).getByRole("button", { name: "Add metric" }));
        const weight = await within(dialog).findByRole("spinbutton", { name: /^Weight 2/ });
        await userEvent.tripleClick(weight);
        await userEvent.keyboard("2{Tab}");
        await userEvent.click(within(dialog).getByRole("button", { name: "Create" }));

        await waitFor(() => {
            const [column] = session.data.derivedColumns();
            assert.strictEqual(column?.name, "Score");
            assert.deepEqual(
                column?.score?.map((term) => term.weight),
                [1, 2],
            );
        });
        const values = session.data.nodes().map((node) => node.Score as number);
        assert.isTrue(values.every((value) => value >= 0 && value <= 3));
        assert.strictEqual(Math.max(...values) > 0, true);
    });
});
