/**
 * Web addresses a project names, from the app, on the REAL graphty-element: the question before a
 * project opens one (Continue, Cancel, Don't ask again for this project, Don't ask again -- both
 * "don't ask" choices kept on this machine, never in the project file). Every web request is
 * answered by a stub of `fetch`, so the tests reach no network; every answer is a click.
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
