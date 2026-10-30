/**
 * The start page inside the app's own frame (index.css, which keeps the workspace from ever
 * scrolling), on the REAL graphty-element: the page scrolls both ways by wheel, touch and keyboard;
 * its bar of facts ends the first view at iPad sizes; the theme button switches the theme in place;
 * and the sample library offers every dataset graph-samples lists that a browser opens in a moment.
 */

// The app's frame, as main.tsx loads it.
import "../../../index.css";
// Registers the real <graphty-element>, as the app's loader does.
import "@graphty/graphty-element";

import { DATASET_DESCRIPTORS, GENERATOR_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { DEFAULT_LIMITS } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it, onTestFailed } from "vitest";
import { page, userEvent } from "vitest/browser";

import { openBy } from "../../../test/open";
import { swipeOver, wheelOver } from "../../../test/real-pointer";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { clearRecent } from "../../project/recent";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * The wait for a scroll to land. A smooth scroll moves on the page's frames, and the hero graph
 * turning above it draws every one of them on the test browser's software GPU. With every core
 * busy, as in the pre-push gate, the page's tasks ran up to 0.8 s and one key press took 0.7 s, so
 * waitFor's own 1-second limit could fail a scroll that was on its way (End, once, in the gate).
 * These waits keep only the hang guard.
 */
const SCROLL = { timeout: TIMEOUT_MS };

/**
 * Renders the start page and waits for its graph to load.
 * @returns the store.
 */
async function startPage(): Promise<WorkspaceStore> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    await waitFor(
        () => {
            const hero = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                "graphty-element[data-start-page]",
            );
            assert.equal(hero?.session.data.statistics().nodeCount, 77);
        },
        { timeout: TIMEOUT_MS },
    );
    return store;
}

/**
 * How far the page is scrolled.
 * @returns the document's scroll offset.
 */
function scrolled(): number {
    return document.scrollingElement?.scrollTop ?? 0;
}

/**
 * Whether the page has come to rest at the samples: their top just under the sticky header, or
 * the page scrolled as far as it goes.
 * @param samples - The samples section.
 * @returns true once it has.
 */
function atSamples(samples: HTMLElement): boolean {
    const end = (document.scrollingElement?.scrollHeight ?? 0) - window.innerHeight;
    const header = Number.parseFloat(getComputedStyle(samples).scrollMarginTop) || 0;
    return Math.abs(samples.getBoundingClientRect().top - header) < 1 || scrolled() >= end - 1;
}

/**
 * Opens the start page and presses Samples, which scrolls the page down to them, and waits for the
 * page to come to rest there (its scrollend). Being at the samples is not enough: the smooth scroll
 * can reach them before its last frame (in 1 of 12 runs on a busy machine it ended after the
 * position check passed, and a frame on the CI runner's software GPU is long), so the keyboard test
 * pressed Home while that scroll was still running, and once the page stayed at the samples until
 * the test timed out (issue #3679). A reader presses the next key on a page that has stopped.
 * @returns the samples section.
 */
async function showSamples(): Promise<HTMLElement> {
    await startPage();
    const samples = screen.getByRole("region", { name: "Sample library" });
    let ended = false;
    const onEnd = (): void => {
        ended = true;
    };
    document.addEventListener("scrollend", onEnd);
    try {
        await userEvent.click(screen.getByRole("button", { name: "Samples" }));
        await waitFor(() => {
            assert.isTrue(atSamples(samples), "Samples scrolled the page down to them");
            assert.isTrue(ended, "the page came to rest");
        }, SCROLL);
    } finally {
        document.removeEventListener("scrollend", onEnd);
    }
    return samples;
}

beforeEach(async () => {
    await clearRecent();
    forgetUsageAnswer();
    await page.viewport(1440, 900);
    // The page under test stays mounted until the next render, so a test that scrolled it would
    // otherwise hand the next one a page that opens scrolled down.
    window.scrollTo(0, 0);
});

afterEach(async () => {
    await clearRecent();
});

