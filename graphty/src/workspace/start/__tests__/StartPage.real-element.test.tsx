/**
 * The start page on the REAL graphty-element, driven by the browser's own pointer and keyboard:
 * the live graph behind it fades what a pointed-at node is not linked to, shows a clicked node's
 * card, and runs the graph buttons; Open a file opens the chosen file; Resume reopens the newest
 * recent project. Every assertion reads what the element or the workspace reports.
 */

// Registers the real <graphty-element>, as the app's loader does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { clearRecent, rememberRecent } from "../../project/recent";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Answers the next file picker with this file (graphty/vitest.config.ts). */
        chooseNextFile: (name: string, mimeType: string, text: string) => Promise<void>;
    }
}

type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * Renders the start page and waits for its graph: Les Miserables loaded and its communities found.
 * @returns the store, the hero's element, its session and the unmount.
 */
async function startPage(): Promise<{
    store: WorkspaceStore;
    element: Element;
    session: GraphSession;
    unmount: () => void;
}> {
    const store = createWorkspaceStore();
    const { unmount } = render(<Workspace store={store} />);
    let element: Element | null = null;
    await waitFor(() => {
        element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>("graphty-element[data-start-page]");
        assert.equal(element?.session.data.statistics().nodeCount, 77);
        assert.isDefined(element?.session.runs.get("louvain")?.result);
    });
    if (element === null) {
        throw new Error("the start page's graph never came up");
    }
    const hero = element as Element;
    // A still graph drawn on every animation frame made each click on the page take about a second.
    assert.isTrue(hero.renderOnDemand, "the start page's graph draws on demand");
    // Stop the turning with the page's own button, so a node stays under the pointer.
    const pause = screen.queryByRole("button", { name: "Pause the turning" });
    if (pause !== null) {
        await userEvent.click(pause);
    }
    await hero.session.styles.settled();
    await hero.waitForStableFrame();
    return { store, element: hero, session: hero.session, unmount };
}

/**
 * A whole CSS pixel on a node that the element says is that node, with every pixel within two of
 * it on the node too: the one nearest its center.
 *
 * A pointer lands on whole pixels, and a node can be drawn mostly behind a neighbor. Napoleon sits
 * almost exactly behind Count, and a point chosen by fractions of a pixel on the sliver of
 * Napoleon left showing was often a pixel from Count's edge, so the real pointer landed on Count.
 * @param element - the hero's element.
 * @param node - the node.
 * @returns the point, in CSS pixels from the element's corner.
 */
function pointOn(element: Element, node: string): { x: number; y: number } {
    const at = element.nodeScreenPosition(node);
    assert.isTrue(at?.visible, `${node} is on screen`);
    const cx = Math.round(at?.x ?? 0);
    const cy = Math.round(at?.y ?? 0);
    const reach = Math.ceil(at?.radius ?? 0);
    const on = (x: number, y: number): boolean => element.elementAt({ x, y })?.id === node;
    const clear = (x: number, y: number): boolean => {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (!on(x + dx, y + dy)) {
                    return false;
                }
            }
        }
        return true;
    };
    const points: { x: number; y: number }[] = [];
    for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
            points.push({ x: cx + dx, y: cy + dy });
        }
    }
    points.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    const point = points.find((p) => on(p.x, p.y) && clear(p.x, p.y));
    if (point === undefined) {
        throw new Error(`no part of ${node} is clear of the other nodes`);
    }
    return point;
}

/**
 * Whether a style layer of the start page fades a node now.
 * @param session - the hero's session.
 * @param node - the node.
 * @returns true when a hover layer wins the node's opacity.
 */
function faded(session: GraphSession, node: string): boolean {
    const winner = session.styles.explain({ node }).channels.find((entry) => entry.channel === "node.opacity");
    return session.styles.list().some((layer) => layer.id === winner?.layerId && layer.selector.match === "hover");
}

/**
 * Whether a node carries a label the page's analysis layer wrote.
 * @param session - the hero's session.
 * @param node - the node.
 * @returns true when the label's look comes from a layer that picks nodes by id.
 */
function named(session: GraphSession, node: string): boolean {
    const winner = session.styles.explain({ node }).channels.find((entry) => entry.channel === "node.labelStyle");
    return session.styles.list().some((layer) => layer.id === winner?.layerId && layer.selector.match === "ids");
}

/**
 * The highlight color a style layer of the start page gives a node now.
 * @param session - the hero's session.
 * @param node - the node.
 * @returns the color, or undefined when no layer highlights it.
 */
function highlighted(session: GraphSession, node: string): string | undefined {
    return session.styles.explain({ node }).merged["node.haloColor"]?.hex;
}

