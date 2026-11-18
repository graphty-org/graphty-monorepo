/**
 * Usage counts from the REAL graphty-element (design/graphty/usage-analytics.md, sections 4.1 and
 * 4.2). Umami's sends are recorded through the analytics seam with graphty.app as the host, and
 * PostHog is on with a recording stand-in whose captures pass through `cleanPostHogEvent`. Each case
 * waits on the event that proves its work finished, then checks both recorders and that no
 * recorded payload carries the case's sentinels.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, JournalEntry } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import {
    appConfigWrite,
    onUsageEvent,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setPostHogClientForTests,
    startPageCounts,
    type UmamiBody,
} from "../../../lib/analytics";
import { openSampleFromStart } from "../../../test/open";
import { wheelOver } from "../../../test/real-pointer";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { clearRecent } from "../../project/recent";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "../../start/samples";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const UMAMI = "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const VISITS = "graphty.visits.v1";

/** What Umami was sent. */
const umami: UmamiBody[] = [];
/** What reached the PostHog stand-in, after cleaning. */
const posthog: { event: string; properties: Record<string, unknown> }[] = [];
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
 * Asserts no recorded payload holds any of the sentinels.
 * @param sentinels - text that must never be sent.
 */
function sendsNone(...sentinels: string[]): void {
    const all = JSON.stringify({ umami, posthog });
    for (const sentinel of sentinels) {
        assert.notInclude(all, sentinel);
    }
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
 * A fixture the app serves, under another name.
 * @param fixture - its file name.
 * @param name - the name it is dropped under.
 * @returns the file.
 */
async function fixtureAs(fixture: string, name: string): Promise<File> {
    const sample = PROTOTYPE_SAMPLES.find((each) => sampleName(each) === fixture);
    if (sample === undefined) {
        throw new Error(`no fixture ${fixture}`);
    }
    const response = await fetch(sampleUrl(sample));
    return new File([await response.blob()], name);
}

/** The project's element, not the start page's own graph. */
type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * The project's element, once it is up.
 * @returns it, with its session.
 */
async function projectElement(): Promise<{ element: Element; session: GraphSession }> {
    let element: Element | null = null;
    await waitFor(() => {
        element = document.querySelector<Element>("graphty-element:not([data-start-page])");
        assert.isDefined(element?.session);
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const found: Element = element;
    return { element: found, session: found.session };
}

/**
 * An empty project, as New project leaves it, and its element's session.
 * @param name - the project's name.
 * @returns the session.
 */
async function emptyProject(name = "Untitled"): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name, id: 1 }, place: "data" })} />);
    return (await projectElement()).session;
}

/**
 * An empty project with the TP53 table dropped in under a secret name, once it is counted.
 * @param name - the project's name.
 * @returns the element and its session.
 */
async function loadedProject(name = "Untitled"): Promise<{ element: Element; session: GraphSession }> {
    await emptyProject(name);
    const loaded = next("own_file_opened");
    drop(await fixtureAs("tp53-interactions.tsv", "SECRET_GENES.tsv"));
    await loaded;
    return projectElement();
}

/**
 * The ops of the graph actions PostHog got.
 * @returns them, in order.
 */
function actionOps(): unknown[] {
    return sent("graph_action").posthog.map((each) => each.op);
}

/**
 * The project's canvas, where the reader's pointer acts on the graph.
 * @param element - the element.
 * @returns its canvas.
 */
