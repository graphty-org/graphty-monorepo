import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { App } from "./App";
import { NARROW_BREAKPOINT } from "./components/shell/constants";
import { render, screen } from "./test/test-utils";

/**
 * The width these boards lay the shell out at.
 *
 * At `?classic`, `App` renders `<AppShell />` with no `initialShellWidth`, so the store measures the
 * real window -- and since 2026-09-14 the shell does not lay out at all below
 * {@link NARROW_BREAKPOINT}: it draws a "screen too small" state instead (product owner:
 * "there will be no more auto-hide. below 1280 should just say 'screen too small' or
 * something similar"). The headless Chromium these boards run in opens narrower than
 * that, so without this stub every board here would assert against the too-small state
 * rather than the shell. These boards are about the ROUTE `App` takes, not about the
 * breakpoint, so the width is pinned rather than asserted.
 */
const LAYOUT_WIDTH = NARROW_BREAKPOINT + 160;

/**
 * Renders the app with a query string in force, and puts the location back afterwards
 * so one board cannot decide the next one's branch.
 * @param search - the query string to render under, e.g. "?demo".
 * @param assert - what to check while that branch is drawn.
 */
function withSearch(search: string, assert: () => void): void {
    const before = `${window.location.pathname}${window.location.search}`;

    window.history.pushState({}, "", search);

    try {
        assert();
    } finally {
        window.history.pushState({}, "", before);
    }
}

describe("App", () => {
    const realInnerWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");

    beforeAll(() => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: LAYOUT_WIDTH });
    });

    afterAll(() => {
        if (realInnerWidth === undefined) {
            Reflect.deleteProperty(window, "innerWidth");
        } else {
            Object.defineProperty(window, "innerWidth", realInnerWidth);
        }
    });

    describe("the default surface", () => {
        it("renders the tier 1 workspace, on its start screen", () => {
            render(<App />);

            expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
            expect(screen.getByRole("region", { name: "Samples" })).toBeInTheDocument();
        });
    });

    describe("the other branches", () => {
        it("renders the classic app shell at ?classic, with its activity rail", () => {
            withSearch("?classic", () => {
                render(<App />);

                expect(screen.getByTestId("app-shell")).toBeInTheDocument();
                expect(screen.getByRole("navigation", { name: "Activity rail" })).toBeInTheDocument();
            });
        });

        // ?next reached the workspace before it became the default; old links keep working.
        it("still renders the workspace at ?next", () => {
            withSearch("?next", () => {
                render(<App />);

                expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
                expect(screen.getByRole("region", { name: "Samples" })).toBeInTheDocument();
            });
        });

        // The superseded AppLayout and its ?legacy route were removed 2026-09; an unrecognised
        // parameter falls through to the default surface rather than erroring.
        it("falls through to the workspace at the retired ?legacy parameter", () => {
            withSearch("?legacy", () => {
                render(<App />);

                expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
                expect(screen.getByRole("region", { name: "Samples" })).toBeInTheDocument();
            });
        });

        it("renders the compact component gallery at ?demo", () => {
            withSearch("?demo", () => {
                render(<App />);

                expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
                expect(screen.queryByRole("region", { name: "Samples" })).not.toBeInTheDocument();
            });
        });
    });
});