/**
 * How many pixels around a node are drawn in the start page's highlight green, read from the
 * element's own screenshot: the halo is the node's shape scaled out in that green, so it shows as
 * green pixels around the node that are not there without it.
 * @param element - the hero's element.
 * @param node - the node.
 * @returns the count of green pixels within 1.6 node radii of its center.
 */
async function greenAround(element: Element, node: string): Promise<number> {
    const at = element.nodeScreenPosition(node);
    assert.isTrue(at?.visible, `${node} is on screen`);
    const shot = await element.captureScreenshot({ destination: { blob: true }, format: "png" });
    const bitmap = await createImageBitmap(shot.blob);
    const scale = bitmap.width / element.clientWidth;
    const reach = (at?.radius ?? 0) * 1.6 * scale;
    const cx = (at?.x ?? 0) * scale;
    const cy = (at?.y ?? 0) * scale;
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context?.drawImage(bitmap, 0, 0);
    const x0 = Math.max(0, Math.floor(cx - reach));
    const y0 = Math.max(0, Math.floor(cy - reach));
    const size = Math.ceil(reach * 2);
    const pixels = context?.getImageData(x0, y0, size, size).data ?? new Uint8ClampedArray();
    let green = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
        // The light scheme's highlight, #97c800, at the layer's half opacity around the node: a
        // yellow-green where green leads. Over a white canvas that is about (203, 227, 127), so
        // green leads red by less than it leads blue.
        if (g > 120 && g > r && g > b + 60) {
            green++;
        }
    }
    return green;
}

beforeAll(async () => {
    await page.viewport(1440, 900);
});

beforeEach(async () => {
    await clearRecent();
    forgetUsageAnswer();
});

afterEach(async () => {
    vi.unstubAllGlobals();
    await clearRecent();
});

