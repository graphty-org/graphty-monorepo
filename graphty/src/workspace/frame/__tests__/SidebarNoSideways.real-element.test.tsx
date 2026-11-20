/**
 * The side panels never scroll sideways, on the REAL graphty-element, driven by a real touchpad-like wheel
 * (deltaX and deltaY together, through the DevTools protocol, so the browser's own input pipeline scrolls):
 * the left panel on Graph, Data and Notes, the inspector's Style tab (Node and Edge) with every "+" thing added
 * and a label pop-over open, its Values tab and Graph settings, at a wide and a narrow window, and with the
 * inspector dragged from wide to its minimum width by its resize handle. Each wheel may move a panel up and down; nothing moves sideways, the page does not scroll,
 * and html and body stop the trackpad's sideways swipe from going back a page.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
import { showKind } from "../../style/__tests__/kindTab";
import { openStyle } from "../../style/__tests__/v2Harness";
import { Workspace } from "../../Workspace";

/** The window sizes walked: a wide desktop and a narrow one, both above the phone layout (720 px). */
const SIZES = [
    [1440, 900],
    [768, 900],
] as const;

/**
 * Fields (by their line) whose text a swipe slides sideways: Chrome scrolls an input's overflowing text under a
 * sideways wheel, and CSS cannot stop it (overflow and text-overflow leave it scrolling). compact-mantine's
 * Select shows its value in an input; a value wider than its field slides (issue #9145). A known-gaps list:
 * it may only shrink.
 */
const KNOWN_SIDEWAYS_FIELDS: readonly string[] = ["edge.supportModel"];

/**
 * Where a swipe over an element lands, in the test page.
 * @param element - the element.
 * @returns x and y.
 */
function pointOf(element: Element): [number, number] {
    const box = element.getBoundingClientRect();
    return [box.left + box.width / 2, box.top + Math.min(box.height / 2, 200)];
}

/**
 * Maps a point in the test page to the top page the DevTools protocol's input lands in: the test page is an
 * iframe of the runner's page, possibly scaled.
 * @param x - x in the test page.
 * @param y - y in the test page.
 * @returns x and y in the top page.
 */
function topPoint(x: number, y: number): [number, number] {
    for (
        let frame = window.frameElement;
        frame !== null;
        frame = frame.ownerDocument.defaultView?.frameElement ?? null
    ) {
        const outer = frame.getBoundingClientRect();
        const scale = outer.width / ((frame as HTMLIFrameElement).contentWindow?.innerWidth ?? outer.width);
        x = outer.left + x * scale;
        y = outer.top + y * scale;
    }
    return [x, y];
}

/**
 * Sends one mouse event through the DevTools protocol, so the browser's own input pipeline handles it.
 * @param params - the event's parameters, in top-page coordinates.
 */
async function mouse(params: object): Promise<void> {
    await (cdp() as unknown as { send: (method: string, params: object) => Promise<unknown> }).send(
        "Input.dispatchMouseEvent",
        params,
    );
}

/**
 * Turns a touchpad-like wheel over the middle of an element, through the DevTools protocol.
 * @param element - the element.
 */
async function swipeOver(element: Element): Promise<void> {
    const [x, y] = topPoint(...pointOf(element));
    await mouse({ type: "mouseWheel", x, y, deltaX: 40, deltaY: 30 });
}

/**
 * Drags the inspector's resize handle with the mouse until the inspector is at its minimum width.
 */
