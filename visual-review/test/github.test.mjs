import { describe, expect, it } from "vitest";

import { pullRequestContext, reviewerLogin } from "../trusted/lib/github.mjs";

/**
 * A gh runner answering `gh api <path>` from a map of paths to replies.
 * @param {Record<string, unknown>} replies the reply per path
 * @returns {(args: string[]) => Promise<string>} the runner
 */
const ghWith =
    (replies) =>
    async ([, path]) =>
        JSON.stringify(replies[path] ?? {});

describe("pullRequestContext", () => {
    it("takes a personal repository's owner as the owner, and marks the comments that owner wrote", async () => {
        const gh = ghWith({
            "repos/{owner}/{repo}/pulls/9": {
                title: "fix",
                body: null,
                user: { login: "ann" },
                base: { repo: { owner: { login: "ann", type: "User" } } },
            },
            "repos/{owner}/{repo}/issues/9/comments?per_page=100": [
                { user: { login: "ann" }, body: "ok", created_at: "2026-10-07T01:00:00Z" },
                { body: 7 },
            ],
        });
        expect(await pullRequestContext(gh, 9, "someone-else")).toEqual({
            title: "fix",
            body: "",
            author: "ann",
            owner: "ann",
            createdAt: null,
            comments: [
                { author: "ann", at: "2026-10-07T01:00:00Z", body: "ok", byOwner: true },
                { author: null, at: null, body: "", byOwner: false },
            ],
        });
    });

    it("reads a pull request GitHub says nothing about as empty, with no owner when no one reviews", async () => {
        const gh = ghWith({
            "repos/{owner}/{repo}/pulls/9": { base: { repo: { owner: { type: "User" } } } },
            "repos/{owner}/{repo}/issues/9/comments?per_page=100": { message: "Not Found" },
        });
        expect(await pullRequestContext(gh, 9, null)).toEqual({
            title: "",
            body: "",
            author: null,
            owner: null,
            createdAt: null,
            comments: [],
        });
        const org = ghWith({
            "repos/{owner}/{repo}/pulls/9": {},
            "repos/{owner}/{repo}/issues/9/comments?per_page=100": [{ user: { login: "x" }, body: "hi" }],
        });
        expect((await pullRequestContext(org, 9, null)).comments[0].byOwner).toBe(false);
    });
});

describe("reviewerLogin", () => {
    it("is gh's login, or null when GitHub names none", async () => {
        expect(await reviewerLogin(ghWith({ user: { login: "owner" } }))).toBe("owner");
        expect(await reviewerLogin(ghWith({}))).toBeNull();
    });
});
