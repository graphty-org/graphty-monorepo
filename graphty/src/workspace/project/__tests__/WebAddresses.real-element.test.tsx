/**
 * Web addresses a project names, from the app, on the REAL graphty-element: the question before a
 * project opens one (Continue, Cancel, Don't ask again for this project, Don't ask again -- both
 * "don't ask" choices kept on this machine, never in the project file), a model
 * and a picture pasted by URL in the Style tab, and the choice to embed a model loaded from a URL
 * or keep only its address when saving. Every web request is answered by a stub of `fetch`, so the
 * tests reach no network; every answer is a click.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { cleanup, render, screen, waitFor, within } from "../../../test/test-utils";
import { OPEN_PROJECT_URLS, PROJECT_HOSTS_KEY, readPreference, readProjectHosts } from "../../settings/preferences";
import { createWorkspaceStore } from "../../state/store";
import { dotPng, quadGlb } from "../../style/__tests__/quadGlb";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and drawing, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

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

afterEach(() => {
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
    await waitFor(
        () => {
            element = document.querySelector(".ws-canvas graphty-element");
            assert.isDefined(element?.session);
        },
        { timeout: TIMEOUT_MS },
    );
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
    await waitFor(
        () => {
            assert.equal(session.assets.states().find((change) => change.ref === ref)?.state, state);
        },
        { timeout: TIMEOUT_MS },
    );
}

describe("web addresses a project names, from the app", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("asks before opening a model a project names, and Continue opens it", async () => {
        const session = await openWithGraph();
        await layerFromAFile(session);
        const dialog = await screen.findByRole("dialog", { name: "Open a web address?" }, { timeout: TIMEOUT_MS });
        assert.isNotNull(within(dialog).getByText(`This project wants to open ${MODEL}. Continue?`));
        assert.notInclude(requested, MODEL, "nothing is fetched before the answer");

        await userEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
        await reaches(session, MODEL, "drawn");
        assert.include(requested, MODEL);
    });

    it("Cancel leaves the node's shape and fetches nothing", async () => {
        const session = await openWithGraph();
        await layerFromAFile(session);
        const dialog = await screen.findByRole("dialog", { name: "Open a web address?" }, { timeout: TIMEOUT_MS });
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await reaches(session, MODEL, "rejected");
        assert.notInclude(requested, MODEL);
    });

    it("Don't ask again for this project is kept on this machine, not in the project file", async () => {
        const session = await openWithGraph();
        await layerFromAFile(session);
        const dialog = await screen.findByRole("dialog", { name: "Open a web address?" }, { timeout: TIMEOUT_MS });
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
        await screen.findByRole("dialog", { name: "Open a web address?" }, { timeout: TIMEOUT_MS });
        assert.notInclude(requested, MODEL, "nothing is fetched before the answer");
    });

    it("Don't ask again for this project does not reach another project", async () => {
        const session = await openWithGraph();
        await layerFromAFile(session);
        const dialog = await screen.findByRole("dialog", { name: "Open a web address?" }, { timeout: TIMEOUT_MS });
        await userEvent.click(within(dialog).getByRole("button", { name: "Don't ask again for this project" }));
        await reaches(session, MODEL, "drawn");
        cleanup();

        // Another project naming the same site, on the same machine, asks.
        const other = await openWithGraph();
        await layerFromAFile(other);
        await screen.findByRole("dialog", { name: "Open a web address?" }, { timeout: TIMEOUT_MS });
        assert.notEqual(other.project.id, session.project.id);
    });

    it("Don't ask again is the reader's own preference, kept by the app", async () => {
        const session = await openWithGraph();
        await layerFromAFile(session);
        const dialog = await screen.findByRole("dialog", { name: "Open a web address?" }, { timeout: TIMEOUT_MS });
        await userEvent.click(within(dialog).getByRole("button", { name: "Don't ask again" }));
        await reaches(session, MODEL, "drawn");
        assert.equal(session.network.policy, "allow");
        assert.equal(readPreference(OPEN_PROJECT_URLS), "allow");
    });

    it("draws a model pasted by URL in the Model picker", async () => {
        const session = await openWithGraph();
        const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(tab).getByRole("button", { name: /^Shape / }));
        const shapes = await screen.findByRole("dialog", { name: "Shapes" });
        await userEvent.click(within(shapes).getByRole("option", { name: "Model..." }));
        const picker = await screen.findByRole("group", { name: "Models" });
        await userEvent.type(within(picker).getByRole("textbox", { name: "Model URL" }), MODEL);
        await userEvent.click(within(picker).getByRole("button", { name: "Add" }));

        await reaches(session, MODEL, "drawn");
        assert.isTrue(session.styles.list().some((layer) => layer.set?.["node.model"] === MODEL));
        assert.lengthOf(
            screen.queryAllByRole("dialog", { name: "Open a web address?" }),
            0,
            "the reader's own URL asks nothing",
        );
    });

    it("draws a picture pasted by URL on a texture line added from Fill", async () => {
        const session = await openWithGraph();
        const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        const fill = within(tab).getByRole("group", { name: "Fill" });
        const plus = within(fill).queryByRole("button", { name: "Add Texture" });
        if (plus === null) {
            await userEvent.click(within(fill).getByRole("button", { name: "Add to Fill" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: /^Texture/ }));
        } else {
            await userEvent.click(plus);
        }
        // Adding the line makes the row's first own layer, and the tab is drawn again for it.
        await userEvent.click(await screen.findByRole("button", { name: /^Texture / }, { timeout: TIMEOUT_MS }));
        const picker = await screen.findByRole("group", { name: "Pictures" });
        await userEvent.type(within(picker).getByRole("textbox", { name: "Picture URL" }), PICTURE);
        await userEvent.click(within(picker).getByRole("button", { name: "Add" }));

        await reaches(session, PICTURE, "drawn");
        assert.isTrue(session.styles.list().some((layer) => layer.set?.["node.texture"] === PICTURE));
    });

    it("asks how to keep a model loaded from a URL when saving, and keeps only the address on Use URL", async () => {
        vi.stubGlobal("showSaveFilePicker", undefined);
        const blobs = new Map<string, Blob>();
        const downloads: Blob[] = [];
        const create = URL.createObjectURL.bind(URL);
        vi.spyOn(URL, "createObjectURL").mockImplementation((object: Blob | MediaSource) => {
            const url = create(object);
            if (object instanceof Blob) {
                blobs.set(url, object);
            }
            return url;
        });
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
            const blob = blobs.get(this.href);
            if (this.download !== "" && blob !== undefined) {
                downloads.push(blob);
            }
        });
        const session = await openWithGraph();
        await session.styles.add({
            name: "Panel",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": MODEL },
        });
        await reaches(session, MODEL, "drawn");

        await userEvent.keyboard("{Control>}s{/Control}");
        const saveAs = await screen.findByRole("dialog", { name: "Save Web as" });
        await userEvent.click(within(saveAs).getByRole("button", { name: "Save" }));
        const keep = await screen.findByRole("dialog", { name: "Save files from the web" });
        await userEvent.click(within(keep).getByText("Use URL"));
        await userEvent.click(within(keep).getByRole("button", { name: "Save" }));

        await waitFor(
            () => {
                assert.lengthOf(downloads, 1);
            },
            { timeout: TIMEOUT_MS },
        );
        const saved = JSON.parse(await downloads[0].text()) as {
            members: { kind: string; assets?: Record<string, unknown>[] }[];
        };
        const [entry] = saved.members.find((member) => member.kind === "graphty-assets")?.assets ?? [];
        assert.equal(entry?.source, MODEL);
        assert.equal(entry?.stored, "url");
        assert.isUndefined(entry?.files);
    });
});
