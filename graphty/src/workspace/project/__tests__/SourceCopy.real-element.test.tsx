/**
 * Saving each data source as a copy or a reference (the source references experiment, issue
 * #8813), from the app, on the REAL graphty-element: Save as shows one Copy / Reference switch for
 * every source and a settings pop-over with each source's own choice; a source graphty-element
 * refuses as a reference shows why and keeps Copy; differing choices show "Mixed"; the Data sources
 * list marks a referenced source "Ref"; a project saved with a reference reopens with its rows read
 * again, after the reader allows the host. With the experiment off none of it shows. Every web
 * request is answered by a stub of `fetch`; every choice is a click, and every assertion reads what
 * the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { openSampleFromStart } from "../../../test/open";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { clearRecent } from "../recent";

const PEOPLE = "https://data.example.com/people.json";
const PLACES = "https://data.example.com/places.json";

/** What each address answers; any other address answers 404. */
let site: Record<string, string> = {};

/**
 * A small graph file's text.
 * @param prefix - the node ids' prefix, so two files share no node.
 * @returns the JSON.
 */
function graphText(prefix: string): string {
    const ids = [1, 2, 3].map((n) => `${prefix}${String(n)}`);
    return JSON.stringify({
        nodes: ids.map((id) => ({ id, label: id.toUpperCase() })),
        edges: [
            { source: ids[0], target: ids[1] },
            { source: ids[1], target: ids[2] },
        ],
    });
}

beforeEach(() => {
    site = { [PEOPLE]: graphText("p"), [PLACES]: graphText("q") };
    const original = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        if (!url.startsWith("https://data.example.com/")) {
            return original(input, init);
        }
        const body = Object.hasOwn(site, url) ? site[url] : undefined;
        return Promise.resolve(
            body === undefined ? new Response("", { status: 404 }) : new Response(body, { status: 200 }),
        );
    });
});

afterEach(async () => {
    await clearRecent();
    vi.restoreAllMocks();
});

/**
 * Waits for an element whose session is not `previous`.
 * @param previous - a session that no longer counts.
 * @returns the session.
 */
