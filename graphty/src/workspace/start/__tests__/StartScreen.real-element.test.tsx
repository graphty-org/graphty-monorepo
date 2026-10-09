/**
 * Tier 1 tasks T1 (first launch) and T2 (pick a sample), from an empty app on the REAL
 * graphty-element: the usage data card is answered, then each of the four samples opens from the
 * start screen through the element's ordinary import, with nothing run and no style layer, and
 * the element's counts match the sample's source. Every assertion reads what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, describe, it, vi } from "vitest";

const { initSentry, stopSentry } = vi.hoisted(() => ({ initSentry: vi.fn(), stopSentry: vi.fn() }));
vi.mock("../../../lib/sentry", () => ({ initSentry, stopSentry, captureUserFeedback: vi.fn() }));

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** Each sample's counts, from its source (graph-samples' metadata, public/samples/SOURCES.md). */
const SAMPLES = [
    { name: "Les Miserables", nodes: 77, edges: 254 },
    { name: "Zachary's karate club", nodes: 34, edges: 78 },
    { name: "College football", nodes: 115, edges: 613 },
    { name: "Florentine families", nodes: 15, edges: 20 },
];

/**
 * Waits for the open project's element and its session.
 * @returns the session.
 */
async function elementSession(): Promise<GraphSession> {
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * The style layers beyond the element's own locked base layers (node and edge defaults).
 * @param session - the element's session.
 * @returns the names of the added layers.
 */
function addedLayers(session: GraphSession): string[] {
    return session.styles
        .list()
        .filter((layer) => layer.kind !== "base")
        .map((layer) => layer.name);
}

afterEach(() => {
    forgetUsageAnswer();
});

describe("T1 and T2: first launch and pick a sample, on the real element", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "answers the usage data card, then opens Les Miserables with nothing run",
        async () => {
            forgetUsageAnswer();
            const store = createWorkspaceStore();
            render(<Workspace store={store} />);

            // T1: the card is at the foot of the start screen until it is answered.
            assert.isNotNull(screen.getByRole("complementary", { name: "Usage data" }));
            await userEvent.click(screen.getByRole("button", { name: "Share usage data" }));
            assert.isNotNull(screen.getByRole("button", { name: "Usage data on, content masked" }));
            assert.equal(initSentry.mock.calls.length, 1);

            // T2: a sample opens as a project on the Graph place.
            await userEvent.click(screen.getByRole("button", { name: "Open the Les Miserables sample" }));
            const session = await elementSession();
            await waitFor(
                () => {
                    assert.equal(session.data.statistics().nodeCount, 77);
                },
                { timeout: TIMEOUT_MS },
            );
            assert.equal(session.data.statistics().edgeCount, 254);
            assert.equal(session.data.source()?.name, "Les Miserables");
            assert.deepEqual(session.runs.list(), []);
            assert.deepEqual(addedLayers(session), []);
            assert.isNull(store.get().opening);
            // The privacy chip in the project's header still shows the answer.
            assert.isNotNull(screen.getByRole("button", { name: "Usage data on, content masked" }));
            // Each character carries its readable name, and its id is the dataset's own, not the
            // number GML had to write.
            const attributes = session.data.attributes().map((attribute) => attribute.name);
            assert.include(attributes, "name");
            assert.notInclude(attributes, "graphty_originalId");
        },
        TIMEOUT_MS,
    );

    for (const sample of SAMPLES) {
        // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
        it(
            `opens ${sample.name} with the source's counts, nothing run and no style layer`,
            async () => {
                const store = createWorkspaceStore();
                const { unmount } = render(<Workspace store={store} />);

                await userEvent.click(screen.getByRole("button", { name: `Open the ${sample.name} sample` }));
                const session = await elementSession();
                await waitFor(
                    () => {
                        assert.equal(session.data.statistics().nodeCount, sample.nodes);
                    },
                    { timeout: TIMEOUT_MS },
                );
                assert.equal(session.data.statistics().edgeCount, sample.edges);
                assert.equal(store.get().project?.name, sample.name);
                assert.deepEqual(session.runs.list(), []);
                assert.deepEqual(addedLayers(session), []);
                assert.isNull(store.get().notice);
                unmount();
            },
            TIMEOUT_MS,
        );
    }
});

