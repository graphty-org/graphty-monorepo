/**
 * Tier 4's R14 on the REAL graphty-element: Export opens on Data wherever a table is showing
 * (Ctrl+E with the table dock open, a source row's Export...), says what a file loses in one
 * counted line with a Details disclosure, groups its Format list into Tables and Network files,
 * and offers "Include styles" only where a format can hold styles. Every change is made by real
 * input; every assertion reads what is drawn.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { HOSTS_CSV } from "../../data-place/fixtures";
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = Array.from({ length: 4 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = NODES.map((node, i) => ({ source: node.id, target: NODES[(i + 1) % NODES.length].id }));

/**
 * Mounts the workspace with a project open and waits for the element's session.
 * @param state - more of the store's first state.
 * @returns the session.
 */
async function open(state: Partial<WorkspaceState> = {}): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, ...state });
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * Waits until the Data output's preview is written.
 * @param dialog - the Export dialog.
 */
async function previewed(dialog: HTMLElement): Promise<void> {
    await waitFor(
        () => {
            assert.notInclude(within(dialog).getByLabelText("Preview of the exported data").textContent, "Writing");
        },
        { timeout: TIMEOUT_MS },
    );
}

describe("Export opens on Data where a table is showing (R14)", () => {
    it("opens Ctrl+E on Data with the edges table while the table dock shows edges", async () => {
        const session = await open({ dockOpen: true, dockTab: "edges" });
        await session.data.addNodes(NODES);
        await session.data.addEdges(EDGES);

        await userEvent.keyboard("{Control>}e{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Data" }));
        assert.strictEqual(within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Table" }).value, "Edges");
    });

    it("opens Ctrl+E on Image while no table is showing", async () => {
        const session = await open();
        await session.data.addNodes(NODES);

        await userEvent.keyboard("{Control>}e{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Image" }));
    });

    it("opens a source row's Export... on Data, scoped to that source", async () => {
        const session = await open({ place: "data" });
        await session.data.import({ config: { file: new File(["id,os\nweb9,linux\n"], "more-hosts.csv") } });
        await session.data.import({ config: { file: new File([HOSTS_CSV], "hosts.csv") } }, { mode: "merge" });
        const placeRegion = within(screen.getByRole("region", { name: "Data place" }));
        const row = await placeRegion.findByRole("listitem", { name: "hosts.csv" }, { timeout: TIMEOUT_MS });

        await userEvent.hover(row);
        await userEvent.click(within(row).getByRole("button", { name: "hosts.csv menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Export..." }));
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Data" }));
        await waitFor(() => {
            assert.match(
                within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Scope" }).value,
                /^hosts\.csv /,
            );
        });
    });
});

describe("the Data output's format list and losses (R14)", () => {
    it("groups formats into Tables and Network files, with no style suffix, and offers Include styles only where a format keeps styles", async () => {
        const session = await open({ dockOpen: true, dockTab: "nodes" });
        await session.data.addNodes(NODES);
        await session.data.addEdges(EDGES);

        await userEvent.keyboard("{Control>}e{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        await previewed(dialog);
        // CSV holds no styles: no Include styles box, and a hint says so.
        assert.isNull(within(dialog).queryByRole("checkbox", { name: /^Include styles$/i }));
        assert.isNotNull(within(dialog).getByText("No styles"));

        await userEvent.click(within(dialog).getByRole("combobox", { name: "Format" }));
        const list = await screen.findByRole("listbox");
        assert.isNotNull(within(list).getByText("Tables"));
        assert.isNotNull(within(list).getByText("Network files"));
        for (const option of within(list).getAllByRole("option")) {
            assert.notInclude(option.textContent, "keeps style layers");
        }
        await userEvent.click(within(list).getByRole("option", { name: "GraphML" }));
        await previewed(dialog);
        assert.isNotNull(within(dialog).getByRole("checkbox", { name: "Include styles" }));
        assert.isNull(within(dialog).queryByText("No styles"));
    });

    it("says what a file loses in one counted line, the rows behind Details", async () => {
        const session = await open({ dockOpen: true, dockTab: "nodes" });
        await session.data.addNodes(NODES);
        await session.data.addEdges(EDGES);
        await session.styles.add({
            name: "green labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labelColor": "#00ff00" },
        });

        await userEvent.keyboard("{Control>}e{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        await userEvent.click(within(dialog).getByRole("combobox", { name: "Format" }));
        await userEvent.click(await screen.findByRole("option", { name: "GEXF" }));
        const note = await within(dialog).findByRole("note", {}, { timeout: TIMEOUT_MS });
        const details = within(note).getByRole("button", { name: "Details" });
        assert.strictEqual(details.getAttribute("aria-expanded"), "false");
        assert.match(note.textContent, /^Lost in GEXF: node label color not writtenDetails$/);
        assert.isNull(within(note).queryByRole("list"));

        await userEvent.click(details);
        assert.strictEqual(details.getAttribute("aria-expanded"), "true");
        assert.match(within(note).getByRole("list").textContent, /Node label color not written/);
    });
});