async function elementSession(previous?: GraphSession): Promise<GraphSession> {
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(session);
        assert.notStrictEqual(session, previous);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * The workspace on the Data place, with two web addresses and a file loaded.
 * @returns the store and the element's session.
 */
async function threeLoads(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    const store = createWorkspaceStore({ project: { name: "Towns", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await elementSession();
    await session.data.import({ type: "json", config: { url: PEOPLE } });
    await session.data.import({ type: "json", config: { url: PLACES } }, { mode: "merge" });
    const file = new File([graphText("f")], "farms.json", { type: "application/json" });
    await session.data.import({ type: "json", config: { file } }, { mode: "merge" });
    await waitFor(() => {
        assert.lengthOf(session.data.sources(), 3);
    });
    return { store, session };
}

/**
 * How a save keeps each load, as graphty-element reports it.
 * @param session - the element's session.
 * @returns each load's choice, in `sources()` order.
 */
function choices(session: GraphSession): string[] {
    return session.data.copies().map((entry) => entry.copy);
}

/**
 * Opens Save as with Control+S.
 * @returns the dialog.
 */
async function openSaveAs(): Promise<HTMLElement> {
    await userEvent.keyboard("{Control>}s{/Control}");
    return screen.findByRole("dialog", { name: "Save Towns as" });
}

/**
 * Clicks one segment of a Copy / Reference control.
 * @param group - the control.
 * @param label - "Copy" or "Reference".
 */
async function pick(group: HTMLElement, label: "Copy" | "Reference"): Promise<void> {
    await userEvent.click(within(group).getByText(label));
}

/**
 * The segment a Copy / Reference control shows chosen.
 * @param group - the control.
 * @returns "Copy", "Reference", or null for neither.
 */
function chosen(group: HTMLElement): string | null {
    const checked = within(group)
        .getAllByRole<HTMLInputElement>("radio")
        .find((radio) => radio.checked);
    return checked === undefined ? null : (checked.labels?.[0]?.textContent ?? null);
}

describe("Copy or Reference, with the experiment on", () => {
    withFeatures(["source-references"]);

    it("sets every source the switch can, overrides one in the settings pop-over, and shows Mixed", async () => {
        const { session } = await threeLoads();
        const dialog = await openSaveAs();
        const all = within(dialog).getByRole("radiogroup", { name: "Data sources" });
        assert.equal(chosen(all), "Copy");

        // The switch sets both web addresses; the file graphty-element refuses stays a copy.
        await pick(all, "Reference");
        await waitFor(() => {
            assert.deepEqual(choices(session), ["reference", "reference", "copy"]);
        });
        assert.equal(session.data.copies()[2]?.refused?.params.reason, "file");
        assert.equal(chosen(all), "Reference");
        assert.isNull(within(dialog).queryByText("Mixed"));

        // The settings pop-over lists every source with its own choice.
        await userEvent.click(within(dialog).getByRole("button", { name: /^Data source settings/ }));
        const settings = await screen.findByRole("dialog", { name: "Data source settings" });
        const farms = within(settings).getByRole("radiogroup", { name: "Save farms.json as" });
        assert.isTrue(within(farms).getByRole<HTMLInputElement>("radio", { name: "Reference" }).disabled);
        assert.equal(chosen(farms), "Copy");
        assert.isNotNull(within(settings).getByText("Local file"));

        const places = within(settings).getByRole("radiogroup", { name: "Save places.json as" });
        await pick(places, "Copy");
        await waitFor(() => {
            assert.deepEqual(choices(session), ["reference", "copy", "copy"]);
        });
        assert.isNull(chosen(all), "neither choice is drawn while the sources differ");
        assert.isNotNull(within(dialog).getByText("Mixed"));

        // The switch then sets both again.
        await pick(all, "Copy");
        await waitFor(() => {
            assert.deepEqual(choices(session), ["copy", "copy", "copy"]);
        });
        assert.isNull(within(dialog).queryByText("Mixed"));
    });

    it("marks a referenced source Ref in the Data sources list, and Copy takes the mark away", async () => {
        const { session } = await threeLoads();
        const [people] = session.data.sources();
        const row = (): HTMLElement => screen.getByRole("listitem", { name: "people.json" });
        assert.isNull(within(row()).queryByText("Ref"));

        const dialog = await openSaveAs();
        await userEvent.click(within(dialog).getByRole("button", { name: /^Data source settings/ }));
        const settings = await screen.findByRole("dialog", { name: "Data source settings" });
        await pick(within(settings).getByRole("radiogroup", { name: "Save people.json as" }), "Reference");
        await waitFor(() => {
            assert.isNotNull(within(row()).queryByText("Ref"));
        });
        assert.equal(session.data.sources()[0]?.copy, "reference");
        assert.isNull(within(screen.getByRole("listitem", { name: "farms.json" })).queryByText("Ref"));

        await pick(within(settings).getByRole("radiogroup", { name: "Save people.json as" }), "Copy");
        await waitFor(() => {
            assert.isNull(within(row()).queryByText("Ref"));
        });
        assert.isUndefined(session.data.sources().find((each) => each.key === people.key)?.copy);
    });

    it("saves a reference, reopens it from Recent projects with its rows read again, and names a changed one", async () => {
        const { store, session } = await threeLoads();
        const nodes = session.data.statistics().nodeCount;
        const dialog = await openSaveAs();
        await pick(within(dialog).getByRole("radiogroup", { name: "Data sources" }), "Reference");
        await waitFor(() => {
            assert.deepEqual(choices(session), ["reference", "reference", "copy"]);
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Saved Towns in this browser.");
        });

        // One source changes before the project opens again.
        site[PLACES] = site[PLACES].replace("Q1", "Q-one");
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Back to start" }));
        await userEvent.click(await screen.findByRole("gridcell", { name: /^Towns/ }));

        // The open asks before reading the web addresses again; Continue reads them.
        const ask = await screen.findByRole("dialog", { name: "Open a web address?" });
        await userEvent.click(within(ask).getByRole("button", { name: "Continue" }));
        const reopened = await elementSession(session);
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Opened Towns. places.json changed since it was saved.");
        });
        assert.equal(reopened.data.statistics().nodeCount, nodes);
        assert.include(
            reopened.data.nodes({ scope: "graph" }).map((node) => node.label),
            "Q-one",
        );
        assert.deepEqual(choices(reopened), ["reference", "reference", "copy"]);
        // A reopened project starts on the Graph place; the Data place lists the sources.
        await userEvent.click(screen.getByRole("button", { name: "Data" }));
        const row = await screen.findByRole("listitem", { name: "people.json" });
        assert.isNotNull(within(row).getByText("Ref"));
    });

    it("marks a reopened reference Ref while the Data place shows, without leaving it", async () => {
        const { session } = await threeLoads();
        const [people] = session.data.sources();
        session.data.setCopy(people.key, "reference");
        const saved = await session.project.save();
        session.data.setCopy(people.key, "copy");
        const row = (): HTMLElement => screen.getByRole("listitem", { name: "people.json" });
        await waitFor(() => {
            assert.isNull(within(row()).queryByText("Ref"));
        });

        const opening = session.project.open(saved.text, { discard: true });
        const ask = await screen.findByRole("dialog", { name: "Open a web address?" });
        await userEvent.click(within(ask).getByRole("button", { name: "Continue" }));
        await opening;
        assert.equal(session.data.sources()[0]?.copy, "reference");
        await waitFor(() => {
            assert.isNotNull(within(row()).queryByText("Ref"));
        });
    });

    it("saves a sample opened from the start page's library as a reference", async () => {
        const { session, store } = await openSampleFromStart("Florentine families");
        await userEvent.keyboard("{Control>}s{/Control}");
        const dialog = await screen.findByRole("dialog", { name: /^Save .* as$/ });
        assert.isUndefined(session.data.copies()[0]?.refused);
        await pick(within(dialog).getByRole("radiogroup", { name: "Data sources" }), "Reference");
        await waitFor(() => {
            assert.deepEqual(choices(session), ["reference"]);
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await waitFor(() => {
            assert.match(store.get().notice?.message ?? "", /^Saved .* in this browser\.$/);
        });
    });

    it("names a reference that could not be read again, by its name", async () => {
        const { store, session } = await threeLoads();
        const dialog = await openSaveAs();
        await userEvent.click(within(dialog).getByRole("button", { name: /^Data source settings/ }));
        const settings = await screen.findByRole("dialog", { name: "Data source settings" });
        await pick(within(settings).getByRole("radiogroup", { name: "Save people.json as" }), "Reference");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Data source settings" }));
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Save Towns as" }), "Escape closes the pop-over only");
        await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Saved Towns in this browser.");
        });

        site = { [PLACES]: site[PLACES] };
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Back to start" }));
        await userEvent.click(await screen.findByRole("gridcell", { name: /^Towns/ }));
        const ask = await screen.findByRole("dialog", { name: "Open a web address?" });
        await userEvent.click(within(ask).getByRole("button", { name: "Continue" }));
        await elementSession(session);
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Opened Towns. people.json could not be read again (not found).");
        });
    });
});

describe("Copy or Reference, with the experiment off", () => {
    withFeatures([]);

    it("shows no switch, no settings and no Ref mark", async () => {
        const { session } = await threeLoads();
        const dialog = await openSaveAs();
        assert.isNull(within(dialog).queryByRole("radiogroup", { name: "Data sources" }));
        assert.isNull(within(dialog).queryByRole("button", { name: /^Data source settings/ }));
        assert.isNull(within(dialog).queryByText("Copy"));
        assert.isNull(document.querySelector(".dp-source-ref"));
        assert.deepEqual(choices(session), ["copy", "copy", "copy"]);
    });
});