describe("the start page's graph", () => {
    it("fades what a pointed-at node is not linked to, and nothing once the pointer leaves", async () => {
        const { element, session } = await startPage();
        const at = pointOn(element, "Napoleon");

        await userEvent.hover(element, { position: at });
        await waitFor(() => {
            assert.equal(session.selection.hovered, "Napoleon");
        });
        await session.styles.settled();
        // Napoleon's one neighbor is Myriel; Valjean is two steps away.
        assert.isFalse(faded(session, "Napoleon"));
        assert.isFalse(faded(session, "Myriel"));
        assert.isTrue(faded(session, "Valjean"));
        assert.equal(session.selection.size, 0, "pointing at a node selects nothing");
        assert.isDefined(highlighted(session, "Napoleon"), "the pointed-at node is highlighted");
        assert.isUndefined(highlighted(session, "Myriel"), "and only that one");

        // Off the graph, onto the headline over the page's left side.
        await userEvent.hover(screen.getByRole("heading", { level: 1 }));
        await waitFor(() => {
            assert.isNull(session.selection.hovered);
        });
        await session.styles.settled();
        assert.isFalse(faded(session, "Valjean"));
        assert.isUndefined(highlighted(session, "Napoleon"), "the highlight went with the pointer");
    });

    it("shows a clicked node's card with its connections, community and links", async () => {
        const { element, session } = await startPage();
        const before = await greenAround(element, "Valjean");
        await userEvent.click(element, { position: pointOn(element, "Valjean") });
        await session.styles.settled();
        await element.waitForStableFrame();

        assert.deepEqual([...session.selection.nodes].map(String), ["Valjean"]);
        const clicked = await greenAround(element, "Valjean");
        assert.isAbove(clicked, before * 2 + 50, `the clicked node is drawn with a halo (${before} -> ${clicked})`);
        const card = await screen.findByRole("dialog", { name: "Node details" });
        assert.isNotNull(within(card).getByText("Valjean"));
        assert.match(card.textContent ?? "", /36 connections/);
        assert.match(card.textContent ?? "", /Community \d+ of \d+/);
        // The community line starts with a dot in the color the element drew the node in.
        assert.match(card.querySelector<HTMLElement>(".ws-land-info-dot")?.style.background ?? "", /rgb/);
        assert.match(card.textContent ?? "", /Linked to .+ and 32 more/);
        // The rest of the graph stays faded while the card is open.
        assert.isTrue(faded(session, "Napoleon"));

        // With the pointer off the graph the clicked node keeps its halo.
        await userEvent.hover(screen.getByRole("heading", { level: 1 }));
        await waitFor(() => {
            assert.isNull(session.selection.hovered);
        });
        await session.styles.settled();
        await element.waitForStableFrame();
        const kept = await greenAround(element, "Valjean");
        assert.isAbove(kept, before * 2 + 50, `the clicked node keeps its halo off hover (${before} -> ${kept})`);

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Node details" }));
        });
    });

    it("shows Key players and Shortest path at the same time, and keeps one when the other goes", async () => {
        const { session } = await startPage();

        const runOf = (algorithm: string) => session.runs.list().find((run) => run.algorithm === algorithm);
        const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");
        const look = (node: string) => session.styles.explain({ node }).merged;
        const pathColors = ["#588300", "#c4f23a"];

        await userEvent.click(screen.getByRole("button", { name: "Key players" }));
        await waitFor(() => {
            assert.isDefined(runOf("betweenness")?.result);
            assert.isNotNull(screen.queryByText(/Valjean is the biggest\./));
        });
        await waitFor(() => {
            assert.isTrue(named(session, "Valjean"), "Key players names the biggest node");
        });

        await userEvent.click(screen.getByRole("button", { name: "Shortest path" }));
        await waitFor(() => {
            assert.isDefined(runOf("shortest-path")?.result);
            assert.isNotNull(screen.queryByText("The shortest route from Napoleon to Brujon, in green: 4 steps."));
        });
        await waitFor(() => {
            assert.isTrue(named(session, "Napoleon") && named(session, "Brujon"), "Shortest path names its ends");
        });
        await session.styles.settled();
        // Both are on and both are drawn: the sizes stay, and the route is in its color.
        assert.equal(pressed("Key players"), "true");
        assert.equal(pressed("Shortest path"), "true");
        assert.isDefined(runOf("betweenness")?.result, "Key players stayed on");
        assert.isTrue(named(session, "Valjean"), "Key players' name stayed");
        assert.isNotNull(screen.queryByText(/Valjean is the biggest\./));
        assert.notEqual(look("Valjean")["node.size"], look("Napoleon")["node.size"], "sized by betweenness");
        assert.include(pathColors, look("Napoleon")["node.color"]?.hex);

        // Key players off: the route and its names stay.
        await userEvent.click(screen.getByRole("button", { name: "Key players" }));
        await waitFor(() => {
            assert.isUndefined(runOf("betweenness"));
        });
        await session.styles.settled();
        assert.equal(pressed("Shortest path"), "true");
        assert.isDefined(runOf("shortest-path")?.result);
        assert.isTrue(named(session, "Napoleon") && named(session, "Brujon"), "the route's names stayed");
        assert.isFalse(named(session, "Valjean"), "Key players' name went with it");
        assert.include(pathColors, look("Napoleon")["node.color"]?.hex);
        assert.isNotNull(screen.queryByText("The shortest route from Napoleon to Brujon, in green: 4 steps."));

        // Key players on again and Shortest path off: the sizes and Valjean's name stay.
        await userEvent.click(screen.getByRole("button", { name: "Key players" }));
        await waitFor(() => {
            assert.isTrue(named(session, "Valjean"));
        });
        await userEvent.click(screen.getByRole("button", { name: "Shortest path" }));
        await waitFor(() => {
            assert.isUndefined(runOf("shortest-path"));
        });
        await session.styles.settled();
        assert.isDefined(runOf("betweenness")?.result);
        assert.isTrue(named(session, "Valjean"));
        assert.isFalse(named(session, "Brujon"), "the route's names went with it");
        assert.notInclude(pathColors, look("Napoleon")["node.color"]?.hex);

        await userEvent.click(screen.getByRole("button", { name: "2D" }));
        await waitFor(() => {
            assert.equal(session.layout.dimension, "2d");
        });
    });

    // Pausing used to frame the graph again, so it jumped: the room kept clear of the buttons was
    // measured once, before the caption under them appeared, and measured again on every pause.
    it("pauses and resumes the turning without moving the camera's center or distance", async () => {
        const store = createWorkspaceStore();
        const { unmount } = render(<Workspace store={store} />);
        let element: Element | null = null;
        await waitFor(() => {
            element = document.querySelector<Element>("graphty-element[data-start-page]");
            assert.isDefined(element?.session.runs.get("louvain")?.result);
            assert.isNotNull(screen.queryByText(/^Colored by community/));
        });
        const hero = element as unknown as Element;
        await hero.waitForStableFrame();
        const framing = (): string => {
            const { target, cameraDistance } = hero.getCameraState();
            return JSON.stringify({ target, cameraDistance }, (_key, value: unknown) =>
                typeof value === "number" ? value.toFixed(3) : value,
            );
        };
        const before = framing();

        await userEvent.click(screen.getByRole("button", { name: "Pause the turning" }));
        await hero.waitForStableFrame();
        assert.equal(framing(), before, "pausing framed the graph again");

        await userEvent.click(screen.getByRole("button", { name: "Turn the graph" }));
        await hero.waitForStableFrame();
        assert.equal(framing(), before, "resuming framed the graph again");
        unmount();
    });

    it("draws the shortest route in the page's path color, and takes it away again", async () => {
        const { session } = await startPage();
        const runOf = (algorithm: string) => session.runs.list().find((run) => run.algorithm === algorithm);

        await userEvent.click(screen.getByRole("button", { name: "Shortest path" }));
        await waitFor(() => {
            assert.isDefined(runOf("shortest-path")?.result);
        });
        // The route is drawn: its ends wear one color, which a node off the route does not.
        await session.styles.settled();
        const colorOf = (node: string) => session.styles.explain({ node }).merged["node.color"]?.hex;
        assert.equal(colorOf("Napoleon"), colorOf("Brujon"));
        assert.include(["#588300", "#c4f23a"], colorOf("Napoleon"));
        assert.notEqual(colorOf("Cosette"), colorOf("Napoleon"));

        // Switched off, the route's look goes with its run.
        await userEvent.click(screen.getByRole("button", { name: "Shortest path" }));
        await waitFor(() => {
            assert.isUndefined(runOf("shortest-path"));
        });
        await session.styles.settled();
        assert.notInclude(["#588300", "#c4f23a"], colorOf("Napoleon"));
    });

    it("draws every node in the page's neutral gray with Communities off, and in groups again on", async () => {
        const { session } = await startPage();
        const colorOf = (node: string) => session.styles.explain({ node }).merged["node.color"]?.hex?.toLowerCase();
        await waitFor(() => {
            assert.isDefined(session.runs.get("louvain")?.result);
        });

        await userEvent.click(screen.getByRole("button", { name: "Communities" }));
        await waitFor(() => {
            assert.isUndefined(session.runs.get("louvain"));
        });
        await session.styles.settled();
        for (const node of ["Valjean", "Napoleon", "Gavroche"]) {
            assert.include(["#6b7286", "#9aa3b8"], colorOf(node), `${node} is the page's gray`);
        }

        await userEvent.click(screen.getByRole("button", { name: "Communities" }));
        await waitFor(() => {
            assert.isDefined(session.runs.get("louvain")?.result);
        });
        await session.styles.settled();
        assert.notInclude(["#6b7286", "#9aa3b8"], colorOf("Valjean"), "colored by community again");
    });

    it("names the shortest path's ends over the graph, not in it", async () => {
        const { session } = await startPage();
        await userEvent.click(screen.getByRole("button", { name: "Shortest path" }));
        await waitFor(() => {
            assert.isTrue(named(session, "Brujon"));
        });
        const style = session.styles.explain({ node: "Brujon" }).merged["node.labelStyle"];
        assert.isTrue(style?.onTop, "the name is drawn on top");
    });
});

