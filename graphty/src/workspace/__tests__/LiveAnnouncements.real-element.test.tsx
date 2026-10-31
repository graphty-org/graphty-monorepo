/**
 * What a screen reader is told as things change, read from the page's live regions as the browser
 * gives them to it, on the REAL graphty-element, driven by real input (issue #5164): a region is
 * on the page, empty, before its words arrive; a commit is said in one short line; a finished
 * ranking names who ranks first; nothing about a private window is said on an open; and the
 * sample library's search says how many samples it leaves.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { openBy } from "../../test/open";
import { pickSample } from "../../test/samples-dialog";
import { findValuePicker, render, screen, waitFor, within } from "../../test/test-utils";
import { nodeName } from "../inspector/words";
import { forgetUsageAnswer } from "../privacy/usageData";
import { clearRecent } from "../project/recent";
import { createWorkspaceStore, type WorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";

/** Every line the page's polite live regions have held since the test began, in order. */
let heard: string[] = [];
let observer: MutationObserver | null = null;

/**
 * Whether one of the regions said exactly these words at some point.
 * @param words - the line.
 * @returns whether it was heard.
 */
function wasHeard(words: string): boolean {
    return heard.some((line) => line.split(" | ").includes(words));
}

/**
 * What the polite live regions hold now, as a screen reader is given them.
 * @returns their words, joined.
 */
function liveWords(): string {
    return [...document.querySelectorAll('[aria-live="polite"]')]
        .map((region) => region.textContent.trim())
        .filter((words) => words !== "")
        .join(" | ");
}

beforeAll(async () => {
    await page.viewport(1366, 768);
});

beforeEach(async () => {
    await clearRecent();
    forgetUsageAnswer();
    heard = [];
    observer = new MutationObserver(() => {
        const words = liveWords();
        if (words !== "" && words !== heard.at(-1)) {
            heard.push(words);
        }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
});

afterEach(() => {
    observer?.disconnect();
    observer = null;
});

/** A hub "a" with three spokes. */
const NODES = [
    { id: "a", name: "Ava" },
    { id: "b", name: "Ben" },
    { id: "c", name: "Cy" },
    { id: "d", name: "Dee" },
].map((node, i) => ({ ...node, position: { x: (i - 2) * 6, y: 0, z: 0 } }));
const EDGES = [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "a", target: "d" },
];

/**
 * The workspace with a project holding the hub, on the Everything row.
 * @returns the element's session and the store.
 */
async function openWithGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Hub", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found as GraphSession;
    });
    await session.layout.set("fixed");
    await session.data.addNodes(NODES.map((node) => ({ ...node })));
    await session.data.addEdges(EDGES.map((edge) => ({ ...edge })));
    return { session, store };
}

describe("live announcements", () => {
    it("the start page's caption region is on the page, empty, before its first line arrives", async () => {
        render(<Workspace store={createWorkspaceStore()} />);
        // The demo's chips are drawn with the region beside them.
        await screen.findByRole("toolbar", { name: "Analyze the graph" });
        const region = document.querySelector(".ws-land-demo [aria-live]");
        assert.isNotNull(region, "the region is on the page before the graph has said anything");
        assert.equal(region?.textContent, "", "and holds nothing yet");
        await waitFor(() => {
            assert.match(region?.textContent ?? "", /^Colored by community/);
        });
        assert.isTrue(region?.isConnected, "the line is written into the region that was waiting for it");
    });

    it("committing a label's Size says the new size in one line", async () => {
        await openWithGraph();
        const text = (): HTMLElement => {
            const nodes = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-group="node"]');
            if (nodes === null) {
                throw new Error("no Nodes group");
            }
            return within(nodes).getByRole("group", { name: "Text" });
        };
        await screen.findByTestId("style-tab");
        await userEvent.click(within(text()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label(?! at )/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^name(,|$)/ }));
        await userEvent.click(await within(text()).findByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Label size" }));
        // The new size's box takes focus.
        const box = await waitFor(() => {
            const focused = document.activeElement;
            assert.instanceOf(focused, HTMLInputElement);
            return focused as HTMLInputElement;
        });
        heard = [];
        await userEvent.keyboard("{Control>}a{/Control}23{Enter}");
        await waitFor(() => {
            assert.isTrue(
                heard.some((line) => /size/i.test(line) && line.includes("23")),
                `the commit is said; heard: ${JSON.stringify(heard)}`,
            );
        });
        assert.equal(box.value.replace(/\D/g, ""), "23");
    });

    it("a finished Degree run names the node that ranks first", async () => {
        const { session } = await openWithGraph();
        const analyze = (): HTMLElement =>
            within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Analyze" });
        await waitFor(() => {
            assert.isFalse(analyze().hasAttribute("aria-disabled"));
        });
        await userEvent.click(analyze());
        await userEvent.type(await screen.findByRole("combobox", { name: "Filter analyses" }), "Degree");
        await userEvent.click(await screen.findByRole("option", { name: /^Degree/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^Run\b/ }));
        await waitFor(() => {
            // Named as every other line names a node.
            const ava = nodeName(session, "a");
            assert.isTrue(wasHeard(`Degree finished: ${ava} ranks first, 3`), `heard: ${JSON.stringify(heard)}`);
        });
    });

    it("opening a sample says nothing about a private window", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await openBy(store, () => pickSample("Florentine families"));
        await waitFor(() => {
            assert.isTrue(
                heard.some((line) => /15 nodes/.test(line)),
                `the open is said; heard: ${JSON.stringify(heard)}`,
            );
        });
        assert.isFalse(
            heard.some((line) => /private window|may clear|gone when it closes/i.test(line)),
            `heard: ${JSON.stringify(heard)}`,
        );
    });

    it("the sample library's search says how many samples it leaves", async () => {
        render(<Workspace store={createWorkspaceStore()} />);
        const search = await screen.findByRole("searchbox", { name: "Search samples" });
        assert.isFalse(
            heard.some((line) => / shown$/.test(line)),
            "the count the library opens with is not news",
        );
        await userEvent.click(search);
        await userEvent.keyboard("karate");
        const library = screen.getByRole("region", { name: "Sample library" });
        await waitFor(() => {
            const tiles = within(library).queryAllByRole("button", {
                name: /^(Open the .* sample|Generate a graph: )/,
            });
            const words = `${String(tiles.length)} sample${tiles.length === 1 ? "" : "s"} shown`;
            assert.isTrue(wasHeard(words), `${words}; heard: ${JSON.stringify(heard)}`);
        });
    });
});
