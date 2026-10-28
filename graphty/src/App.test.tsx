import { describe, expect, it } from "vitest";

import { App } from "./App";
import { render, screen } from "./test/test-utils";

/**
 * Renders the app with a query string in force, and puts the location back afterwards
 * so one board cannot decide the next one's branch.
 * @param search - the query string to render under, e.g. "?demo".
 * @param assert - what to check while that branch is drawn.
 * @returns settles once checked.
 */
async function withSearch(search: string, assert: () => void | Promise<void>): Promise<void> {
    const before = `${window.location.pathname}${window.location.search}`;

    window.history.pushState({}, "", search);

    try {
        await assert();
    } finally {
        window.history.pushState({}, "", before);
    }
}

describe("App", () => {
    it("renders the workspace, on its start screen", async () => {
        render(<App />);

        expect(await screen.findByRole("button", { name: /^Open a file/ })).toBeInTheDocument();
    });

    it("renders the compact component gallery at ?demo", async () => {
        await withSearch("?demo", () => {
            render(<App />);

            expect(screen.queryByRole("button", { name: /^Open a file/ })).not.toBeInTheDocument();
        });
    });

    for (const search of ["?next", "?legacy"]) {
        it(`still renders the workspace at ${search}, so old links keep working`, async () => {
            await withSearch(search, async () => {
                render(<App />);

                expect(await screen.findByRole("button", { name: /^Open a file/ })).toBeInTheDocument();
            });
        });
    }
});