describe("the start page's ways in", () => {
    it("opens the file chosen from Open a file as a project", async () => {
        const { store } = await startPage();

        await commands.chooseNextFile(
            "triangle.json",
            "application/json",
            JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [{ src: "a", dst: "b" }] }),
        );
        await userEvent.click(screen.getByRole("button", { name: /^Open a file/ }));

        await waitFor(() => {
            assert.equal(store.get().project?.name, "triangle");
            assert.equal(
                document
                    .querySelector<HTMLElementTagNameMap["graphty-element"]>("graphty-element:not([data-start-page])")
                    ?.session.data.statistics().nodeCount,
                3,
            );
        });
    });

    it("reopens the newest recent project from Resume", async () => {
        // A saved project to resume: the start page's own graph, saved as soon as it has loaded.
        const first = render(<Workspace store={createWorkspaceStore()} />);
        let hero: GraphSession | undefined;
        await waitFor(() => {
            hero = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                "graphty-element[data-start-page]",
            )?.session;
            assert.equal(hero?.data.statistics().nodeCount, 77);
        });
        if (hero === undefined) {
            throw new Error("the start page's graph never came up");
        }
        const saved = await hero.project.save();
        first.unmount();
        await rememberRecent({ id: "kept", name: "Les Miserables study", nodes: 77, at: Date.now() });

        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const resume = await screen.findByRole("button", { name: /^Resume Les Miserables study/ });
        // This browser kept no handle to the file, so Resume asks for it, as Locate... does, with
        // the file input (the File System Access picker is switched off, as where a browser has none).
        vi.stubGlobal("showOpenFilePicker", undefined);
        await commands.chooseNextFile("study.graphty.json", "application/json", saved.text);
        await userEvent.click(resume);

        await waitFor(() => {
            assert.isNotNull(store.get().project);
            assert.equal(
                document
                    .querySelector<HTMLElementTagNameMap["graphty-element"]>("graphty-element:not([data-start-page])")
                    ?.session.data.statistics().nodeCount,
                77,
            );
        });
    });
});
