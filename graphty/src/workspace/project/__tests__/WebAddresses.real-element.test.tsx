/**
 * Web addresses a project names, from the app, on the REAL graphty-element: the question before a
 * project opens one (Continue, Cancel, Don't ask again for this project, Don't ask again -- both
 * "don't ask" choices kept on this machine, never in the project file), and with the node models
 * experiment a model and a picture pasted by web address in the Style tab and the question before a
 * save of how to keep each. Every web request is answered by a stub of `fetch`, so the tests reach
 * no network; every answer is a click.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { browserProjects, createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { cleanup, render, screen, waitFor, within } from "../../../test/test-utils";
import { OPEN_PROJECT_URLS, PROJECT_HOSTS_KEY, readPreference, readProjectHosts } from "../../settings/preferences";
import { createWorkspaceStore } from "../../state/store";
import { addModel, openCustom, openShapes, written } from "../../style/__tests__/modelHarness";
import { dotPng, quadGlb } from "../../style/__tests__/quadGlb";
import { Workspace } from "../../Workspace";
import { clearRecent } from "../recent";

const MODEL = "https://models.example.com/kit/panel.glb";
const PICTURE = "https://pictures.example.com/dot.png";

/** Every URL `fetch` was asked for. */
let requested: string[] = [];

beforeEach(() => {
    requested = [];
    const original = globalThis.fetch.bind(globalThis);
    const answers = new Map<string, () => Uint8Array<ArrayBuffer>>([
        [MODEL, quadGlb],
        [PICTURE, dotPng],
    ]);
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        requested.push(url);
        const answer = answers.get(url);
        return answer === undefined ? original(input, init) : Promise.resolve(new Response(answer(), { status: 200 }));
    });
    localStorage.removeItem(OPEN_PROJECT_URLS.key);
    localStorage.removeItem(PROJECT_HOSTS_KEY);
});

afterEach(async () => {
    // Saved projects outlive the file in the browser's storage: a later file's start page would
    // open as a returning reader's.
    await clearRecent();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.removeItem(OPEN_PROJECT_URLS.key);
    localStorage.removeItem(PROJECT_HOSTS_KEY);
});

/**
 * The workspace with a project open on the Everything row and two nodes in it.
 * @returns the element's session.
 */
async function openWithGraph(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Web", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    let element: HTMLElementTagNameMap["graphty-element"] | null = null;
    await waitFor(() => {
        element = document.querySelector(".ws-canvas graphty-element");
        assert.isDefined(element?.session);
    });
    const { session } = element as unknown as HTMLElementTagNameMap["graphty-element"];
    await session.layout.set("fixed");
    await session.data.addNodes([
        { id: "1", position: { x: -2, y: 0, z: 0 } },
        { id: "2", position: { x: 2, y: 0, z: 0 } },
    ]);
    return session;
}

/**
 * A layer that came from a project file naming a model by URL, as opening one applies it.
 * @param session - the element's session.
 */
async function layerFromAFile(session: GraphSession): Promise<void> {
    await session.styles.applyTemplate({
        version: 1,
        layers: [
            { name: "From a file", target: "node", selector: { match: "everything" }, set: { "node.model": MODEL } },
        ],
    });
}

/**
 * Waits until graphty-element reports a model or picture in a state.
 * @param session - the element's session.
 * @param ref - what the layer names.
 * @param state - the state.
 */
async function reaches(session: GraphSession, ref: string, state: string): Promise<void> {
    await waitFor(() => {
        assert.equal(session.assets.states().find((change) => change.ref === ref)?.state, state);
    });
}