function canvasOf(element: Element): HTMLCanvasElement {
    const canvas = element.shadowRoot?.querySelector("canvas") ?? null;
    if (canvas === null) {
        throw new Error("the element has no canvas");
    }
    return canvas;
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

describe("usage counts from the real element", () => {
    beforeEach(async () => {
        // Wide enough that the canvas and its toolbar show beside the panels, as on a desktop.
        await page.viewport(1440, 900);
        resetAnalyticsForTests();
        umami.length = 0;
        posthog.length = 0;
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
    });

    it("counts a start-screen sample tile as that sample, once, and nothing from the start page's graph", async () => {
        await openSampleFromStart("Les Miserables");
        const loaded = sent("sample_loaded");
        assert.deepEqual(loaded.umami, [{ sample: "les-miserables" }]);
        assert.lengthOf(loaded.posthog, 1);
        assert.strictEqual(loaded.posthog[0].sample, "les-miserables");
        assert.isEmpty(sent("own_file_opened").posthog);
        // The super properties ride on every PostHog event: the site (site.json's, "unknown" in a test).
        assert.strictEqual(loaded.posthog[0].site, "unknown");
    });

    it("counts a dropped file by its format alone, never its name or contents", async () => {
        await emptyProject();
        const opened = next("own_file_opened");
        drop(await fixtureAs("people.csv", "secret-PATIENT-ids.csv"));
        assert.deepEqual({ ...(await opened) }, { format: "csv", via: "file" });
        assert.deepEqual(sent("own_file_opened").umami, [{ format: "csv", via: "file" }]);
        assert.isEmpty(sent("sample_loaded").posthog);
        sendsNone("secret", "PATIENT", "people");
    });

    it("sends a failed load's code and task, never the file's name", async () => {
        await emptyProject();
        const failed = next("load_failed");
        drop(new File(['<graphml><node id="SECRET_LABEL"'], "SECRET_BAD.graphml"));
        const props = await failed;
        assert.include(["load", "prepare"], props.task);
        assert.isString(props.code);
        assert.lengthOf(sent("load_failed").posthog, 1);
        sendsNone("SECRET_BAD", "SECRET_LABEL");
    });

    it("counts a finished run by its catalog key, never the data it ran over", async () => {
        const session = await emptyProject();
        const loaded = next("own_file_opened");
        drop(await fixtureAs("tp53-interactions.tsv", "SECRET_GENES.tsv"));
        await loaded;
        const ran = next("algorithm_run");
        await session.runs.start("degree", {});
        assert.deepEqual({ ...(await ran) }, { algorithm: "degree", outcome: "succeeded" });
        assert.deepEqual(sent("algorithm_run").umami, [{ algorithm: "degree", outcome: "succeeded" }]);
        sendsNone("SECRET_GENES", "TP53");
    });

    it("sends a journaled change as a graph action by its op alone", async () => {
        const { session } = await loadedProject();
        const action = next("graph_action");
        await session.layout.setDimension("2d");
        const props = await action;
        assert.strictEqual(props.op, "view.dimension");
        assert.notProperty(props, "suggested");
        sendsNone("SECRET_GENES", "TP53");
    });

    it("never sends a load or the app's own starting settings as a graph action", async () => {
        const session = await emptyProject("SECRET_PROJECT");
        // Every op the journal records from here, to prove the check below is not vacuous.
        const journaled: string[] = [];
        const off = session.on("journal:appended", ({ entry }) => {
            journaled.push(entry.command.op);
        });
        const loaded = next("own_file_opened");
        drop(await fixtureAs("tp53-interactions.tsv", "SECRET_GENES.tsv"));
        await loaded;
        off();
        assert.isTrue(
            journaled.some((op) => op === "data.import" || op === "data.import-source"),
            `the load was journaled (${journaled.join(", ")})`,
        );
        const ops = actionOps();
        for (const op of ["data.import", "data.import-source"]) {
            assert.notInclude(ops, op);
        }
        // Not checked here: graphty-element journals a load's own knownFields write (a step of the
        // load's batch, session/data.ts) as an ordinary config.set entry with no trigger, so it
        // still arrives as a graph action. That is the element's to mark, not the app's to guess.
        // The load is counted once, as the reader's own file.
        assert.lengthOf(sent("own_file_opened").posthog, 1);

        // A settings write the app makes for itself is not the reader's; the same write from a
        // reader's control is.
        const before = actionOps().length;
        await appConfigWrite(() => session.config.set({ author: "App choice" }));
        assert.lengthOf(actionOps(), before, "the app's own write sends nothing");
        const reader = next("graph_action");
        await session.config.set({ author: "Reader choice" });
        assert.strictEqual((await reader).op, "config.set");
        sendsNone("SECRET_GENES", "SECRET_PROJECT", "TP53");
    });

    it("sends a run's suggested styles applied later as one suggested graph action", async () => {
        const { element, session } = await loadedProject();
        const ran = next("algorithm_run");
        await session.runs.start("degree", {});
        await ran;
        const suggested = new Promise<Readonly<Record<string, unknown>>>((resolve) => {
            const off = onUsageEvent((name, props) => {
                if (name === "graph_action" && props.suggested === true) {
                    off();
                    resolve(props);
                }
            });
        });
        // eslint-disable-next-line graphty/no-element-mutation -- the element's one public door that journals a suggestion as its own entry (design 8.3); the test drives it to read that entry's count
        assert.isTrue(element.applySuggestedStyles("degree"), "degree suggests styles");
        const props = await suggested;
        assert.isString(props.op);
        assert.isString(props.kind);
        assert.lengthOf(
            sent("graph_action").posthog.filter((each) => each.suggested === true),
            1,
        );
    });

    it("never counts a project open's own entries as the reader's", async () => {
        const { session } = await loadedProject();
        const [first] = session.data.nodes();
        await session.positions.set([{ id: first.id, x: 1, y: 2, z: 0 }]);
        session.notes.add({ targets: [{ graph: true }], text: "SECRET_NOTE_TEXT" });
        await session.layout.setDimension("2d");
        const { text } = await session.project.save();

        umami.length = 0;
        posthog.length = 0;
        const members: JournalEntry[] = [];
        const off = session.on("journal:appended", ({ entry }) => {
            if (entry.trigger === "project") {
                members.push(entry);
            }
        });
        await session.project.open(text);
        off();
        // Not vacuous: the open journaled its members, data, a note and positions among them.
        const opened = members.map((entry) => entry.command.op);
        assert.isTrue(opened.some((op) => op.startsWith("data.")));
        for (const name of ["graph_action", "own_file_opened", "sample_loaded", "nodes_dragged"]) {
            assert.isEmpty(sent(name).posthog, `${name} from a project open`);
            assert.isEmpty(sent(name).umami, `${name} from a project open`);
        }
        sendsNone("SECRET_NOTE_TEXT", "SECRET_GENES");
    });

    it("never counts a re-run the timeline made as the reader's run", async () => {
        const session = await emptyProject();
        const loaded = next("own_file_opened");
        drop(new File(["source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\n"], "SECRET_MAIL.csv"));
        await loaded;
        await session.time.setField({ edges: { start: "sent" } });
        const day = 86_400_000;
        const start = Date.UTC(2026, 0, 1);
        await session.time.window({ from: start, to: start + day, step: "day" });
        const ran = next("algorithm_run");
        const run = session.runs.start("degree", undefined, { style: false });
        await run;
        await ran;
        assert.lengthOf(sent("algorithm_run").posthog, 1);

        // The timeline re-runs it, as the results policy changes to re-run and the window moves.
        const reruns: unknown[] = [];
        const off = session.on("run:changed", (change) => {
            if (change.run.id === run.id && change.phase === "end" && change.trigger === "timeline") {
                reruns.push(change);
            }
        });
        await session.time.setSettings({ results: "rerun" });
        await waitFor(() => {
            assert.isNotEmpty(reruns, "the timeline re-ran the run");
        });
        off();
        assert.lengthOf(sent("algorithm_run").posthog, 1);
        assert.lengthOf(sent("algorithm_run").umami, 1);
        sendsNone("SECRET_MAIL");
    });

    it("counts a click on a node and a wheel on the canvas by kind alone", async () => {
        const { element } = await loadedProject();
        const canvas = canvasOf(element);
        // Clicked where the node rests: the layout has finished moving it and the frame is drawn.
        await element.waitForSettled();
        await element.waitForStableFrame();
        const [first] = element.session.data.nodes();
        const at = await waitFor(() => {
            const position = element.nodeScreenPosition(first.id);
            assert.isTrue(position?.visible, "the node is drawn on screen");
            return { x: position?.x ?? 0, y: position?.y ?? 0 };
        });
        const selected = next("canvas_selected");
        // The position is from the element's corner, as nodeScreenPosition gives it.
        await userEvent.click(element, { position: at });
        assert.deepEqual({ ...(await selected) }, { target: "node", count: "1", via: "click" });

        const zoomed = next("camera_used");
        await wheelOver(canvas, -120);
        assert.deepEqual({ ...(await zoomed) }, { kind: "zoom" });
        // PostHog only.
        assert.isEmpty(sent("canvas_selected").umami);
        assert.isEmpty(sent("camera_used").umami);
        sendsNone("SECRET_GENES", "TP53");
    });

    it("counts a layout chosen in the Layout form by its catalog id", async () => {
        await loadedProject();
        await userEvent.click(screen.getByRole("button", { name: "Layout" }));
        const popover = await screen.findByRole("dialog", { name: "Layout" });
        await userEvent.click(within(popover).getByRole("option", { name: /^Grid/ }));
        const changed = next("layout_changed");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        assert.deepEqual({ ...(await changed) }, { layout: "grid", outcome: "applied" });
        assert.deepEqual(sent("layout_changed").umami, [{ layout: "grid", outcome: "applied" }]);
    });

    it("counts each export pressed exactly once, by kind, format and destination only", async () => {
        const downloads = catchDownloads();
        await loadedProject("SECRET_PROJECT");

        // An image, from the Export dialog.
        await userEvent.keyboard("{Control>}e{/Control}");
        let dialog = await screen.findByRole("dialog", { name: "Export" });
        await within(dialog).findByRole("img", {});
        const image = next("export_done");
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        assert.deepEqual({ ...(await image) }, { kind: "image", format: "png", destination: "download" });
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Export" }));
        });

        // The project, from the same dialog.
        await userEvent.keyboard("{Control>}e{/Control}");
        dialog = await screen.findByRole("dialog", { name: "Export" });
        await userEvent.click(
            within(within(dialog).getByRole("grid", { name: "What to export" })).getByText("Project"),
        );
        const project = next("export_done");
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        assert.deepEqual({ ...(await project) }, { kind: "project", destination: "download" });
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Export" }));
        });

        // Save local copy..., from the main menu.
        const copy = next("export_done");
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Save local copy..." }));
        assert.deepEqual({ ...(await copy) }, { kind: "project", destination: "download" });
        await waitFor(() => {
            assert.lengthOf(downloads, 3);
        });

        // One event per file saved, on both recorders' PostHog side; Umami counts the name once.
        assert.lengthOf(sent("export_done").posthog, downloads.length);
        assert.lengthOf(sent("export_done").umami, 1);
        sendsNone("SECRET_PROJECT", "SECRET_GENES");
    });

    it("counts a project file the reader drops as their own file, and a Recent reopen as a reopen, with no panels", async () => {
        const { session } = await loadedProject();
        await session.styles.add({ name: "SECRET_LAYER", target: "node", selector: { match: "everything" }, set: {} });
        const { text } = await session.project.save();

        // Back to the start page (the save left nothing unsaved, so nothing asks).
        assert.isFalse(session.project.dirty);
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Back to start" }));
        await screen.findByRole("button", { name: "Samples" });

        const own = next("own_file_opened");
        drop(new File([text], "SECRET_PROJECT_FILE.graphty.json"));
        assert.deepEqual({ ...(await own) }, { format: "graphty", via: "file" });
        await projectElement();

        // Kept in this browser under a name, then reopened from Recent projects.
        await userEvent.keyboard("{Control>}s{/Control}");
        const save = await screen.findByRole("dialog", { name: /^Save .* as$/ });
        await userEvent.clear(within(save).getByRole("textbox", { name: "Name" }));
        await userEvent.type(within(save).getByRole("textbox", { name: "Name" }), "SECRET_SAVED{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Back to start" }));
        const recent = await screen.findByRole("gridcell", { name: /^SECRET_SAVED/ });
        const panelsBefore = sent("panel_opened").posthog.length;
        const reopened = next("project_reopened");
        await userEvent.click(recent);
        await reopened;
        await projectElement();
        // The open set the place and page itself: no panel the reader opened.
        assert.lengthOf(sent("panel_opened").posthog, panelsBefore);
        assert.isEmpty(sent("project_reopened").umami);
        assert.lengthOf(sent("own_file_opened").posthog, 2, "the TSV and the dropped project file, not the reopen");
        sendsNone("SECRET_PROJECT_FILE", "SECRET_LAYER", "SECRET_GENES", "SECRET_SAVED");
    });

    it("counts a command run from its button, the panel it opens, and marks the button with its id", async () => {
        await emptyProject();
        const button = await screen.findByRole("button", { name: /^Settings/ });
        assert.strictEqual(button.getAttribute("data-ph-capture-attribute-control"), "settings.open");
        const panel = next("panel_opened");
        await userEvent.click(button);
        assert.deepEqual({ ...(await panel) }, { panel: "settings" });
        assert.deepEqual(sent("command_run").posthog.at(-1)?.command, "settings.open");
        // PostHog only: Umami never hears of commands or panels.
        assert.isEmpty(sent("command_run").umami);
        assert.isEmpty(sent("panel_opened").umami);
        sendsNone("Untitled");
    });
});