describe("the start page in the app's frame", () => {
    it("scrolls down to the samples, and back up and down again by wheel", async () => {
        const samples = await showSamples();

        // The wheel over the samples, then over the headline (the graph's canvas keeps the wheel
        // for zooming the graph).
        await wheelOver(screen.getByRole("heading", { name: "Sample library" }), -5000);
        await waitFor(() => {
            assert.equal(scrolled(), 0, "the wheel scrolled it back up");
        }, SCROLL);
        // As far as the samples, not past them: the library runs on well below its top.
        const header = Number.parseFloat(getComputedStyle(samples).scrollMarginTop) || 0;
        await wheelOver(screen.getByRole("heading", { level: 1 }), samples.getBoundingClientRect().top - header);
        await waitFor(() => {
            assert.isTrue(atSamples(samples), "the wheel scrolled it down");
        }, SCROLL);
    });

    it("shows the header's own lockup only once the page is scrolled past the big one", async () => {
        await startPage();
        const samples = screen.getByRole("region", { name: "Sample library" });
        const header = document.querySelector<HTMLElement>(".ws-land-top");
        assert.isUndefined(header?.dataset.scrolled, "at the top, the big lockup is in view");

        // A window shrunk to nothing and back, as a screenshot tool does, is not a scroll.
        await page.viewport(1, 1);
        await page.viewport(1440, 900);
        await waitFor(() => {
            assert.equal(window.innerWidth, 1440);
        });
        assert.isUndefined(header?.dataset.scrolled, "a resize did not scroll the page");

        await userEvent.click(screen.getByRole("button", { name: "Samples" }));
        await waitFor(() => {
            assert.isTrue(atSamples(samples), "Samples scrolled the page down to them");
            assert.equal(header?.dataset.scrolled, "true", "scrolled down, the header shows its lockup");
        }, SCROLL);
        await wheelOver(screen.getByRole("heading", { name: "Sample library" }), -5000);
        await waitFor(() => {
            assert.isUndefined(header?.dataset.scrolled, "back at the top, it hides it again");
        }, SCROLL);
    });

    it("scrolls back up from the samples by touch", async () => {
        await showSamples();

        // A finger moving down the page scrolls it up.
        const before = scrolled();
        await swipeOver(screen.getByRole("heading", { name: "Sample library" }), 400);
        await waitFor(() => {
            assert.isBelow(scrolled(), before, "a swipe scrolled it back up");
        }, SCROLL);
    });

    it("scrolls back up from the samples, and down again, by keyboard", async () => {
        // This test timed out twice in CI (issues #3679 and #4170) and in no run here, and its waits'
        // hang guard is longer than the test's limit, so a timeout never says which wait was stuck.
        // Its trail does: each step and every scroll end and key the page saw, printed on a failure.
        const trail: string[] = [];
        const start = performance.now();
        const note = (what: string): void => {
            const at = Math.round(performance.now() - start);
            const focus = document.activeElement;
            trail.push(`${String(at)} ms ${what}: top ${String(scrolled())}, focus ${focus?.tagName ?? "none"}`);
        };
        const onEnd = (): void => {
            note("scrollend");
        };
        const onKey = (event: KeyboardEvent): void => {
            note(`keydown ${event.key}${event.defaultPrevented ? " (prevented)" : ""}`);
        };
        document.addEventListener("scrollend", onEnd);
        globalThis.addEventListener("keydown", onKey);
        onTestFailed(() => {
            note("failed");
            console.error(`the keyboard scroll test's trail:\n${trail.join("\n")}`);
        });
        try {
            await showSamples();
            note("at the samples");
            await userEvent.keyboard("{Home}");
            note("Home pressed");
            await waitFor(() => {
                assert.equal(scrolled(), 0, "Home scrolled it back up");
            }, SCROLL);
            note("at the top");
            await userEvent.keyboard("{End}");
            note("End pressed");
            await waitFor(() => {
                assert.isAbove(scrolled(), 0, "End scrolled it down");
            }, SCROLL);
        } finally {
            document.removeEventListener("scrollend", onEnd);
            globalThis.removeEventListener("keydown", onKey);
        }
    });

    // Full screen, and under Safari's address and tab bars (upright, and on its side).
    for (const [width, height] of [
        [1180, 820],
        [820, 1180],
        [820, 1080],
        [820, 1000],
        [1024, 640],
    ]) {
        it(`ends the first view with the bar of facts on an iPad, ${String(width)} x ${String(height)}`, async () => {
            await page.viewport(width, height);
            await startPage();
            const bar = screen.getByRole("complementary", { name: "graphty at a glance" });
            // The first view is the page at the top. The previous test's page can still be
            // finishing a smooth scroll when this one mounts, so put it at the top and wait there.
            window.scrollTo(0, 0);
            await waitFor(() => {
                assert.equal(scrolled(), 0, "the page is at the top");
                const box = bar.getBoundingClientRect();
                assert.isAtMost(box.bottom, window.innerHeight, "the bar is inside the first view");
                assert.isAbove(box.top, window.innerHeight / 2, "the bar is at the foot of the view");
                // The count comes from the hero's session, which the page gets only once the
                // sample's import has resolved: after the element already holds its 77 nodes.
                assert.isNotNull(bar.textContent?.match(/\d+ algorithms/), "the bar names the algorithms");
            });
        });
    }

    it("switches the theme in place from the button at the top right", async () => {
        await startPage();
        const land = document.querySelector<HTMLElement>(".ws-land");
        const before = land?.dataset.scheme;
        const next = before === "dark" ? "light" : "dark";

        await userEvent.click(screen.getByRole("button", { name: `Switch to ${next} mode` }));
        await waitFor(() => {
            assert.equal(document.querySelector<HTMLElement>(".ws-land")?.dataset.scheme, next);
        });
        assert.isNull(screen.queryByRole("dialog"), "no settings opened");
        assert.isNotNull(screen.getByRole("button", { name: `Switch to ${before ?? "dark"} mode` }));
    });

    it("offers every dataset graph-samples lists that graphty-element opens, and opens one", async () => {
        const store = await startPage();
        const offered = screen
            .getAllByRole("button", { name: /^Open the .+ sample$/ })
            .map((button) => button.getAttribute("aria-label"));
        const opens = DATASET_DESCRIPTORS.filter(
            (dataset) => dataset.nodes <= DEFAULT_LIMITS.renderCeiling && dataset.edges <= DEFAULT_LIMITS.edgesDrawn,
        );
        // Plus the app's four timed samples, which have no graph-samples dataset.
        assert.lengthOf(offered, opens.length + 4);
        for (const title of [
            "Doubtful Sound dolphins",
            "OpenFlights airline routes",
            "Generic GO slim (Gene Ontology)",
        ]) {
            assert.include(offered, `Open the ${title} sample`);
        }

        const opened = await openBy(store, () =>
            userEvent.click(screen.getByRole("button", { name: "Open the Doubtful Sound dolphins sample" })),
        );
        assert.equal(opened.data.statistics().nodeCount, 62);
        assert.equal(opened.data.statistics().edgeCount, 159);
        assert.equal(store.get().project?.name, "Doubtful Sound dolphins");
        assert.isNull(store.get().notice);
    });

    it("opens the timed campus contacts sample, every hour two students were close an edge", async () => {
        const store = await startPage();

        const opened = await openBy(store, () =>
            userEvent.click(screen.getByRole("button", { name: "Open the Campus contacts sample" })),
        );
        assert.equal(opened.data.statistics().nodeCount, 615);
        assert.equal(opened.data.statistics().edgeCount, 8142);
        assert.equal(store.get().project?.name, "Campus contacts");
        assert.isNull(store.get().notice);
        // Every edge's `time` reads as time, so the timeline can take it.
        const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        const time = element?.session.time.candidates().find((each) => each.column === "time");
        assert.deepInclude(time, { kind: "edge", parsed: 8142, total: 8142 });
    });

    it("says what a large dataset takes before it downloads, and leaves out one the element does not open", async () => {
        const store = await startPage();

        const large = screen.getByRole("button", { name: "Open the Gene Ontology (go-basic) sample" });
        assert.include(large.textContent, "48,340 nodes, 71,496 edges");
        assert.include(large.textContent, "Large: 1.4 MB, slower to open");
        await userEvent.click(large);
        const dialog = await screen.findByRole("dialog", { name: "Gene Ontology (go-basic)" });
        assert.include(dialog.textContent, "48,340 nodes and 71,496 edges, a 1.4 MB download.");
        assert.include(dialog.textContent, "takes a while to open");
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });
        assert.isNull(store.get().project, "nothing opened");

        // The license is where the data comes from, said once, under the size; Open is always there.
        await userEvent.click(large);
        const again = await screen.findByRole("dialog", { name: "Gene Ontology (go-basic)" });
        assert.include(again.textContent, "License: CC BY 4.0");
        assert.isNotNull(within(again).queryByRole("button", { name: "Open" }));
        await userEvent.click(within(again).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });

        // A dataset past graphty-element's published ceilings has no tile: it could only open empty.
        for (const dataset of DATASET_DESCRIPTORS) {
            const tile = screen.queryByRole("button", { name: `Open the ${dataset.title} sample` });
            const fits = dataset.nodes <= DEFAULT_LIMITS.renderCeiling && dataset.edges <= DEFAULT_LIMITS.edgesDrawn;
            if (!fits) {
                assert.isNull(tile, `${dataset.name} is left out`);
            }
        }
        assert.isNull(screen.queryByText(/Too large/), "no tile offers what does not open");
    });

    it("lists every generator, and generates a small graph with the parameters set", async () => {
        const store = await startPage();
        const generators = screen.getAllByRole("button", { name: /^Generate a graph: / });
        assert.lengthOf(generators, GENERATOR_DESCRIPTORS.length);

        const library = screen.getByRole("region", { name: "Sample library" });
        await userEvent.type(within(library).getByRole("searchbox", { name: "Search samples" }), "small world");
        assert.deepEqual(
            within(library)
                .getAllByRole("button", { name: /^Generate a graph: / })
                .map((button) => button.getAttribute("aria-label")),
            ["Generate a graph: Newman-Watts", "Generate a graph: Watts-Strogatz"],
        );

        await userEvent.click(screen.getByRole("button", { name: "Generate a graph: Watts-Strogatz" }));
        const dialog = await screen.findByRole("dialog", { name: "Watts-Strogatz" });
        const nodes = within(dialog).getByRole("textbox", { name: "Nodes" });
        assert.equal((nodes as HTMLInputElement).value, "60");
        await userEvent.tripleClick(nodes);
        await userEvent.keyboard("24");
        const opened = await openBy(store, () =>
            userEvent.click(within(dialog).getByRole("button", { name: "Generate" })),
        );
        assert.equal(opened.data.statistics().nodeCount, 24);
        // A ring of 24 with 4 neighbors each keeps 24 * 4 / 2 edges through the rewiring.
        assert.equal(opened.data.statistics().edgeCount, 48);
        assert.equal(store.get().project?.name, "Watts-Strogatz");
        assert.isNull(store.get().notice);
    });
});
