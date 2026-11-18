/**
 * Usage counts for the ways a project opens, on the REAL graphty-element (design/graphty/usage-analytics.md,
 * sections 4.1 and 4.2): a network example from the start screen, this tab's work coming back after a
 * reload (an autosave restore, or opening it again when nothing was written), a graphty document that is
 * not a project, the Export dialog's choices, and the use case a survey answer adds to later PostHog
 * events. Umami's sends are recorded through the analytics seam with graphty.app as the host, and
 * PostHog is on with a recording stand-in whose captures pass through `cleanPostHogEvent`.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type GraphSession, replayFetch } from "@graphty/graphty-element/session";
import type { Survey } from "posthog-js";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import {
    onUsageEvent,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setPostHogClientForTests,
    startPageCounts,
    SURVEYS_KEY,
    type UmamiBody,
} from "../../../lib/analytics";
import { openBy } from "../../../test/open";
import { forgetAutosave, openAutosaved, reload } from "../../../test/reload";
import { pickSample } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { clearRecent } from "../../project/recent";
// What www.ndexbio.org answered for WikiPathways WP5483 (graph-io's scripts/record-ndex.ts).
import ndexRecordings from "../../server/__tests__/ndex-wp5483.json";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { USE_CASE_CHOICES, USE_CASE_SURVEY } from "./surveyFixtures";

const UMAMI = "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const VISITS = "graphty.visits.v1";
const NDEX = "https://www.ndexbio.org";
/** The loads a reader's own opening sends, which a reopen of this tab's work never does. */
const LOAD_EVENTS = ["own_file_opened", "sample_loaded", "algorithm_run", "graph_action"];

/** What Umami was sent. */
const umami: UmamiBody[] = [];
/** What reached the PostHog stand-in, after cleaning. */
const posthog: { event: string; properties: Record<string, unknown> }[] = [];
/** The surveys the stand-in offers. */
let surveys: Survey[] = [];
let undoPostHog: () => void = () => undefined;

/**
 * The events of one name each recorder got.
 * @param name - the event name.
 * @returns Umami's payload data and PostHog's properties.
 */
function sent(name: string): { umami: unknown[]; posthog: Record<string, unknown>[] } {
    return {
        umami: umami.filter((body) => body.payload.name === name).map((body) => body.payload.data),
        posthog: posthog.filter((each) => each.event === name).map((each) => each.properties),
    };
}

/** Forgets what both recorders got so far. */
function forgetSent(): void {
    umami.length = 0;
    posthog.length = 0;
}

/**
 * Settles at the next usage event of a name, with its properties. No deadline of its own.
 * @param name - the event name.
 * @returns its properties.
 */
function next(name: string): Promise<Readonly<Record<string, unknown>>> {
    return new Promise((resolve) => {
        const off = onUsageEvent((each, props) => {
            if (each === name) {
                off();
                resolve(props);
            }
        });
    });
}

/**
 * Drops files as the browser does, on the window. A synthetic DragEvent, the one exception to
 * real input here: a page cannot start a drag of a file from the operating system.
 * @param files - the files.
 */
function drop(...files: File[]): void {
    const dataTransfer = new DataTransfer();
    for (const file of files) {
        dataTransfer.items.add(file);
    }
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * The opened project's session, not the start page's own graph.
 * @returns it.
 */
function openedSession(): GraphSession {
    const session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    )?.session;
    if (session === undefined) {
        throw new Error("no opened element");
    }
    return session;
}

/**
 * Asserts neither recorder got any of the loads a reader's own opening sends.
 * @param why - what opened, for the message.
 */
function sentNoLoads(why: string): void {
    for (const name of LOAD_EVENTS) {
        assert.isEmpty(sent(name).posthog, `${name} from ${why}`);
        assert.isEmpty(sent(name).umami, `${name} from ${why}`);
    }
}

/**
 * Catches every download the page starts, by the anchor clicked with its object URL, saving nothing.
 * @returns the names downloaded, filled as they happen.
 */
function catchDownloads(): string[] {
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        if (this.download !== "") {
            names.push(this.download);
        }
    });
    return names;
}

