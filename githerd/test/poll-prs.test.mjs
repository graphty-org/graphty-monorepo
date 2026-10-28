import { describe, expect, it } from "vitest";

import { openPullRequests } from "../lib/daemon.mjs";
import { createGitHub } from "../lib/github.mjs";
import { createFakeGh, httpOutput } from "./helpers/fake-gh.mjs";

const PRS = Array.from({ length: 20 }, (_, i) => ({ number: i + 1 }));
const GATEWAY_TIMEOUT = "<!DOCTYPE html><html><body>504 Gateway Timeout</body></html>";

/**
 * A client over a fake GitHub that answers the open pull request query a page at a time.
 * @param {(vars: {first: number, after: string | null}) => ReturnType<typeof httpOutput> | null} [override]
 *   an answer to give instead of the page, or null for the page
 * @returns {{gitHub: ReturnType<typeof createGitHub>, asked: {first: number, after: string | null}[]}} the
 *   client and the page variables each call asked for
 */
function setup(override = () => null) {
    /** @type {{first: number, after: string | null}[]} */
    const asked = [];
    const gh = createFakeGh(({ input }) => {
        const vars = JSON.parse(input ?? "{}").variables;
        asked.push({ first: vars.first, after: vars.after });
        const other = override(vars);
        if (other) return other;
        const from = vars.after ? Number(vars.after) : 0;
        const nodes = PRS.slice(from, from + vars.first);
        const to = from + nodes.length;
        return httpOutput({
            status: 200,
            body: {
                data: {
                    repository: {
                        defaultBranchRef: { name: "master", target: { oid: "abc" } },
                        pullRequests: { pageInfo: { hasNextPage: to < PRS.length, endCursor: String(to) }, nodes },
                    },
                },
            },
        });
    });
    const gitHub = createGitHub({
        repo: "o/r",
        fetch: gh.fetch,
        token: gh.token,
        mode: "dry-run",
        ledger: () => {},
        env: {},
    });
    return { gitHub, asked };
}

describe("the open pull request list", () => {
    it("reads every open pull request a page at a time", async () => {
        const { gitHub, asked } = setup();
        const repo = await openPullRequests(gitHub, "o", "r", 8);
        expect(repo.pullRequests.nodes.map((n) => n.number)).toEqual(PRS.map((p) => p.number));
        expect(repo.defaultBranchRef.name).toBe("master");
        expect(asked).toEqual([
            { first: 8, after: null },
            { first: 8, after: "8" },
            { first: 8, after: "16" },
        ]);
    });

    it("asks a page GitHub answered 504 again at half the size, instead of failing the poll", async () => {
        const { gitHub, asked } = setup(({ first }) =>
            first > 5
                ? httpOutput({ status: 504, headers: { "Content-Type": "text/html" }, body: GATEWAY_TIMEOUT })
                : null,
        );
        const repo = await openPullRequests(gitHub, "o", "r", 20);
        expect(repo.pullRequests.nodes).toHaveLength(20);
        expect(asked.slice(0, 3).map((a) => a.first)).toEqual([20, 10, 5]);
        expect(asked.slice(2).every((a) => a.first === 5)).toBe(true);
    });

    it("fails with GitHub's answer when even a page of one is refused", async () => {
        const { gitHub, asked } = setup(() =>
            httpOutput({ status: 504, headers: { "Content-Type": "text/html" }, body: GATEWAY_TIMEOUT }),
        );
        await expect(openPullRequests(gitHub, "o", "r", 4)).rejects.toMatchObject({
            kind: "server",
            message: "GitHub answered 504",
        });
        expect(asked.map((a) => a.first)).toEqual([4, 2, 1]);
    });

    it("fails an answer with errors and no data as a GraphQL error, not a TypeError", async () => {
        const { gitHub } = setup(() =>
            httpOutput({ status: 200, body: { errors: [{ message: "Something went wrong (timeout)" }] } }),
        );
        await expect(openPullRequests(gitHub, "o", "r", 1)).rejects.toMatchObject({
            kind: "graphql",
            message: expect.stringContaining("Something went wrong"),
        });
    });

    it("fails a 200 answer that holds no data as a GraphQL error, not a TypeError", async () => {
        const { gitHub } = setup(() =>
            httpOutput({ status: 200, headers: { "Content-Type": "text/html" }, body: GATEWAY_TIMEOUT }),
        );
        await expect(openPullRequests(gitHub, "o", "r", 1)).rejects.toMatchObject({
            kind: "graphql",
            message: expect.stringContaining("GraphQL answer had no data"),
        });
        const empty = setup(() => httpOutput({ status: 200, body: {} }));
        await expect(empty.gitHub.graphql("query { viewer { login } }")).rejects.toMatchObject({ kind: "graphql" });
    });
});
