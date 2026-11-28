/**
 * A result row's Run again and Copy items (#177), on the REAL graphty-element and Les Miserables:
 * each Copy item puts graphty-element's own form of the result on the clipboard, TSV at full
 * stored precision, and Run again with changes... opens Analyze on the result's algorithm, whose
 * Run adds a second result. The inspector's header "..." for a result holds the same items. Pin to
 * report puts the result in the Export dialog's Report as a pinned item with the reader's note
 * (#177, #187).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * The workspace on Les Miserables, with one finished result.
 * @param algorithm - the result's algorithm.
 * @param params - its settings.
 * @returns the session, the chrome store and the result's id.
 */
async function withResult(
    algorithm: string,
    params: Record<string, unknown> = {},
): Promise<{ session: GraphSession; store: WorkspaceStore; id: string }> {
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
    await userEvent.click(page.getByRole("tab", { name: "Calculated", exact: true }));
    return { session, store, id: run.id };
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
    await userEvent.click(page.elementLocator(row).getByRole("button", { name: /^More for/ }));
    await userEvent.click(page.getByRole("menuitem", { name: new RegExp(`^${item}`) }));
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

        await userEvent.click(page.getByRole("button", { name: "Measure actions", exact: true }));
        await screen.findByRole("menuitem", { name: /^Run again with changes/ });
        await userEvent.click(page.getByRole("menuitem", { name: /^Copy as TSV/ }));
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
        await userEvent.click(page.getByRole("button", { name: /^Settings for Katz.+/ }));
        const attenuation = page.getByRole("spinbutton", { name: /^Attenuation/ });
        await userEvent.tripleClick(attenuation);
        await userEvent.keyboard("0.02{Tab}");
        // Named for the result it paints over: "Update Katz layer" while that layer shows.
        await userEvent.click(page.getByRole("button", { name: /^Update Katz layer/ }));

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
        const { session, store, id } = await withResult("pagerank");
        const degree = session.runs.start("degree", {});
        await degree;

        await pick(id, "Combine into a score");
        const dialog = await screen.findByRole("dialog", { name: "Custom score" });
        const first = within(dialog).getByRole("combobox", { name: /^Metric 1/ });
        assert.strictEqual((first as HTMLInputElement).value, "PageRank");

        await userEvent.click(page.elementLocator(dialog).getByRole("button", { name: "Add metric", exact: true }));
        const weight = (): Locator => page.elementLocator(dialog).getByRole("spinbutton", { name: /^Weight 2/ });
        await userEvent.tripleClick(weight());
        await userEvent.keyboard("2{Tab}");
        // The rows being built live in the kept store, so a reload reopens the dialog on them.
        assert.deepEqual(
            store.get().scoreOn?.terms.map((term) => term.weight),
            [1, 2],
        );
        await userEvent.click(page.elementLocator(dialog).getByRole("button", { name: "Create", exact: true }));

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

describe("a result row's Pin to report", () => {
    it("pins the result into the Report's Pinned items, with the reader's note, and unpins it there", async () => {
        const { session, id } = await withResult("pagerank");
        const result = session.runs.get(id)?.result;
        // The report's Markdown, caught where the page hands it to the browser; the download itself does nothing.
        const files: Blob[] = [];
        const create = URL.createObjectURL.bind(URL);
        vi.spyOn(URL, "createObjectURL").mockImplementation((object: Blob | MediaSource) => {
            if (object instanceof Blob) {
                files.push(object);
            }
            return create(object);
        });
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

        await pick(id, "Pin to report");
        await screen.findByText("Pinned to report");
        // The inspector's header "..." for it now offers the way back.
        await openResult(id);
        await userEvent.click(page.getByRole("button", { name: "Measure actions", exact: true }));
        await screen.findByRole("menuitem", { name: /^Unpin from report/ });
        await userEvent.keyboard("{Escape}");

        await userEvent.keyboard("{Control>}e{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        await userEvent.click(
            page
                .elementLocator(dialog)
                .getByRole("grid", { name: "What to export", exact: true })
                .getByText("Report", { exact: true }),
        );
        const sections = await within(dialog).findByRole("group", { name: "Sections" });
        assert.isNotNull(within(sections).getByRole("checkbox", { name: "Pinned items (1)" }));
        const pinned = within(dialog).getByRole("group", { name: "Pinned items" });
        await userEvent.type(
            page.elementLocator(pinned).getByRole("textbox", { name: "PageRank", exact: true }),
            "Valjean leads",
        );
        await userEvent.click(
            page.elementLocator(dialog).getByRole("button", { name: "Generate report", exact: true }),
        );
        await screen.findByText("Exported untitled_report.md", { selector: ".cm-toast-message" });

        const report = (await files.at(-1)?.text()) ?? "";
        const [header = "", first = ""] = result?.toTsv().split("\n") ?? [];
        assert.include(report, "## Pinned items\n\n### PageRank (first 20 of 77)\n\nValjean leads\n");
        // Its values as graphty-element writes them, at full stored precision.
        assert.include(report, `| ${header.split("\t").join(" | ")} |`);
        assert.include(report, `| ${first.split("\t").join(" | ")} |`);

        // Unpinned in the Report, it leaves the Pinned items.
        await userEvent.keyboard("{Control>}e{/Control}");
        const again = await screen.findByRole("dialog", { name: "Export" });
        await userEvent.click(
            page
                .elementLocator(again)
                .getByRole("grid", { name: "What to export", exact: true })
                .getByText("Report", { exact: true }),
        );
        await userEvent.click(page.elementLocator(again).getByRole("button", { name: "Unpin PageRank", exact: true }));
        await within(again).findByRole("checkbox", { name: "Pinned items (0)" });
        assert.isNull(within(again).queryByRole("group", { name: "Pinned items" }));
    });
});