describe("usage counts when a project opens", () => {
    beforeEach(async () => {
        await page.viewport(1440, 900);
        await forgetAutosave();
        sessionStorage.clear();
        localStorage.removeItem(SURVEYS_KEY);
        resetAnalyticsForTests();
        forgetSent();
        surveys = [];
        setAnalyticsCallsForTests({
            send: (body) => {
                umami.push(body);
                return undefined;
            },
            hostname: () => "graphty.app",
            privacySignals: () => ({ dnt: false, gpc: false }),
        });
        startPageCounts({ site: "production", features: [], analytics: { umamiWebsiteId: UMAMI } });
        undoPostHog = setPostHogClientForTests({
            getActiveMatchingSurveys: (callback) => {
                callback(surveys);
            },
            capture: (event, properties) => {
                posthog.push({ event, properties: { ...properties } });
                return undefined;
            },
        });
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await clearRecent();
        undoPostHog();
        resetAnalyticsForTests();
        setAnalyticsCallsForTests();
        localStorage.removeItem(VISITS);
        localStorage.removeItem(SURVEYS_KEY);
    });

    it("counts a network example opened from the start screen as that example, once", async () => {
        // NDEx answers from its recording; every other request goes out as usual.
        const replay = replayFetch(ndexRecordings);
        const realFetch = globalThis.fetch;
        vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
            const url = new URL(input instanceof Request ? input.url : input, location.href);
            return url.origin === NDEX ? replay(new Request(input, init)) : realFetch(input, init);
        });
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const tile = await screen.findByRole("button", { name: "Load network data: WikiPathways WP5483" });
        const loaded = next("sample_loaded");
        await openBy(store, () => userEvent.click(tile));
        assert.deepEqual({ ...(await loaded) }, { sample: "ndex-wp5483" });
        assert.deepEqual(sent("sample_loaded").umami, [{ sample: "ndex-wp5483" }]);
        assert.deepEqual(
            sent("sample_loaded").posthog.map(({ sample }) => sample),
            ["ndex-wp5483"],
        );
        assert.isEmpty(sent("own_file_opened").posthog, "a sample, not the reader's own file");
        assert.isEmpty(sent("graph_action").posthog, "the open's own writes are not the reader's");
    });

    it("sends no load, run or graph action when this tab's work comes back after a reload", async () => {
        const before = await openAutosaved("Les Miserables");
        const session = openedSession();
        // Work worth keeping: a run and a layer, so the restore brings back more than the data.
        await session.runs.start("degree", {});
        await session.styles.add({ name: "SECRET_LAYER", target: "node", selector: { match: "everything" }, set: {} });
        assert.lengthOf(sent("sample_loaded").posthog, 1, "the first open is counted");

        forgetSent();
        await reload(before);
        const restored = openedSession();
        // Not vacuous: the restore brought the data, the run and the layer back.
        assert.isAbove(restored.data.statistics().nodeCount, 0);
        assert.isNotEmpty(restored.runs.list(), "the run came back");
        assert.isTrue(
            restored.styles.list().some((layer) => layer.name === "SECRET_LAYER"),
            "the layer came back",
        );
        sentNoLoads("an autosave restore");
        assert.notInclude(JSON.stringify([umami, posthog]), "SECRET_LAYER");
    });

    it("sends no load when this tab's project is opened again because nothing of it was kept", async () => {
        const before = await openAutosaved("Les Miserables");
        // The tab's place names the project and how it was opened, but its kept work is gone,
        // as when a reload comes before autosave's first write lands.
        const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        await waitFor(() => {
            assert.isNotNull(element?.autosaver.status.entry ?? null);
        });
        before.view.unmount();
        await forgetAutosave();

        forgetSent();
        const store = createWorkspaceStore({ autosave: true });
        render(<Workspace store={store} />);
        const session = await openBy(store, () => Promise.resolve());
        // Not vacuous: the sample was read again, with nothing kept to restore it from.
        assert.isAbove(session.data.statistics().nodeCount, 0);
        assert.strictEqual(store.get().project?.name, "Les Miserables");
        sentNoLoads("opening this tab's project again");
    });

    it("counts a dropped graphty document that is not a project, on the start screen, once and with no graph actions", async () => {
        // A document holding a graph, a layer and a note, but no project session.
        const first = createWorkspaceStore();
        const view = render(<Workspace store={first} />);
        const saved = await openBy(first, () => pickSample("Les Miserables"));
        await saved.styles.add({
            name: "SECRET_DOC_LAYER",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        saved.notes.add({ targets: [{ graph: true }], text: "SECRET_DOC_NOTE" });
        const { text } = await saved.project.save();
        view.unmount();
        const parsed = JSON.parse(text) as { members: { kind: string }[] };
        const keep = new Set(["graphty-data", "graphty-style", "graphty-notes"]);
        const doc = { ...parsed, members: parsed.members.filter((member) => keep.has(member.kind)) };
        assert.isTrue(
            doc.members.some((member) => member.kind === "graphty-data"),
            `the document holds a graph (${parsed.members.map((member) => member.kind).join(", ")})`,
        );

        forgetSent();
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await screen.findByRole("button", { name: "New project" });
        const own = next("own_file_opened");
        drop(new File([JSON.stringify(doc)], "SECRET_DOC.graphty.json"));
        assert.deepEqual({ ...(await own) }, { format: "graphty", via: "file" });
        // Not vacuous: the document's graph is in (it is counted once the element's open returned).
        assert.isAbove(openedSession().data.statistics().nodeCount, 0);
        assert.deepEqual(sent("own_file_opened").umami, [{ format: "graphty", via: "file" }]);
        assert.lengthOf(sent("own_file_opened").posthog, 1);
        assert.isEmpty(sent("sample_loaded").posthog);
        assert.isEmpty(sent("graph_action").posthog, "the document's own entries are not the reader's");
        assert.notInclude(JSON.stringify({ umami, posthog }), "SECRET_DOC");
    });

    it("sends no export for the Export dialog's choices, and exactly one for one press of Export", async () => {
        const downloads = catchDownloads();
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await openBy(store, () => pickSample("Les Miserables"));
        forgetSent();

        await userEvent.keyboard("{Control>}e{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        const outputs = within(dialog).getByRole("grid", { name: "What to export" });
        // Choices: Project, then Data, then its format twice; none of them writes a file.
        await userEvent.click(within(outputs).getByText("Project"));
        await userEvent.click(within(outputs).getByText("Data"));
        for (const label of ["GML", "GraphML"]) {
            await userEvent.click(within(dialog).getByRole("combobox", { name: "Format" }));
            await userEvent.click(await screen.findByRole("option", { name: label }));
            await waitFor(() => {
                assert.notInclude(
                    within(dialog).getByLabelText("Preview of the exported data").textContent,
                    "Writing the preview",
                );
            });
        }
        assert.isEmpty(sent("export_done").posthog, "a choice is not an export");
        assert.isEmpty(sent("export_done").umami, "a choice is not an export");
        assert.isEmpty(downloads);

        const exported = next("export_done");
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        assert.deepEqual({ ...(await exported) }, { kind: "graph", format: "graphml", destination: "download" });
        await waitFor(() => {
            assert.lengthOf(downloads, 1);
        });
        assert.lengthOf(sent("export_done").posthog, 1);
        assert.deepEqual(sent("export_done").umami, [{ kind: "graph", format: "graphml", destination: "download" }]);
    });

    it("adds the reader's use case to PostHog events after the survey is answered, never before", async () => {
        surveys = [USE_CASE_SURVEY];
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const session = await openBy(store, () => pickSample("Les Miserables"));
        // A measure's first result is when the use case is asked.
        const ran = next("algorithm_run");
        await session.runs.start("degree", {});
        await ran;
        const card = await screen.findByRole("complementary", { name: "Survey" });
        const answeredAt = posthog.length;
        assert.isAbove(answeredAt, 0);

        await userEvent.click(within(card).getByRole("radio", { name: USE_CASE_CHOICES[2] }));
        await userEvent.click(within(card).getByRole("button", { name: "Send" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("complementary", { name: "Survey" }));
        });

        // A later event: a panel the reader opens from its button.
        const panel = next("panel_opened");
        await userEvent.click(screen.getByRole("button", { name: /^Settings/ }));
        await panel;

        const earlier = posthog.slice(0, answeredAt);
        const later = posthog.slice(answeredAt);
        for (const each of earlier) {
            assert.notProperty(each.properties, "use_case", `${each.event} before the answer`);
        }
        assert.isTrue(
            earlier.some((each) => each.event === "sample_loaded") &&
                earlier.some((each) => each.event === "algorithm_run"),
            "the earlier events were sent",
        );
        assert.isTrue(
            later.some((each) => each.event === "panel_opened"),
            "a later event was sent",
        );
        for (const each of later) {
            assert.strictEqual(each.properties.use_case, "make-a-figure-for-a-paper-or-talk", each.event);
        }
        // Umami never hears of the use case.
        assert.notInclude(JSON.stringify(umami), "use_case");
    });
});