describe("a file that cannot be read, on the real element", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "leaves the start screen showing, adds nothing to Recent projects, and keeps the reason",
        async () => {
            const whole = `<?xml version="1.0"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph edgedefault="undirected">
${Array.from({ length: 9 }, (_, i) => `    <node id="n${String(i)}"/>`).join("\n")}
${Array.from({ length: 8 }, (_, i) => `    <edge source="n${String(i)}" target="n${String(i + 1)}"/>`).join("\n")}
  </graph>
</graphml>`;
            const transfer = new DataTransfer();
            transfer.items.add(new File([whole.slice(0, Math.floor(whole.length * 0.55))], "cut-55.graphml"));
            const store = createWorkspaceStore();
            const { unmount } = render(<Workspace store={store} />);

            globalThis.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
            await waitFor(() => store.get().notice !== null || assert.fail("no notice yet"), { timeout: TIMEOUT_MS });

            // Back where the reader was: no project, no empty canvas named after the file.
            assert.isNull(store.get().project);
            assert.isNull(document.querySelector("graphty-element"));
            assert.isNotNull(screen.getByRole("region", { name: "Start" }));
            assert.isNull(within(screen.getByRole("region", { name: "Recent projects" })).queryByText(/cut-55/));
            // The reason is the app's sentence from the element's code and line, and it stays.
            const { notice } = store.get();
            assert.isTrue(notice?.error);
            assert.match(
                notice?.message ?? "",
                /^cut-55 could not be opened: the file is incomplete or damaged near line \d+/,
            );
            assert.include(notice?.message ?? "", "Ask for the file again.");
            assert.isNotNull(screen.getByText(notice?.message ?? ""));
            unmount();
        },
        TIMEOUT_MS,
    );
});

/**
 * Makes the next file picker the app opens answer with `file`, as a reader choosing it would.
 * @param file - the file the reader chooses.
 */
function chooseNextFile(file: File): void {
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementationOnce(function (this: HTMLInputElement) {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        this.files = transfer.files;
        this.dispatchEvent(new Event("change"));
    });
}

/**
 * Opens Les Miserables, saves it as a project file and closes it again.
 * @returns the project file, named as the element names a downloaded project.
 */
async function lesMiserablesProjectFile(): Promise<File> {
    const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
    await userEvent.click(screen.getByRole("button", { name: "Open the Les Miserables sample" }));
    const session = await elementSession();
    await waitFor(
        () => {
            assert.equal(session.data.statistics().nodeCount, 77);
        },
        { timeout: TIMEOUT_MS },
    );
    await session.project.rename("Les Miserables");
    const { text } = await session.project.save();
    unmount();
    return new File([text], "Les Miserables.graphty.json");
}

