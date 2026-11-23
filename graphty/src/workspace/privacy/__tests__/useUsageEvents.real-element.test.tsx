/**
 * Usage counts from the REAL graphty-element (design/graphty/usage-analytics.md, sections 4.1 and
 * 4.2). graphty.app is the host through the analytics seam, and each PostHog mode is a recording
 * stand-in whose captures pass through `cleanPostHogEvent`. Each case
 * waits on the event that proves its work finished, then checks both recorders and that no
 * recorded payload carries the case's sentinels.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, JournalEntry } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import {
    APP_CALLER_KEY,
    onUsageEvent,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setPostHogClientForTests,
    startPageCounts,
} from "../../../lib/analytics";
import { withFeatures } from "../../../test/features";
import { openSampleFromStart } from "../../../test/open";
import { dragAcross, dragTo, wheelOver } from "../../../test/real-pointer";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { firstOnPage, type Recorded, recordInto, TEST_ANALYTICS } from "../../../test/usage-recorders";
import { clearRecent } from "../../project/recent";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "../../start/samples";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const VISITS = "graphty.visits.v1";

/** What the anonymous mode's stand-in recorded, after cleaning. */
const anonymous: Recorded[] = [];
/** What reached the PostHog stand-in, after cleaning. */
const posthog: { event: string; properties: Record<string, unknown> }[] = [];
let undoPostHog: () => void = () => undefined;

/**
 * The events of one name each recorder got.
 * @param name - the event name.
 * @returns the own properties of its first occurrence on the page (in either mode), and every
 * properties the shared mode's stand-in got.
 */
