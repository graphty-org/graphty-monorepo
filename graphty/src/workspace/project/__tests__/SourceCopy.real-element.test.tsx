/**
 * The Data sources list's "Ref" mark for a source graphty-element keeps as a reference (the source
 * references experiment, issue #8813), on the REAL graphty-element: the mark follows the source's
 * choice, comes back on a reopened reference while the Data place shows, and with the experiment
 * off never shows. Every web request is answered by a stub of `fetch`; every assertion reads what
 * the reader sees or what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { browserProjects, type GraphSession } from "@graphty/graphty-element/session";
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
    for (const stored of await browserProjects.list()) {
        await browserProjects.remove(stored.id);
    }
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
 * Opens Save as with Control+S and waits until its Save can be pressed.
 * @returns the dialog.
 */
async function openSaveAs(): Promise<HTMLElement> {
    await userEvent.keyboard("{Control>}s{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Save Towns as" });
    await waitFor(() => {
        assert.isFalse(within(dialog).getByRole<HTMLButtonElement>("button", { name: /^Save/ }).disabled);
    });
    return dialog;
}

/**
 * Clicks one segment of a Copy / Reference control.
 * @param group - the control.
 * @param label - "Copy" or "Reference".
 */
async function pick(group: HTMLElement, label: "Copy" | "Reference"): Promise<void> {
    await userEvent.click(within(group).getByText(label));
}

describe("the Ref mark, with the experiment on", () => {
    withFeatures(["source-references"]);

    it("marks a referenced source Ref in the Data sources list, and Copy takes the mark away", async () => {
        const { session } = await threeLoads();
        const [people] = session.data.sources();
        const row = (): HTMLElement => screen.getByRole("listitem", { name: "people.json" });
        assert.isNull(within(row()).queryByText("Ref"));

        session.data.setCopy(people.key, "reference");
        await waitFor(() => {
            assert.isNotNull(within(row()).queryByText("Ref"));
        });
        // Named for what it is at any time, saved or not.
        assert.equal(within(row()).getByText("Ref").closest(".dp-source-ref")?.getAttribute("aria-label"), "Reference");
        assert.isNull(within(screen.getByRole("listitem", { name: "farms.json" })).queryByText("Ref"));

        session.data.setCopy(people.key, "copy");
        await waitFor(() => {
            assert.isNull(within(row()).queryByText("Ref"));
        });
    });

    it("Save as keeps the whole project as a version 1 file with the sources chosen as references, marked Ref", async () => {
        const { store, session } = await threeLoads();
        await userEvent.keyboard("{Control>}s{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Save Towns as" });
        await waitFor(() => {
            assert.isFalse(within(dialog).getByRole<HTMLButtonElement>("button", { name: /^Save/ }).disabled);
        });
        await userEvent.click(
            within(await within(dialog).findByRole("radiogroup", { name: "Sources" })).getByText("Reference"),
        );
        await userEvent.click(within(dialog).getByRole("button", { name: /^Save/ }));
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Saved Towns in this browser.");
        });

        // Both web addresses are references, the file a copy; the Data sources list says so.
        assert.deepEqual(
            session.data.copies().map((entry) => entry.copy),
            ["reference", "reference", "copy"],
        );
        await waitFor(() => {
            assert.isNotNull(within(screen.getByRole("listitem", { name: "people.json" })).queryByText("Ref"));
        });
        const [stored] = await browserProjects.list();
        const file = stored === undefined ? undefined : await browserProjects.get(stored.id);
        assert.strictEqual((JSON.parse((await file?.text()) ?? "{}") as { version?: number }).version, 1);
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
});

describe("a project saved with references, reopened", () => {
    withFeatures(["source-references"]);

    it("saves a reference, reopens it from Recent projects with its rows read again, and names a changed one", async () => {
        const { store, session } = await threeLoads();
        const nodes = session.data.statistics().nodeCount;
        const dialog = await openSaveAs();
        await pick(await within(dialog).findByRole("radiogroup", { name: "Sources" }), "Reference");
        await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Saved Towns in this browser.");
        });
        assert.deepEqual(choices(session), ["reference", "reference", "copy"]);

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

    it("saves a sample opened from the start page's library as a reference", async () => {
        const { session, store } = await openSampleFromStart("Florentine families");
        assert.isUndefined(session.data.copies()[0]?.refused);
        // Set on the load: the version 2 Save as offers no Reference for a library sample, which
        // a version 2 file cannot reference yet; the version 1 file Save writes keeps it.
        const [sample] = session.data.sources();
        session.data.setCopy(sample.key, "reference");
        await userEvent.keyboard("{Control>}s{/Control}");
        const dialog = await screen.findByRole("dialog", { name: /^Save .* as$/ });
        await waitFor(() => {
            assert.isFalse(within(dialog).getByRole<HTMLButtonElement>("button", { name: /^Save/ }).disabled);
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await waitFor(() => {
            assert.match(store.get().notice?.message ?? "", /^Saved .* in this browser\.$/);
        });
        assert.deepEqual(choices(session), ["reference"]);
    });

    it("names a reference that could not be read again, by its name", async () => {
        const { store, session } = await threeLoads();
        const dialog = await openSaveAs();
        await userEvent.click(await within(dialog).findByRole("button", { name: "Each source" }));
        await pick(await within(dialog).findByRole("radiogroup", { name: "Keep people.json" }), "Reference");
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

describe("the Ref mark, with the experiment off", () => {
    withFeatures([]);

    it("keeps a reference in a version 2 file, and Save after a reopen keeps it", async () => {
        const { store, session } = await threeLoads();
        const dialog = await openSaveAs();
        await pick(await within(dialog).findByRole("radiogroup", { name: "Sources" }), "Reference");
        await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Saved Towns in this browser.");
        });
        /**
         * The project kept in this browser, as JSON.
         * @returns its version and its data section's sources.
         */
        const kept = async (): Promise<{ version?: number; sections?: { data?: { sources?: unknown[] } } }> => {
            const [stored] = await browserProjects.list();
            const file = stored === undefined ? undefined : await browserProjects.get(stored.id);
            return JSON.parse((await file?.text()) ?? "{}") as {
                version?: number;
                sections?: { data?: { sources?: unknown[] } };
            };
        };
        const before = await kept();
        assert.strictEqual(before.version, 2, "only a version 2 file keeps a reference with the experiment off");

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Back to start" }));
        await userEvent.click(await screen.findByRole("gridcell", { name: /^Towns/ }));
        await elementSession(session);
        await waitFor(() => {
            assert.match(store.get().notice?.message ?? "", /^Opened Towns/);
            assert.isNull(screen.queryByRole("dialog"));
        });

        // Save, with no Save as since the reopen, keeps the references the file held.
        store.set({ notice: null });
        await userEvent.keyboard("{Control>}s{/Control}");
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Saved Towns in this browser.");
        });
        const after = await kept();
        assert.strictEqual(after.version, 2);
        assert.deepEqual(after.sections?.data?.sources, before.sections?.data?.sources);
    });

    it("never shows", async () => {
        await threeLoads();
        assert.isNull(document.querySelector(".dp-source-ref"));
    });
});
