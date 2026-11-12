/**
 * What the LargeGraph*.real-element.test.tsx files share: the workspace on a generated graph (graph-samples'
 * LFR benchmark, about 5,000 communities at 50,000 nodes) on the REAL graphty-element, and the readers
 * of the selection editor they drive by real clicks and keys.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import { assert } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The generated graph's size. */
const NODES = 50_000;

/**
 * The graph's size in the tests that wait for whole repaints: large enough that a repaint spans its
 * full 32 frames, while on software rendering three of them stay well inside the test guard.
 */
export const REPAINTED_NODES = 20_000;

/**
 * The workspace on a generated graph whose `community` column is a category.
 * @param nodes - How many nodes it has.
 * @returns The session.
 */
export async function openGenerated(nodes = NODES): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.generate("lfr", {
        n: nodes,
        minDegree: 2,
        maxDegree: 8,
        degreeExponent: 2.5,
        minCommunity: 5,
        maxCommunity: 15,
        communityExponent: 1.5,
        mixing: 0.1,
        seed: 1,
    });
    await session.data.setType({ kind: "node", name: "community" }, "category");
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    // A drawing that settles: the force layout on 50,000 nodes runs for minutes at seconds a frame
    // on software rendering, which starves every input, and "Drawing" ends only once painted.
    await session.layout.set("random");
    return session;
}

/** What a layer paints unless a test says otherwise. */
const OUTLINED: Layer["set"] = { "node.color": "#d55e00" };

/**
 * A layer on a selection, selected in the style tree: its outline is drawn.
 * @param session - The session.
 * @param name - Its name.
 * @param rule - Its selection.
 * @param set - What it paints.
 * @returns The layer.
 */
export async function openLayer(
    session: GraphSession,
    name: string,
    rule: UnionLeaf,
    set: Layer["set"] = OUTLINED,
): Promise<Layer> {
    const layer = await session.styles.add({
        name,
        target: "node",
        selector: { match: "rule", where: rule },
        set,
    });
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-editor"));
    });
    return layer;
}

/**
 * One step from All nodes.
 * @param id - the step's id.
 * @param stepRule - its rule.
 * @returns the selection.
 */
export const oneStep = (id: string, stepRule: UnionLeaf["branches"][number]["steps"][number]["rule"]): UnionLeaf => ({
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [{ start: "all", steps: [{ id, op: "keep", rule: stepRule }] }],
});

/**
 * Selects a step's row by a click, so its pane is drawn.
 * @param id - the step's id.
 */
export async function selectStep(id: string): Promise<void> {
    const row = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(`[data-row="${id}"]`);
        assert.isNotNull(found);
        return found;
    });
    await userEvent.click(row?.querySelector(".sel-value") ?? document.body);
    await waitFor(() => {
        assert.isNotNull(document.querySelector(`[data-step-pane="${id}"]`));
    });
}

/**
 * The open reference list's options, and its group headings.
 * @returns their words.
 */
export function listed(): { options: string[]; headings: string[] } {
    const list = document.querySelector<HTMLElement>('[role=listbox][aria-label="References"]');
    return {
        options: [...(list?.querySelectorAll<HTMLElement>("[role=option]") ?? [])].map(
            (each) => each.textContent ?? "",
        ),
        headings: [...(list?.querySelectorAll<HTMLElement>(".cm-listbox-group-label") ?? [])].map(
            (each) => each.textContent ?? "",
        ),
    };
}

/** What the first frame after an input drew. */
interface FirstFrame {
    /** The workspace header says "Drawing". */
    readonly drawing: boolean;
    /** The workspace header's count, or null with no workspace open. */
    readonly count: string | null;
    /** graphty-element draws the workspace's branches view. */
    readonly showing: boolean;
    /** Milliseconds from the input to that frame, for the failure message. */
    readonly after: number;
}

/**
 * Does an input and reads what the first animation frame after it drew: the frame the browser
 * paints once the input's own task is done.
 * @param session - The session.
 * @param input - The input, by real pointer or keys.
 * @returns What that frame drew.
 */
export async function firstFrameAfter(session: GraphSession, input: () => Promise<void>): Promise<FirstFrame> {
    let at = -1;
    const arm = (): void => {
        if (at < 0) {
            at = performance.now();
        }
    };
    globalThis.addEventListener("pointerdown", arm, { capture: true });
    globalThis.addEventListener("keydown", arm, { capture: true });
    const seen = new Promise<FirstFrame>((resolve) => {
        const look = (now: number): void => {
            if (at < 0) {
                requestAnimationFrame(look);
                return;
            }
            const head = document.querySelector(".sel-ws-head");
            resolve({
                drawing: head?.querySelector("[data-drawing]") !== null && head !== null,
                count: head?.querySelector(".sel-count")?.textContent ?? null,
                showing: session.styles.showingBranches,
                after: now - at,
            });
        };
        requestAnimationFrame(look);
    });
    await input();
    const frame = await seen;
    globalThis.removeEventListener("pointerdown", arm, { capture: true });
    globalThis.removeEventListener("keydown", arm, { capture: true });
    return frame;
}

/** What the frames from an input to the workspace's closing drew. */
interface Closing {
    /** Frames drawn with the workspace open but no "Drawing" in its header. */
    readonly quiet: number;
    /** Frames drawn with the workspace open. */
    readonly open: number;
    /** The canvas held its finished picture in the frame the workspace was gone from. */
    readonly paintedAtClose: boolean;
}

/**
 * Does an input that closes the workspace and reads every animation frame until it is gone: whether
 * each frame with it open said "Drawing", and whether graphty-element had painted the result by the
 * frame it closed (a wait started then ends before the next frame).
 * @param input - The input, by real pointer or keys.
 * @returns What those frames drew.
 */
export async function framesUntilClosed(input: () => Promise<void>): Promise<Closing> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the element is drawn");
    }
    let quiet = 0;
    let open = 0;
    // Counted from the frame the input lands in (its click or key), not from when the driver was
    // asked to send it: the frames before the input arrives are not the editor's to fill.
    let armed = false;
    const arm = (): void => {
        armed = true;
    };
    globalThis.addEventListener("click", arm, { capture: true });
    globalThis.addEventListener("keydown", arm, { capture: true });
    const closed = new Promise<boolean>((resolve) => {
        const look = (): void => {
            if (!armed) {
                requestAnimationFrame(look);
                return;
            }
            if (document.querySelector(".sel-ws") === null) {
                let painted = false;
                void element.waitForPainted().then(() => {
                    painted = true;
                });
                requestAnimationFrame(() => {
                    resolve(painted);
                });
                return;
            }
            open++;
            if (document.querySelector(".sel-ws-head [data-drawing]") === null) {
                quiet++;
            }
            requestAnimationFrame(look);
        };
        requestAnimationFrame(look);
    });
    await input();
    const paintedAtClose = await closed;
    globalThis.removeEventListener("click", arm, { capture: true });
    globalThis.removeEventListener("keydown", arm, { capture: true });
    return { quiet, open, paintedAtClose };
}