function sent(name: string): { counted: unknown[]; posthog: Record<string, unknown>[] } {
    return {
        counted: firstOnPage([...anonymous, ...posthog], name),
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
    const all = JSON.stringify({ anonymous, posthog });
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

// No experiments, in both test configurations.
withFeatures([]);

describe("usage counts from the real element", () => {
    beforeEach(async () => {
        // Wide enough that the canvas and its toolbar show beside the panels, as on a desktop.
        await page.viewport(1440, 900);
        resetAnalyticsForTests();
        anonymous.length = 0;
        posthog.length = 0;
        setAnalyticsCallsForTests({
            hostname: () => "graphty.app",
            privacySignals: () => ({ dnt: false, gpc: false }),
        });
        recordInto(anonymous, "anonymous");
        startPageCounts({ site: "production", features: [], analytics: TEST_ANALYTICS });
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

    it("never sends the app's own starting settings for a new project as a graph action", async () => {
        // From the start page: the workspace writes its starting choices into every project it
        // opens (a project it was handed at first render is left as its maker set it).
        render(<Workspace store={createWorkspaceStore()} />);
        await userEvent.click(await screen.findByRole("button", { name: "New project" }));
        const { session } = await projectElement();
        await waitFor(() => {
            assert.isTrue(session.config.startingRows, "the starting settings are in");
        });
        assert.notInclude(actionOps(), "config.set");
    });

    it("counts a start-screen sample tile as that sample, once, and nothing from the start page's graph", async () => {
        await openSampleFromStart("Les Miserables");
        // The open names the project in the element: the app's own write, not the reader's.
        const { session } = await projectElement();
        assert.strictEqual(session.config.name, "Les Miserables");
        assert.notInclude(actionOps(), "config.set");
        const loaded = sent("sample_loaded");
        // Les Miserables has 77 characters: the smallest size bucket.
        assert.deepEqual(loaded.counted, [{ sample: "les-miserables", size: "1-100" }]);
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
        assert.deepEqual({ ...(await opened) }, { format: "csv", via: "file", size: "1-100" });
        assert.deepEqual(sent("own_file_opened").counted, [{ format: "csv", via: "file", size: "1-100" }]);
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
        // Counted for every reader now, by its code and step alone.
        assert.deepEqual(sent("load_failed").counted, [{ code: props.code, task: props.task }]);
        sendsNone("SECRET_BAD", "SECRET_LABEL");
    });

    it("sends one load_failed for a file dropped on the start screen that cannot be read", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await screen.findByRole("button", { name: "New project" });
        drop(new File(['<graphml><node id="SECRET_LABEL"'], "SECRET_BAD.graphml"));
        // Settled: the refusal is shown and the start screen is back.
        await waitFor(() => {
            const { notice, project } = store.get();
            assert.isTrue(notice?.error, "the refusal is shown");
            assert.isNull(project);
        });
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
        assert.deepEqual(sent("algorithm_run").counted, [{ algorithm: "degree", outcome: "succeeded" }]);
        sendsNone("SECRET_GENES", "TP53");
    });

    it("sends a journaled change as a graph action by its op alone", async () => {
        const { session } = await loadedProject();
        const before = sent("graph_action").posthog.length;
        const action = next("graph_action");
        session.notes.add({ targets: [{ graph: true }], text: "SECRET_NOTE_TEXT" });
        const props = await action;
        assert.strictEqual(props.op, "note.add");
        assert.notProperty(props, "suggested");
        // What PostHog was handed, past cleanPostHogEvent: the one action, by its op.
        const [handed, ...more] = sent("graph_action").posthog.slice(before);
        assert.isEmpty(more);
        assert.strictEqual(handed?.op, "note.add");
        assert.notProperty(handed, "suggested");
        sendsNone("SECRET_GENES", "TP53", "SECRET_NOTE_TEXT");
    });

    it("counts the 2D and 3D switch as view_mode, not as a graph action", async () => {
        await loadedProject();
        const actionsBefore = actionOps().length;
        const switched = next("view_mode");
        await userEvent.click(
            within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Mode, 3D" }),
        );
        const menu = await screen.findByRole("menu", { name: /^Mode/ });
        await userEvent.click(within(menu).getByRole("menuitemradio", { name: /^2D/ }));
        assert.deepEqual({ ...(await switched) }, { mode: "2d" });
        assert.deepEqual(sent("view_mode").counted, [{ mode: "2d" }]);
        assert.lengthOf(actionOps(), actionsBefore, "no graph_action for the switch");
    });

    it("counts a view saved in the Views place as camera_saved, never its name", async () => {
        await loadedProject();
        await userEvent.click(
            within(screen.getByRole("toolbar", { name: "Places" })).getByRole("button", { name: "Views" }),
        );
        const place = await screen.findByRole("region", { name: "Views place" });
        const saved = next("camera_saved");
        await userEvent.click(within(place).getByRole("button", { name: "Save camera" }));
        assert.deepEqual({ ...(await saved) }, {});
        assert.deepEqual(sent("camera_saved").counted, [{}]);
        assert.notInclude(actionOps(), "view.save");
        sendsNone("SECRET_GENES");
    });

    it("sends one style_changed for one drag of a Style-sidebar slider", async () => {
        const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, inspected: null });
        render(<Workspace store={store} />);
        const { session } = await projectElement();
        await session.data.addNodes(Array.from({ length: 20 }, (_, i) => ({ id: `n${String(i)}`, score: i + 1 })));
        const layer = await session.styles.add({
            name: "SECRET_LAYER",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.score" } },
        });
        await session.styles.settled();
        // The layer's color ramp, opened from its value pill in the Style tab.
        store.set({ inspected: { kind: "layer-row", id: layer.id } });
        const tab = await screen.findByTestId("style-tab", {});
        const pill = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>(".cm-var-fill-button");
            assert.isNotNull(found);
            return found;
        });
        if (pill === null) {
            throw new Error("no value pill");
        }
        await userEvent.click(pill);
        const popover = await screen.findByRole("group", { name: "Color binding" });
        const handle = within(popover).getByRole("slider", { name: "Ramp end" });
        const track = within(popover).getByTestId("ramp-editor-track").getBoundingClientRect();

        const before = sent("style_changed").posthog.length;
        const updates: string[] = [];
        const off = session.on("journal:appended", ({ entry }) => {
            if (entry.command.op === "style.patch") {
                updates.push(entry.command.action);
            }
        });
        await dragTo(handle, { x: track.left + track.width * 0.5, y: track.top + track.height / 2 });
        await session.styles.settled();
        off();
        assert.isAbove(updates.length, 1, `the drag wrote the layer more than once (${updates.join(", ")})`);
        assert.deepEqual(
            sent("style_changed")
                .posthog.slice(before)
                .map(({ op, action }) => ({ op, action })),
            [{ op: "style.patch", action: "update" }],
            "one drag, one style edit",
        );
        sendsNone("SECRET_LAYER");
    });

    it("sends a later, separate edit of the same layer again, after other work in between", async () => {
        const { session } = await loadedProject();
        const layer = await session.styles.add({
            name: "SECRET_LAYER",
            selector: { match: "everything" },
            target: "node",
            set: { "node.color": "#0072b2" },
        });
        await session.styles.settled();
        const before = sent("style_changed").posthog.length;
        const actionsBefore = actionOps().length;
        const recolor = async (color: string): Promise<void> => {
            const changed = next("style_changed");
            await session.styles.update(layer.id, { set: { "node.color": color } });
            assert.deepEqual({ ...(await changed) }, { op: "style.patch", action: "update" });
        };
        await recolor("#d55e00");
        // A drag of a color: more updates of the same color merge into the one step, and send nothing more.
        await session.styles.update(layer.id, { set: { "node.color": "#cc79a7" } });
        await session.styles.update(layer.id, { set: { "node.color": "#f0e442" } });
        // Work that is no style edit, recorded by the element as a step of its own.
        await session.layout.set("circular");
        await recolor("#009e73");
        assert.deepEqual(
            sent("style_changed")
                .posthog.slice(before)
                .map(({ op, action }) => ({ op, action })),
            [
                { op: "style.patch", action: "update" },
                { op: "style.patch", action: "update" },
            ],
            "each separate recolor of the layer is its own style edit",
        );
        assert.lengthOf(actionOps(), actionsBefore, "style edits are no graph actions");
        sendsNone("SECRET_GENES", "TP53", "SECRET_LAYER");
    });

    it("never credits the assistant with a reader's command that recorded no step", async () => {
        const { session } = await loadedProject();
        // The newest step is the assistant's when the reader acts.
        await session.transaction("SECRET_TURN", (tx) => tx.config.set({ author: "SECRET_AUTHOR" }), {
            provenance: { via: "assistant" },
        });
        assert.strictEqual(session.history.steps.at(-1)?.provenance.via, "assistant");
        // 3D while already in 3D changes nothing and records no step, so it sends nothing; the
        // first view_mode after it is the 2D switch, the reader's own.
        const switched = next("view_mode");
        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        await userEvent.click(within(toolbar).getByRole("button", { name: "Mode, 3D" }));
        await userEvent.click(
            within(await screen.findByRole("menu", { name: /^Mode/ })).getByRole("menuitemradio", { name: /^3D/ }),
        );
        await userEvent.click(within(toolbar).getByRole("button", { name: "Mode, 3D" }));
        await userEvent.click(
            within(await screen.findByRole("menu", { name: /^Mode/ })).getByRole("menuitemradio", { name: /^2D/ }),
        );
        assert.deepEqual({ ...(await switched) }, { mode: "2d" });
        sendsNone("SECRET_TURN", "SECRET_AUTHOR");
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
        // The load's own settings steps (its knownFields write) carry the element's "load" trigger.
        for (const op of ["data.import", "data.import-source", "config.set"]) {
            assert.notInclude(ops, op);
        }
        // The load is counted once, as the reader's own file.
        assert.lengthOf(sent("own_file_opened").posthog, 1);

        // A settings write the app makes for itself is not the reader's; the same write from a
        // reader's control is.
        const before = actionOps().length;
        await session.transaction("App choice", (tx) => tx.config.set({ author: "App choice" }), {
            callerKey: APP_CALLER_KEY,
        });
        assert.lengthOf(actionOps(), before, "the app's own write sends nothing");
        const reader = next("graph_action");
        await session.config.set({ author: "Reader choice" });
        assert.strictEqual((await reader).op, "config.set");
        sendsNone("SECRET_GENES", "SECRET_PROJECT", "TP53");
    });

    it("sends the suggested styles a batch of runs releases as one suggested style edit", async () => {
        const { session } = await loadedProject();
        const suggested = new Promise<Readonly<Record<string, unknown>>>((resolve) => {
            const off = onUsageEvent((name, props) => {
                if (name === "style_changed" && props.suggested === true) {
                    off();
                    resolve(props);
                }
            });
        });
        // A batch holds its members' paint and releases it as entries of their own (trigger "suggestion").
        await session.runs.batch([{ algorithm: "degree" }, { algorithm: "betweenness" }]);
        const props = await suggested;
        assert.isString(props.op);
        assert.notProperty(props, "by");
        assert.lengthOf(
            sent("style_changed").posthog.filter((each) => each.suggested === true),
            1,
            "one gesture, one event",
        );
        assert.isEmpty(sent("graph_action").posthog.filter((each) => each.suggested === true));
    });

    it("never counts a project open's own entries as the reader's", async () => {
        const { session } = await loadedProject();
        const [first] = session.data.nodes();
        await session.positions.set([{ id: first.id, x: 1, y: 2, z: 0 }]);
        session.notes.add({ targets: [{ graph: true }], text: "SECRET_NOTE_TEXT" });
        await session.layout.setDimension("2d");
        await session.runs.start("degree", {});
        const { text } = await session.project.save();

        anonymous.length = 0;
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
        assert.isNotEmpty(session.runs.list(), "the project file holds a run");
        for (const name of [
            "graph_action",
            "style_changed",
            "view_mode",
            "own_file_opened",
            "sample_loaded",
            "nodes_dragged",
            "algorithm_run",
        ]) {
            assert.isEmpty(sent(name).posthog, `${name} from a project open`);
            assert.isEmpty(sent(name).counted, `${name} from a project open`);
        }
        sendsNone("SECRET_NOTE_TEXT", "SECRET_GENES");
    });

    it("counts a dropped graphty document that is not a project as one own file, and none of its entries", async () => {
        await loadedProject();
        const actionsBefore = actionOps().length;
        const style = {
            kind: "graphty-style",
            version: 1,
            layers: [{ name: "SECRET_STYLE_LAYER", selector: { match: "everything" }, set: { "node.size": 3 } }],
        };
        const own = next("own_file_opened");
        drop(new File([JSON.stringify(style)], "SECRET_STYLES.graphty.json"));
        const ownProps = { ...(await own) };
        assert.deepEqual(ownProps, { format: "graphty", via: "file", size: ownProps.size });
        assert.include(["1-100", "101-1k", "1k-10k", "10k+"], ownProps.size);
        await screen.findByText(/^Added SECRET_STYLES/);
        assert.lengthOf(actionOps(), actionsBefore, "the document's own entries are not the reader's actions");
        assert.lengthOf(sent("own_file_opened").posthog, 2, "the TSV and the document");
        sendsNone("SECRET_STYLE_LAYER");
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
            if (change.run.id === run.id && change.phase === "end" && change.trigger === "time-window") {
                reruns.push(change);
            }
        });
        await session.time.setSettings({ results: "rerun" });
        await session.time.window({ from: start + day, to: start + 2 * day });
        await waitFor(() => {
            assert.isNotEmpty(reruns, "the timeline re-ran the run");
        });
        off();
        assert.lengthOf(sent("algorithm_run").posthog, 1);
        assert.lengthOf(sent("algorithm_run").counted, 1);
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
        // PostHog only, by kind alone.
        assert.deepEqual(
            sent("canvas_selected").posthog.map(({ target, count, via }) => ({ target, count, via })),
            [{ target: "node", count: "1", via: "click" }],
        );
        assert.deepEqual(
            sent("camera_used").posthog.map(({ kind }) => ({ kind })),
            [{ kind: "zoom" }],
        );
        assert.isEmpty(sent("canvas_selected").counted);
        // Camera use is counted for every reader, its first gesture on the page.
        assert.deepEqual(sent("camera_used").counted, [{ kind: "zoom" }]);
        sendsNone("SECRET_GENES", "TP53");
    });

    it("counts a node drag, a canvas drag, Fit and Undo by kind and id alone", async () => {
        const { element } = await loadedProject();
        const canvas = canvasOf(element);
        await element.waitForSettled();
        await element.waitForStableFrame();
        const [first] = element.session.data.nodes();
        const at = await waitFor(() => {
            const position = element.nodeScreenPosition(first.id);
            assert.isTrue(position?.visible, "the node is drawn on screen");
            return { x: position?.x ?? 0, y: position?.y ?? 0 };
        });

        const dragged = next("nodes_dragged");
        await dragAcross(element, 60, at);
        await dragged;

        // Pressed on an empty corner of the canvas, away from every node.
        const moved = next("camera_used");
        await dragAcross(canvas, 80, { x: 8, y: 8 });
        assert.include(["orbit", "pan"], (await moved).kind);

        const fit = next("command_run");
        // Fit from the canvas menu, opened over an empty corner.
        await userEvent.click(canvas, { button: "right", position: { x: 8, y: 8 } });
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Fit(?! selection)/ }));
        assert.strictEqual((await fit).command, "view.fit");

        const actionsBefore = actionOps().length;
        const undo = next("command_run");
        await userEvent.click(screen.getByRole("button", { name: /^Undo/ }));
        assert.strictEqual((await undo).command, "history.undo");
        assert.lengthOf(actionOps(), actionsBefore, "an undo is not a new graph action");

        assert.lengthOf(sent("nodes_dragged").posthog, 1);
        assert.isEmpty(sent("nodes_dragged").counted);
        assert.lengthOf(sent("camera_used").counted, 1);
        sendsNone("SECRET_GENES", "TP53", String(first.id));
    });

    it("counts a layout chosen in the Layout form by its catalog id", async () => {
        await loadedProject();
        await userEvent.click(screen.getByRole("button", { name: "Layout" }));
        const popover = await screen.findByRole("dialog", { name: "Layout" });
        await userEvent.click(within(popover).getByRole("option", { name: /^Grid/ }));
        const changed = next("layout_changed");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        assert.deepEqual({ ...(await changed) }, { layout: "grid", outcome: "applied" });
        assert.deepEqual(sent("layout_changed").counted, [{ layout: "grid", outcome: "applied" }]);
    });

    it("counts each export pressed exactly once, by kind, format and destination only", async () => {
        const downloads = catchDownloads();
        const { session } = await loadedProject("SECRET_PROJECT");
        await session.views.save([{ name: "Overview" }]);

        // An image, from a camera's row menu in the Views place.
        await userEvent.click(
            within(screen.getByRole("toolbar", { name: "Places" })).getByRole("button", { name: "Views" }),
        );
        const place = await screen.findByRole("region", { name: "Views place" });
        await userEvent.click(within(place).getByRole("button", { name: "More for Overview" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Export image/ }));
        let dialog = await screen.findByRole("dialog", { name: "Export image" });
        await within(dialog).findByRole("img", {});
        const image = next("export_done");
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        assert.deepEqual({ ...(await image) }, { kind: "image", format: "png", destination: "download" });
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Export image" }));
        });

        // The project, from the Export dialog.
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

        // One event per file saved, in the shared mode; the first one is first on the page.
        assert.lengthOf(sent("export_done").posthog, downloads.length);
        assert.lengthOf(sent("export_done").counted, 1);
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
        const ownProps = { ...(await own) };
        assert.deepEqual(ownProps, { format: "graphty", via: "file", size: ownProps.size });
        assert.include(["1-100", "101-1k", "1k-10k", "10k+"], ownProps.size);
        await projectElement();

        // Kept in this browser under a name, then reopened from Recent projects: "browser", where it is kept.
        await userEvent.keyboard("{Control>}s{/Control}");
        const save = await screen.findByRole("dialog", { name: /^Save .* as$/ });
        await userEvent.clear(within(save).getByRole("textbox", { name: "Name" }));
        const kept = next("project_saved");
        await userEvent.type(within(save).getByRole("textbox", { name: "Name" }), "SECRET_SAVED");
        // Enter submits only once Save is enabled (with save files version 2 on, after graphty-element's verdict).
        await waitFor(() => {
            assert.isFalse(within(save).getByRole<HTMLButtonElement>("button", { name: "Save" }).disabled);
        });
        await userEvent.keyboard("{Enter}");
        assert.deepEqual({ ...(await kept) }, { kind: "browser", as: "new" });
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });
        // The save has finished (its notice comes last, after the browser's list is read again):
        // only then can the browser refuse the next one.
        await screen.findAllByText(/^Saved SECRET_SAVED in this browser/);
        // A Save the browser refuses sends nothing.
        const refusedSaves: string[] = [];
        const offSaves = onUsageEvent((name) => {
            if (name === "project_saved") {
                refusedSaves.push(name);
            }
        });
        vi.stubGlobal("indexedDB", undefined);
        await userEvent.keyboard("{Control>}s{/Control}");
        await screen.findAllByText(/could not be saved/);
        vi.unstubAllGlobals();
        offSaves();
        assert.isEmpty(refusedSaves, "a refused Save is no save");
        // A later Save writes the same record again.
        const again = next("project_saved");
        await userEvent.keyboard("{Control>}s{/Control}");
        assert.deepEqual({ ...(await again) }, { kind: "browser", as: "again" });
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Back to start" }));
        const recent = await screen.findByRole("gridcell", { name: /^SECRET_SAVED/ });
        const panelsBefore = sent("panel_opened").posthog.length;
        const actionsBefore = actionOps().length;
        const reopened = next("project_reopened");
        await userEvent.click(recent);
        await reopened;
        await projectElement();
        // The reopen's own writes (its members, the project's name) are not the reader's actions.
        assert.notInclude(actionOps().slice(actionsBefore), "config.set");
        // The open set the place and page itself: no panel the reader opened.
        assert.lengthOf(sent("panel_opened").posthog, panelsBefore);
        assert.deepEqual(sent("project_reopened").counted, [{ from: "browser" }]);
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
        // Shared mode only: commands and panels are never counted for the whole audience.
        assert.isEmpty(sent("command_run").counted);
        assert.isEmpty(sent("panel_opened").counted);
        sendsNone("Untitled");
    });
});
