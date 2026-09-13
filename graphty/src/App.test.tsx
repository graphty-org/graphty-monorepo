import { describe, expect, it } from "vitest";

import { App } from "./App";
import { render, screen } from "./test/test-utils";

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
    describe("the default surface", () => {
        it("renders the app shell", () => {
            render(<App />);

            expect(screen.getByTestId("app-shell")).toBeInTheDocument();
        });

        it("draws the activity rail, which is the shell's left column", () => {
            render(<App />);

            expect(screen.getByRole("navigation", { name: "Activity rail" })).toBeInTheDocument();
        });
    });

    describe("the other branches", () => {
        // The superseded AppLayout shell and its ?legacy route were removed 2026-09
        // at the product owner's request. The parameter is not special-cased on the
        // way out, so it must fall through to the shell rather than error -- that
        // fall-through is the behaviour this asserts, in place of the old
        // "keeps the superseded shell reachable at ?legacy".
        it("falls through to the app shell at the retired ?legacy parameter", () => {
            withSearch("?legacy", () => {
                render(<App />);

                expect(screen.getByTestId("app-shell")).toBeInTheDocument();
            });
        });

        it("renders the compact component gallery at ?demo", () => {
            withSearch("?demo", () => {
                render(<App />);

                expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
            });
        });
    });
});
