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

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

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
    await waitFor(
        () => {
            element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                "graphty-element[data-start-page]",
            );
            assert.equal(element?.session.data.statistics().nodeCount, 77);
            assert.isDefined(element?.session.runs.get("louvain")?.result);
        },
        { timeout: TIMEOUT_MS },
    );
    if (element === null) {
        throw new Error("the start page's graph never came up");
    }
    const hero = element as Element;
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
 * A point on a node that the element says is that node: its center, or a point nearby when
 * another node is drawn in front of the center.
 * @param element - the hero's element.
 * @param node - the node.
 * @returns the point, in CSS pixels from the element's corner.
 */
function pointOn(element: Element, node: string): { x: number; y: number } {
    const at = element.nodeScreenPosition(node);
    assert.isTrue(at?.visible, `${node} is on screen`);
    const r = (at?.radius ?? 0) * 0.6;
    for (const [dx, dy] of [
        [0, 0],
        [r, 0],
        [-r, 0],
        [0, r],
        [0, -r],
        [r, r],
        [-r, r],
        [r, -r],
        [-r, -r],
    ]) {
        const point = { x: (at?.x ?? 0) + dx, y: (at?.y ?? 0) + dy };
        const hit = element.elementAt(point);
        if (hit?.kind === "node" && hit.id === node) {
            return point;
        }
    }
    throw new Error(`no part of ${node} is in front of the other nodes`);
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

        // Off the graph, onto the headline over the page's left side.
        await userEvent.hover(screen.getByRole("heading", { level: 1 }));
        await waitFor(() => {
            assert.isNull(session.selection.hovered);
        });
        await session.styles.settled();
        assert.isFalse(faded(session, "Valjean"));
    });

    it("shows a clicked node's card with its connections, community and links", async () => {
        const { element, session } = await startPage();
        const at = element.nodeScreenPosition("Valjean");
        assert.isTrue(at?.visible, "Valjean is on screen");

        await userEvent.click(element, { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
        await session.styles.settled();
        await element.waitForStableFrame();

        assert.deepEqual([...session.selection.nodes].map(String), ["Valjean"]);
        const card = await screen.findByRole("dialog", { name: "Node details" });
        assert.isNotNull(within(card).getByText("Valjean"));
        assert.match(card.textContent ?? "", /36 connections/);
        assert.match(card.textContent ?? "", /Community \d+ of \d+/);
        // The community line starts with a dot in the color the element drew the node in.
        assert.match(card.querySelector<HTMLElement>(".ws-land-info-dot")?.style.background ?? "", /rgb/);
        assert.match(card.textContent ?? "", /Linked to .+ and 32 more/);
        // The rest of the graph stays faded while the card is open.
        assert.isTrue(faded(session, "Napoleon"));

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Node details" }));
        });
    });

    it("runs Key players and Shortest path through the element, one at a time", async () => {
        const { session } = await startPage();

        const runOf = (algorithm: string) => session.runs.list().find((run) => run.algorithm === algorithm);

        await userEvent.click(screen.getByRole("button", { name: "Key players" }));
        await waitFor(() => {
            assert.isDefined(runOf("betweenness")?.result);
            assert.isNotNull(screen.queryByText(/Valjean is the biggest\./));
        });

        await userEvent.click(screen.getByRole("button", { name: "Shortest path" }));
        await waitFor(() => {
            assert.isDefined(runOf("shortest-path")?.result);
            assert.isNotNull(screen.queryByText("The shortest route from Napoleon to Brujon: 4 steps."));
        });
        assert.isUndefined(runOf("betweenness"), "Key players was switched off");
        assert.equal(screen.getByRole("button", { name: "Key players" }).getAttribute("aria-pressed"), "false");
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
        await waitFor(
            () => {
                element = document.querySelector<Element>("graphty-element[data-start-page]");
                assert.isDefined(element?.session.runs.get("louvain")?.result);
                assert.isNotNull(screen.queryByText(/^Colored by community/));
            },
            { timeout: TIMEOUT_MS },
        );
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

        await waitFor(
            () => {
                assert.equal(store.get().project?.name, "triangle");
                assert.equal(
                    document
                        .querySelector<HTMLElementTagNameMap["graphty-element"]>(
                            "graphty-element:not([data-start-page])",
                        )
                        ?.session.data.statistics().nodeCount,
                    3,
                );
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("reopens the newest recent project from Resume", async () => {
        // A saved project to resume: the start page's own graph, saved as soon as it has loaded.
        const first = render(<Workspace store={createWorkspaceStore()} />);
        let hero: GraphSession | undefined;
        await waitFor(
            () => {
                hero = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                    "graphty-element[data-start-page]",
                )?.session;
                assert.equal(hero?.data.statistics().nodeCount, 77);
            },
            { timeout: TIMEOUT_MS },
        );
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

        await waitFor(
            () => {
                assert.isNotNull(store.get().project);
                assert.equal(
                    document
                        .querySelector<HTMLElementTagNameMap["graphty-element"]>(
                            "graphty-element:not([data-start-page])",
                        )
                        ?.session.data.statistics().nodeCount,
                    77,
                );
            },
            { timeout: TIMEOUT_MS },
        );
    });
});