async function dragInspectorToMinimum(): Promise<void> {
    const handle = screen.getByRole("separator", { name: "Resize inspector" });
    const box = handle.getBoundingClientRect();
    const [x, y] = topPoint(box.left + box.width / 2, box.top + box.height / 2);
    // The handle sits on the inspector's left edge: moving it right narrows the inspector.
    await mouse({ type: "mouseMoved", x, y });
    await mouse({ type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
    for (let step = 1; step <= 10; step++) {
        await mouse({ type: "mouseMoved", x: x + step * 40, y, button: "left", buttons: 1 });
    }
    await mouse({ type: "mouseReleased", x: x + 400, y, button: "left", buttons: 0, clickCount: 1 });
    await waitFor(() => {
        assert.strictEqual(handle.getAttribute("aria-valuenow"), handle.getAttribute("aria-valuemin"));
        assert.strictEqual(inspector().getBoundingClientRect().width, Number(handle.getAttribute("aria-valuemin")));
    });
}

/**
 * Every element under a root that scrolls up and down.
 * @param root - the root.
 * @returns the scrollers.
 */
function scrollers(root: Element): HTMLElement[] {
    return [root, ...root.querySelectorAll("*")].filter((each): each is HTMLElement => {
        if (!(each instanceof HTMLElement)) {
            return false;
        }
        const { overflowY } = getComputedStyle(each);
        return overflowY === "auto" || overflowY === "scroll";
    });
}

/**
 * Swipes over a region several times and checks that nothing moved sideways and that the region's scroller
 * moved down when it has room to.
 * @param region - the panel region (the left panel, the inspector or a pop-over).
 * @param where - what the region shows, for messages.
 */
async function swipeAndCheck(region: HTMLElement, where: string): Promise<void> {
    const { left } = region.getBoundingClientRect();
    const scrolling = scrollers(region);
    const before = scrolling.map((each) => each.scrollTop);
    for (let swipe = 0; swipe < 3; swipe++) {
        await swipeOver(region);
    }
    // The wheel scrolls the innermost scroller under the pointer that has room to move down.
    const under = document.elementFromPoint(...pointOf(region));
    const target = scrolling
        .filter((each) => each.contains(under) && each.scrollHeight - each.clientHeight - each.scrollTop > 30)
        .at(-1);
    if (target !== undefined) {
        const at = scrolling.indexOf(target);
        await waitFor(() => {
            assert.isAbove(target.scrollTop, before[at], `${where}: the panel moved down`);
        });
    }
    const moved = [region, ...region.querySelectorAll("*")].filter((each) => each.scrollLeft !== 0);
    const isField = (each: Element): boolean => each instanceof HTMLInputElement || each instanceof HTMLTextAreaElement;
    assert.deepEqual(
        moved.filter((each) => !isField(each)).map((each) => `${each.tagName}.${each.className}`),
        [],
        `${where}: nothing scrolled sideways`,
    );
    const fields = moved.filter(isField).map((each) => each.closest<HTMLElement>("[data-line]")?.dataset.line ?? "?");
    assert.deepEqual(
        fields.filter((line) => !KNOWN_SIDEWAYS_FIELDS.includes(line)),
        [],
        `${where}: no field's text slid sideways but the known ones`,
    );
    assert.deepEqual([window.scrollX, window.scrollY], [0, 0], `${where}: the page did not scroll`);
    assert.deepEqual(
        [document.documentElement.scrollLeft, document.body.scrollLeft],
        [0, 0],
        `${where}: html and body did not scroll`,
    );
    assert.equal(document.querySelector(".ws-app")?.scrollTop, 0, `${where}: the app did not scroll`);
    assert.equal(region.getBoundingClientRect().left, left, `${where}: the panel stayed put`);
    const body = region.closest(".ws-panel-body") ?? region.querySelector(".ws-panel-body");
    if (body !== null) {
        assert.equal(getComputedStyle(body).overscrollBehaviorY, "contain", `${where}: the panel keeps its swipe`);
    }
    // What a reader sees is checked first; the CSS that keeps it so, after.
    for (const each of scrolling) {
        const { overflowX } = getComputedStyle(each);
        assert.include(
            ["hidden", "clip"],
            overflowX,
            `${where}: a scroller ${each.className} does not scroll sideways`,
        );
    }
    for (const root of [document.documentElement, document.body]) {
        assert.equal(getComputedStyle(root).overscrollBehaviorX, "none", `${where}: ${root.tagName} stops the swipe`);
    }
}

/**
 * Opens the workspace on three nodes, two edges and a layer over every node.
 * @param size - the window's width and height.
 * @param state - workspace state to start from.
 * @returns the session.
 */
async function openWorkspace(
    size: readonly [number, number],
    state: Partial<WorkspaceState> = {},
): Promise<GraphSession> {
    await page.viewport(size[0], size[1]);
    render(
        <Workspace
            store={createWorkspaceStore({ project: { name: "Untitled", id: 1 }, styleEmptySections: true, ...state })}
        />,
    );
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#E8590C" },
    });
    await session.styles.add({
        name: "Links",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#1971C2" },
    });
    await session.styles.settled();
    return session;
}

/**
 * The inspector's region.
 * @returns the inspector.
 */
function inspector(): HTMLElement {
    return screen.getByRole("complementary", { name: "Inspector" });
}

/**
 * How many editors (pop-overs and dialogs) are open.
 * @returns the count.
 */
function openEditors(): number {
    return document.querySelectorAll("[data-thing-popover], [role=dialog]").length;
}

/**
 * Closes every open editor with Escape, waiting for each to close before the next Escape.
 */
async function closeOpenEditors(): Promise<void> {
    for (let open = openEditors(); open > 0; open = openEditors()) {
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isBelow(openEditors(), open, "an Escape closes one editor");
        });
    }
}

/**
 * Adds every thing each section's "+" of one kind offers, picking each menu item once.
 * @param tab - the Style tab.
 * @param side - the kind whose sections to fill.
 */