describe("web addresses a project names, from the app", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("asks before opening a model a project names, and Continue opens it", async () => {
        const session = await openWithGraph();
        await layerFromAFile(session);
        const dialog = await screen.findByRole("dialog", { name: "Open a web address?" });
        assert.isNotNull(within(dialog).getByText(`This project wants to open ${MODEL}. Continue?`));
        assert.notInclude(requested, MODEL, "nothing is fetched before the answer");

        await userEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
        await reaches(session, MODEL, "drawn");
        assert.include(requested, MODEL);
    });

    it("Cancel leaves the node's shape and fetches nothing", async () => {
        const session = await openWithGraph();
        await layerFromAFile(session);
        const dialog = await screen.findByRole("dialog", { name: "Open a web address?" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await reaches(session, MODEL, "rejected");
        assert.notInclude(requested, MODEL);
    });

    it("Don't ask again for this project is kept on this machine, not in the project file", async () => {
        const session = await openWithGraph();
        await layerFromAFile(session);
        const dialog = await screen.findByRole("dialog", { name: "Open a web address?" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Don't ask again for this project" }));
        await reaches(session, MODEL, "drawn");
        assert.deepEqual(readProjectHosts(session.project.id), ["models.example.com"]);
        const { text } = await session.project.save({ markSaved: false, assets: { [MODEL]: "url" } });
        assert.notInclude(text, '"policy"', "the file approves nothing");
        cleanup();

        // The same file opened again on this machine: the remembered choice skips the question.
        const again = await openWithGraph();
        await again.project.open(text, { discard: true });
        await reaches(again, MODEL, "drawn");
        assert.lengthOf(screen.queryAllByRole("dialog", { name: "Open a web address?" }), 0);
        cleanup();

        // A copy of the file on another machine, whose preferences are fresh: it asks.
        localStorage.removeItem(PROJECT_HOSTS_KEY);
        requested = [];
        const elsewhere = await openWithGraph();
        await elsewhere.project.open(text, { discard: true });
        await screen.findByRole("dialog", { name: "Open a web address?" });
        assert.notInclude(requested, MODEL, "nothing is fetched before the answer");
    });

    it("Don't ask again for this project does not reach another project", async () => {
        const session = await openWithGraph();
        await layerFromAFile(session);
        const dialog = await screen.findByRole("dialog", { name: "Open a web address?" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Don't ask again for this project" }));
        await reaches(session, MODEL, "drawn");
        cleanup();

        // Another project naming the same site, on the same machine, asks.
        const other = await openWithGraph();
        await layerFromAFile(other);
        await screen.findByRole("dialog", { name: "Open a web address?" });
        assert.notEqual(other.project.id, session.project.id);
    });

    it("Don't ask again is the reader's own preference, kept by the app", async () => {
        const session = await openWithGraph();
        await layerFromAFile(session);
        const dialog = await screen.findByRole("dialog", { name: "Open a web address?" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Don't ask again" }));
        await reaches(session, MODEL, "drawn");
        assert.equal(session.network.policy, "allow");
        assert.equal(readPreference(OPEN_PROJECT_URLS), "allow");
    });
});

/**
 * Pastes MODEL in the Load custom model dialog by real input, and waits until graphty-element draws it.
 * @param session - the element's session.
 * @param tab - the Style tab.
 */
async function pasteModel(session: GraphSession, tab: HTMLElement): Promise<void> {
    const dialog = await openCustom(tab);
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Model address" }), MODEL);
    await userEvent.click(within(dialog).getByRole("button", { name: "Load model address" }));
    await addModel(dialog);
    await reaches(session, MODEL, "drawn");
}

/**
 * The `graphty-assets` entries of the one project kept in this browser, once it is kept.
 * @returns the entries.
 */
async function keptEntries(): Promise<Record<string, unknown>[]> {
    const file = await waitFor(async () => {
        const [stored] = await browserProjects.list();
        const found = stored === undefined ? undefined : await browserProjects.get(stored.id);
        assert.isDefined(found);
        return found;
    });
    const saved = JSON.parse(await file.text()) as {
        members: { kind: string; assets?: Record<string, unknown>[] }[];
    };
    return saved.members.find((member) => member.kind === "graphty-assets")?.assets ?? [];
}

describe("web addresses in the Style tab, with the node models experiment", () => {
    it("draws a model pasted by URL in the Load custom model dialog, asking nothing", async () => {
        const { session, tab } = await openShapes();
        await pasteModel(session, tab);
        assert.equal(written(session, "node.model"), MODEL);
        assert.isNull(
            screen.queryByRole("dialog", { name: "Open a web address?" }),
            "the reader's own URL asks nothing",
        );
    });

    it("draws a picture pasted by URL in the Picture pop-over from Fill", async () => {
        const { session, tab } = await openShapes();
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node fill" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Picture" }));
        const picture = await screen.findByRole("dialog", { name: "Picture" });
        await userEvent.type(within(picture).getByRole("textbox", { name: "Picture address" }), PICTURE);
        await userEvent.click(within(picture).getByRole("button", { name: "Add picture address" }));
        await reaches(session, PICTURE, "drawn");
        assert.equal(written(session, "node.texture"), PICTURE);
    });

    it("asks how to keep a model from the web on Save, keeps only its address on Use URL, and asks once", async () => {
        await clearRecent();
        const { session, tab } = await openShapes();
        await pasteModel(session, tab);

        await userEvent.keyboard("{Control>}s{/Control}");
        const saveAs = await screen.findByRole("dialog", { name: "Save Models as" });
        await userEvent.click(within(saveAs).getByRole("button", { name: "Save" }));
        const keep = await screen.findByRole("dialog", { name: "Save files from the web" });
        assert.isNotNull(within(keep).getByTitle(MODEL), "the full address is the row's title");
        assert.isNotNull(within(keep).getByRole("radiogroup", { name: "Keep panel" }));
        await userEvent.click(within(keep).getByText("Use URL"));
        await userEvent.click(within(keep).getByRole("button", { name: "Save" }));

        const [entry] = await keptEntries();
        assert.equal(entry?.source, MODEL);
        assert.equal(entry?.stored, "url");
        assert.isUndefined(entry?.files);
        await waitFor(() => {
            assert.isFalse(session.project.dirty);
        });

        // A change and a second Save: no question, and the model is still kept by its address.
        await session.data.addNodes([{ id: "3", position: { x: 0, y: 2, z: 0 } }]);
        assert.isTrue(session.project.dirty);
        await userEvent.keyboard("{Control>}s{/Control}");
        await waitFor(() => {
            assert.isFalse(session.project.dirty);
        });
        assert.isNull(screen.queryByRole("dialog", { name: "Save files from the web" }));
        const [again] = await keptEntries();
        assert.equal(again?.stored, "url");
    });

    it("Cancel in the question saves nothing and keeps the project's name", async () => {
        await clearRecent();
        const { session, tab, store } = await openShapes();
        await pasteModel(session, tab);

        await userEvent.keyboard("{Control>}s{/Control}");
        const saveAs = await screen.findByRole("dialog", { name: "Save Models as" });
        const field = within(saveAs).getByRole("textbox", { name: "Name" });
        await userEvent.clear(field);
        await userEvent.type(field, "Renamed");
        await userEvent.click(within(saveAs).getByRole("button", { name: "Save" }));
        const keep = await screen.findByRole("dialog", { name: "Save files from the web" });
        await userEvent.click(within(keep).getByRole("button", { name: "Cancel" }));

        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });
        assert.equal(store.get().project?.name, "Models");
        assert.isTrue(session.project.dirty);
        assert.lengthOf(await browserProjects.list(), 0);
    });

    it("Save as pressed while the question asks leaves the question, and the next save after Cancel asks afresh", async () => {
        await clearRecent();
        const { session, tab, store } = await openShapes();
        await pasteModel(session, tab);

        await userEvent.keyboard("{Control>}s{/Control}");
        const saveAs = await screen.findByRole("dialog", { name: "Save Models as" });
        const field = within(saveAs).getByRole("textbox", { name: "Name" });
        await userEvent.clear(field);
        await userEvent.type(field, "Renamed");
        await userEvent.click(within(saveAs).getByRole("button", { name: "Save" }));
        const keep = await screen.findByRole("dialog", { name: "Save files from the web" });
        await userEvent.click(within(keep).getByText("Use URL"));

        // A modal dialog keeps every command key: Save as does not reach the page behind it.
        await userEvent.keyboard("{Control>}{Shift>}s{/Shift}{/Control}");
        assert.isTrue(keep.isConnected, "the question is still asking");
        assert.isNull(screen.queryByRole("dialog", { name: "Save Models as" }));
        await userEvent.click(within(keep).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });

        await userEvent.keyboard("{Control>}{Shift>}s{/Shift}{/Control}");
        const again = await screen.findByRole("dialog", { name: "Save Models as" });
        assert.equal(store.get().project?.name, "Models", "the cancelled save's name is taken back");
        await userEvent.click(within(again).getByRole("button", { name: "Save" }));
        const asked = await screen.findByRole("dialog", { name: "Save files from the web" });
        assert.isTrue(
            within(asked).getByLabelText<HTMLInputElement>("Embed model").checked,
            "the cancelled question's answer is not carried over",
        );
        await userEvent.click(within(asked).getByRole("button", { name: "Save" }));
        await waitFor(() => {
            assert.isFalse(session.project.dirty);
        });
        const [entry] = await keptEntries();
        assert.isDefined(entry?.files, "embedded, as the second question was answered");
    });

    it("asks again for a project opened in the session's place", async () => {
        await clearRecent();
        const { session, tab } = await openShapes();
        await pasteModel(session, tab);
        await userEvent.keyboard("{Control>}s{/Control}");
        const saveAs = await screen.findByRole("dialog", { name: "Save Models as" });
        await userEvent.click(within(saveAs).getByRole("button", { name: "Save" }));
        const keep = await screen.findByRole("dialog", { name: "Save files from the web" });
        await userEvent.click(within(keep).getByText("Use URL"));
        await userEvent.click(within(keep).getByRole("button", { name: "Save" }));
        await waitFor(() => {
            assert.isFalse(session.project.dirty);
        });

        // Another project opens in its place, and a layer in it names the same address.
        const other = createGraphSession();
        await other.data.addNodes([{ id: "x" }]);
        await session.project.open((await other.project.save()).text, { discard: true });
        await session.styles.add({
            name: "Again",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": MODEL },
        });
        await userEvent.keyboard("{Control>}s{/Control}");
        const asked = await screen.findByRole("dialog", { name: "Save files from the web" });
        assert.isTrue(within(asked).getByLabelText<HTMLInputElement>("Embed model").checked);
        await userEvent.click(within(asked).getByRole("button", { name: "Cancel" }));
    });
});
