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
    it("renders the workspace, on its start screen", () => {
        render(<App />);

        expect(screen.getByRole("region", { name: "Samples" })).toBeInTheDocument();
    });

    it("renders the compact component gallery at ?demo", () => {
        withSearch("?demo", () => {
            render(<App />);

            expect(screen.queryByRole("region", { name: "Samples" })).not.toBeInTheDocument();
        });
    });

    for (const search of ["?next", "?legacy"]) {
        it(`still renders the workspace at ${search}, so old links keep working`, () => {
            withSearch(search, () => {
                render(<App />);

                expect(screen.getByRole("region", { name: "Samples" })).toBeInTheDocument();
            });
        });
    }
});
