// Tests of tools/publish-hold.mjs: a publish hold npm will end by itself (accepted, not listed yet) is told
// apart from one npm refused, and only the first closes once npm lists every version.
//
//   node tools/publish-hold.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { acceptedSpecs, BOT, classify, settle, verdict } from "./publish-hold.mjs";

// One `nx release publish` task as run 38284393737 printed it (colors, tarball details, npm's answer).
const task = (name, version, answer) =>
    `##[group]\x1b[2m> \x1b[22mnx run ${name}:nx-release-publish\n\n=== Tarball Details ===\nname:          @graphty/${name}                \nversion:       ${version}                                  \nfilename:      graphty-${name}-${version}.tgz\n}\n\n${answer}\n##[endgroup]\n`;
const PUBLISHED = 'Published to https://registry.npmjs.org/ with tag "latest"';
const STAGED = "npm error code E409\nnpm error 409 Conflict - Cannot publish over previously staged version 0.9.20";
const REFUSED = "npm error code E403\nnpm error 403 Forbidden - You do not have permission to publish";

describe("acceptedSpecs", () => {
    it("names each version npm answered Published for, and none it refused", () => {
        const log = task("compact-mantine", "0.9.20", PUBLISHED) + task("layout", "2.4.3", REFUSED);
        assert.deepEqual([...acceptedSpecs(log)], ["@graphty/compact-mantine@0.9.20"]);
    });

    it("counts an upload an earlier attempt left staged as accepted", () => {
        assert.deepEqual(
            [...acceptedSpecs(task("compact-mantine", "0.9.20", STAGED))],
            ["@graphty/compact-mantine@0.9.20"],
        );
    });

    it("never carries one task's name into the next", () => {
        const log = task("layout", "2.4.3", REFUSED) + "##[group]> nx run graph-io:nx-release-publish\n" + PUBLISHED;
        assert.equal(acceptedSpecs(log).size, 0);
    });
});

describe("classify", () => {
    const log = task("compact-mantine", "0.9.20", PUBLISHED) + task("layout", "2.4.3", REFUSED);

    it("awaits the registry when npm accepted every version it does not list yet", () => {
        assert.equal(
            classify(["@graphty/compact-mantine@0.9.20"], log),
            "<!-- publish-hold: awaiting-registry @graphty/compact-mantine@0.9.20 -->",
        );
    });

    it("holds for a person when any missing version was refused, or never checked", () => {
        for (const [absent, l] of [
            [["@graphty/compact-mantine@0.9.20", "@graphty/layout@2.4.3"], log],
            [["@graphty/graph-io@1.0.0"], log], // skipped: nx never tried it
            [[], log], // the registry check never ran (an earlier step failed)
            [["@graphty/compact-mantine@0.9.20"], ""], // no publish output
        ]) {
            assert.equal(classify(absent, l), "<!-- publish-hold: rejected -->");
        }
    });
});

const bot = (body) => ({ body, user: { login: BOT } });
const AWAIT = bot("held\n\n<!-- publish-hold: awaiting-registry a@1 b@2 -->");
const REJECT = bot("again\n\n<!-- publish-hold: rejected -->");

describe("verdict", () => {
    it("follows the newest marker the workflow wrote", () => {
        assert.deepEqual(verdict([AWAIT]).awaiting, ["a@1", "b@2"]);
        assert.deepEqual(verdict([AWAIT, REJECT]).awaiting, []);
        assert.deepEqual(verdict([REJECT, AWAIT]).awaiting, ["a@1", "b@2"]);
    });

    it("ignores a hold with no marker and markers anyone else wrote", () => {
        assert.deepEqual(verdict([bot("an older hold")]).awaiting, []);
        const forged = { body: "<!-- publish-hold: awaiting-registry a@1 -->", user: { login: "someone" } };
        assert.deepEqual(verdict([REJECT, forged]).awaiting, []);
    });
});

describe("settle", () => {
    const hold = (posts) => {
        const calls = [];
        const request = async (method, path, body) => {
            calls.push([method, path, body]);
            if (path === "/repos/o/r/issues/2189") return posts[0];
            if (path.startsWith("/repos/o/r/issues/2189/comments")) return method === "GET" ? posts.slice(1) : {};
            return {};
        };
        return { calls, request };
    };
    const run = "https://github.com/o/r/actions/runs/9";

    it("closes an awaiting hold once npm lists every version, saying nothing was missing", async () => {
        const { calls, request } = hold([AWAIT]);
        const r = await settle({ request, repo: "o/r", issue: "2189", run, listed: () => true });
        assert.equal(r.closed, true);
        const [, , comment] = calls.find(([m, p]) => m === "POST" && p.endsWith("/comments"));
        assert.match(
            comment.body,
            /npm now lists every version this hold was waiting for \(a@1, b@2\).*Nothing was missing/,
        );
        assert.deepEqual(calls.at(-1), [
            "PATCH",
            "/repos/o/r/issues/2189",
            { state: "closed", state_reason: "completed" },
        ]);
    });

    it("keeps an awaiting hold open while npm still does not list a version", async () => {
        const { calls, request } = hold([AWAIT]);
        const r = await settle({ request, repo: "o/r", issue: "2189", run, listed: (s) => s !== "b@2" });
        assert.deepEqual(r, { closed: false, awaiting: ["a@1", "b@2"], missing: ["b@2"] });
        assert.ok(calls.every(([m]) => m === "GET"));
    });

    it("never closes a hold npm refused, even when every version is listed by now", async () => {
        const { calls, request } = hold([AWAIT, REJECT]);
        const r = await settle({ request, repo: "o/r", issue: "2189", run, listed: () => true });
        assert.equal(r.closed, false);
        assert.ok(calls.every(([m]) => m === "GET"));
    });
});
