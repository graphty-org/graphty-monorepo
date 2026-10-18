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

import { DATASETS } from "@graphty/graph-samples";
import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { swipeOver, wheelOver } from "../../../test/real-pointer";
import { render, screen, waitFor } from "../../../test/test-utils";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { clearRecent } from "../../project/recent";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

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
 * Whether the page has come to rest at the samples: their top at the top of the window, or the
 * page scrolled as far as it goes.
 * @param samples - The samples section.
 * @returns true once it has.
 */
function atSamples(samples: HTMLElement): boolean {
    const end = (document.scrollingElement?.scrollHeight ?? 0) - window.innerHeight;
    return Math.abs(samples.getBoundingClientRect().top) < 1 || scrolled() >= end - 1;
}

/**
 * Opens the start page and presses Samples, which scrolls the page down to them.
 * @returns the samples section.
 */
async function showSamples(): Promise<HTMLElement> {
    await startPage();
    const samples = screen.getByRole("region", { name: "Samples" });
    await userEvent.click(screen.getByRole("button", { name: "Samples" }));
    await waitFor(() => {
        assert.isTrue(atSamples(samples), "Samples scrolled the page down to them");
    });
    return samples;
}

beforeEach(async () => {
    await clearRecent();
    forgetUsageAnswer();
    await page.viewport(1440, 900);
});

afterEach(async () => {
    await clearRecent();
});

describe("the start page in the app's frame", () => {
    it("scrolls down to the samples, and back up and down again by wheel", async () => {
        const samples = await showSamples();

        // The wheel over the samples, then over the headline (the graph's canvas keeps the wheel
        // for zooming the graph).
        await wheelOver(samples, -5000);
        await waitFor(() => {
            assert.equal(scrolled(), 0, "the wheel scrolled it back up");
        });
        await wheelOver(screen.getByRole("heading", { level: 1 }), 5000);
        await waitFor(() => {
            assert.isTrue(atSamples(samples), "the wheel scrolled it down");
        });
    });

    it("scrolls back up from the samples by touch", async () => {
        const samples = await showSamples();

        // A finger moving down the page scrolls it up.
        const before = scrolled();
        await swipeOver(samples, 400);
        await waitFor(() => {
            assert.isBelow(scrolled(), before, "a swipe scrolled it back up");
        });
    });

    it("scrolls back up from the samples, and down again, by keyboard", async () => {
        await showSamples();

        await userEvent.keyboard("{Home}");
        await waitFor(() => {
            assert.equal(scrolled(), 0, "Home scrolled it back up");
        });
        await userEvent.keyboard("{End}");
        await waitFor(() => {
            assert.isAbove(scrolled(), 0, "End scrolled it down");
        });
    });

    for (const [width, height] of [
        [1180, 820],
        [820, 1180],
    ]) {
        it(`ends the first view with the bar of facts on an iPad, ${String(width)} x ${String(height)}`, async () => {
            await page.viewport(width, height);
            await startPage();
            const bar = screen.getByRole("contentinfo");
            const box = bar.getBoundingClientRect();
            assert.isAtMost(box.bottom, window.innerHeight, "the bar is inside the first view");
            assert.isAbove(box.top, window.innerHeight / 2, "the bar is at the foot of the view");
            assert.isNotNull(bar.textContent?.match(/\d+ algorithms/), "the bar names the algorithms");
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

    it("offers every dataset graph-samples lists that opens in a moment, and opens one", async () => {
        const store = await startPage();
        const offered = screen
            .getAllByRole("button", { name: /^Open the .+ sample$/ })
            .map((button) => button.getAttribute("aria-label"));
        const small = DATASETS.filter((dataset) => dataset.nodes <= 5000);
        assert.lengthOf(offered, small.length);
        for (const title of [
            "Doubtful Sound dolphins",
            "OpenFlights airline routes",
            "Generic GO slim (Gene Ontology)",
        ]) {
            assert.include(offered, `Open the ${title} sample`);
        }

        await userEvent.click(screen.getByRole("button", { name: "Open the Doubtful Sound dolphins sample" }));
        await waitFor(
            () => {
                const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                    "graphty-element:not([data-start-page])",
                );
                assert.equal(element?.session.data.statistics().nodeCount, 62);
                assert.equal(element?.session.data.statistics().edgeCount, 159);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(store.get().project?.name, "Doubtful Sound dolphins");
        assert.isNull(store.get().notice);
    });
});