async function addEverything(tab: HTMLElement, side: "node" | "edge"): Promise<void> {
    const sections = [...tab.querySelectorAll<HTMLElement>(`[data-section^="${side}-"]`)].filter(
        (each) => each.dataset.section !== `${side}-shaders`,
    );
    assert.isNotEmpty(sections, `the ${side} tab shows its sections`);
    for (const section of sections) {
        const picked = new Set<string>();
        // Each round adds one thing; a section offers fewer than this many.
        for (let round = 0; round < 24; round++) {
            const plus =
                section.querySelector<HTMLElement>("[data-plus]:not([aria-disabled])") ??
                within(section).queryByRole("button", { name: /^Add / });
            if (plus === null) {
                break;
            }
            const rows = section.querySelectorAll("[data-thing]").length;
            // The test page is a scaled iframe: bring the "+" into the panel's view first, as a reader
            // scrolls to it.
            plus.scrollIntoView({ block: "center" });
            await userEvent.click(plus);
            const menu = await waitFor(() => {
                const found = screen.queryByRole("menu");
                assert.isTrue(
                    found !== null || section.querySelectorAll("[data-thing]").length > rows,
                    "added or listed",
                );
                return found;
            });
            if (menu === null) {
                continue;
            }
            const next = within(menu)
                .queryAllByRole("menuitem")
                .find((item) => !item.hasAttribute("data-disabled") && !picked.has(item.textContent ?? ""));
            if (next === undefined) {
                await userEvent.keyboard("{Escape}");
                await waitFor(() => {
                    assert.isNull(screen.queryByRole("menu"));
                });
                break;
            }
            picked.add(next.textContent ?? "");
            await userEvent.click(next);
            await waitFor(() => {
                assert.isNull(screen.queryByRole("menu"));
            });
            // A list or a picture opens its editor at once, a Record its pop-over and its field's editor: close
            // each, one Escape at a time.
            await closeOpenEditors();
        }
    }
    // Adding scrolled the panel down to each "+": start the swipes from the top, so a swipe has room to move it.
    tab.closest(".ws-panel-body")?.scrollTo({ top: 0 });
}

/**
 * Fills the node Style tab, opens a label pop-over, then shows Values, swiping over each.
 * @param at - the case's name, for messages.
 */
async function nodeStyleChecks(at: string): Promise<void> {
    const tab = await openStyle("Key people");
    await addEverything(tab, "node");
    await swipeAndCheck(inspector(), `${at} Style`);

    const text = tab.querySelector<HTMLElement>('[data-section="node-text"] [data-thing="label"]');
    assert.isNotNull(text, `${at}: the text section holds a label after every "+" thing was added`);
    await userEvent.click(within(text).getByRole("button", { name: "Node label settings" }));
    const pop = await waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-thing-popover]");
        assert.isNotNull(found);
        return found;
    });
    await swipeAndCheck(pop, `${at} label pop-over`);
    await userEvent.keyboard("{Escape}");

    await userEvent.click(within(inspector()).getByRole("tab", { name: "Values" }));
    await swipeAndCheck(inspector(), `${at} Values`);
}

describe("the side panels never scroll sideways", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    for (const size of SIZES) {
        const at = `${String(size[0])}x${String(size[1])}`;

        it(`${at}: the left panel on Graph, Data and Notes`, async () => {
            await openWorkspace(size);
            const leftPanel = screen.getByRole("complementary", { name: "Left panel" });
            for (const place of ["Graph", "Data", "Notes"]) {
                await userEvent.click(screen.getByRole("button", { name: place }));
                await waitFor(() => {
                    assert.equal(screen.getByRole("button", { name: place }).getAttribute("aria-current"), "page");
                });
                await swipeAndCheck(leftPanel, `${at} ${place}`);
            }
        });

        it(`${at}: the Style tab with every "+" thing added and a label pop-over open, then Values`, async () => {
            await openWorkspace(size);
            await nodeStyleChecks(at);
        });

        it(`${at}: the edge Style tab with every "+" thing added`, async () => {
            await openWorkspace(size);
            const tab = await openStyle("Links");
            await showKind("edge");
            await addEverything(tab, "edge");
            await swipeAndCheck(inspector(), `${at} edge Style`);
        });

        it(`${at}: Graph settings`, async () => {
            await openWorkspace(size, { inspected: { kind: "graph" } });
            await userEvent.click(await within(inspector()).findByRole("tab", { name: "Style" }));
            await swipeAndCheck(inspector(), `${at} Graph settings`);
        });
    }

    it("the inspector dragged from wide to its minimum width, on the filled Style tab", async () => {
        await openWorkspace(SIZES[0], { rightWidth: 400 });
        assert.strictEqual(inspector().getBoundingClientRect().width, 400);
        await dragInspectorToMinimum();
        await nodeStyleChecks("dragged to minimum");
    });
});