describe("Open project or file... and a dropped file, on the real element", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "opens a project file from the start screen under the project's own name, chosen or dropped",
        async () => {
            const file = await lesMiserablesProjectFile();

            for (const how of ["chosen", "dropped"] as const) {
                const store = createWorkspaceStore();
                const { unmount } = render(<Workspace store={store} />);
                if (how === "chosen") {
                    chooseNextFile(file);
                    await userEvent.click(screen.getByRole("button", { name: /Open project or file\.\.\./ }));
                } else {
                    const transfer = new DataTransfer();
                    transfer.items.add(file);
                    globalThis.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
                }
                const session = await elementSession();
                await waitFor(
                    () => {
                        assert.equal(session.data.statistics().nodeCount, 77, how);
                        assert.equal(store.get().project?.name, "Les Miserables", how);
                    },
                    { timeout: TIMEOUT_MS },
                );
                assert.isFalse(store.get().notice?.error ?? false, how);
                unmount();
            }
        },
        TIMEOUT_MS * 3,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "opens a data file from the start screen on the Data page as a new graph, loading nothing until Load, and takes a second file opened from there",
        async () => {
            const store = createWorkspaceStore();
            const { unmount } = render(<Workspace store={store} />);
            chooseNextFile(new File(["from,to,km\na,b,3\nb,c,6\n"], "trail.csv", { type: "text/csv" }));
            await userEvent.click(screen.getByRole("button", { name: /Open project or file\.\.\./ }));
            // The roles and the weight's meaning are asked before anything loads.
            await screen.findByRole("heading", { name: "Open as a new graph" }, { timeout: TIMEOUT_MS });
            await screen.findByText("Weight: none (each edge counts 1)", {}, { timeout: TIMEOUT_MS });
            const session = await elementSession();
            assert.equal(session.data.statistics().nodeCount, 0);
            // Opening a second file from the page itself joins it as the second table, as a drop does.
            chooseNextFile(new File(["id,name\na,A\nb,B\nc,C\n"], "junctions.csv", { type: "text/csv" }));
            await userEvent.keyboard("{Control>}o{/Control}");
            await screen.findByText("Nodes: junctions.csv", {}, { timeout: TIMEOUT_MS });
            assert.isNotNull(screen.getByText("Edges: trail.csv"));
            // Cancel goes back to the start screen, as from New from data....
            await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
            await waitFor(() => {
                assert.isNull(store.get().project);
            });
            unmount();
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "adds a data file to the open project through the Data page, and asks before a project file replaces unsaved changes",
        async () => {
            const project = await lesMiserablesProjectFile();
            const store = createWorkspaceStore();
            const { unmount } = render(<Workspace store={store} />);
            await userEvent.click(screen.getByRole("button", { name: "Open the Florentine families sample" }));
            const session = await elementSession();
            await waitFor(
                () => {
                    assert.equal(session.data.statistics().nodeCount, 15);
                },
                { timeout: TIMEOUT_MS },
            );

            // A table file goes through the Data page, where its roles and weight are chosen.
            chooseNextFile(new File(["source,target\nx1,x2\nx2,x3\n"], "extra.csv", { type: "text/csv" }));
            await userEvent.keyboard("{Control>}o{/Control}");
            await screen.findByRole("heading", { name: /^Add to / }, { timeout: TIMEOUT_MS });
            await screen.findByText("Weight: none (each edge counts 1)", {}, { timeout: TIMEOUT_MS });
            assert.equal(session.data.statistics().nodeCount, 15);
            // x1, x2 and x3 are in no node row and not in the graph: Add makes them.
            const report = await screen.findByRole("region", { name: "Match report" }, { timeout: TIMEOUT_MS });
            await userEvent.click(await within(report).findByText("Add", {}, { timeout: TIMEOUT_MS }));
            const load = await screen.findByRole("button", { name: "Load" });
            await waitFor(
                () => {
                    assert.isFalse(load.hasAttribute("disabled") || load.getAttribute("data-disabled") === "true");
                },
                { timeout: TIMEOUT_MS },
            );
            await userEvent.click(load);
            await waitFor(
                () => {
                    assert.equal(session.data.statistics().nodeCount, 18);
                },
                { timeout: TIMEOUT_MS },
            );
            assert.isTrue(session.project.dirty);

            chooseNextFile(project);
            await userEvent.keyboard("{Control>}o{/Control}");
            const ask = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
            assert.equal(session.data.statistics().nodeCount, 18);
            await userEvent.click(within(ask).getByRole("button", { name: "Discard" }));
            await waitFor(
                () => {
                    assert.equal(session.data.statistics().nodeCount, 77);
                    assert.equal(store.get().project?.name, "Les Miserables");
                },
                { timeout: TIMEOUT_MS },
            );
            unmount();
        },
        TIMEOUT_MS * 2,
    );
});
