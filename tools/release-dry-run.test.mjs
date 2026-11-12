// Tests of tools/release-dry-run.mjs, the gate's release dry run: which pushes run it, that nx runs with
// CI=true (without it nx asks a question, takes "no" and exits 0), and that a failing dry run fails the
// push with nx's own error line.
//
//   node --test tools/release-dry-run.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { check, touchesRelease } from "./release-dry-run.mjs";

const NX_ERROR =
    'NX   Unable to resolve the current version from git tag using pattern "{projectName}@{version}" and ' +
    "there is no version on disk to fall back to.";

function run(files, command) {
    const lines = [];
    const code = check(files, { ...process.env, CI: "", RELEASE_DRY_RUN_COMMAND: command }, (l) => lines.push(l));
    return { code, out: lines.join("\n") };
}

describe("touchesRelease", () => {
    it("is true for a package.json, project.json, nx.json or release-hold.json anywhere it applies", () => {
        for (const f of [
            "package.json",
            "graph-io/test/fidelity/oracles/tools/web/package.json",
            "graphty/project.json",
            "nx.json",
            "release-hold.json",
        ]) {
            assert.equal(touchesRelease([f]), true, f);
        }
    });

    it("is false for anything else", () => {
        assert.equal(touchesRelease(["tools/land.mjs", "docs/nx.json.md", "a/nx.json", "package.json.bak"]), false);
        assert.equal(touchesRelease([]), false);
    });
});

describe("check", () => {
    it("does not run the dry run when no release file changed", () => {
        const { code, out } = run(["tools/land.mjs"], "exit 1");
        assert.equal(code, 0);
        assert.match(out, /no release dry run needed/);
    });

    it("fails the push with nx's error when the dry run fails", () => {
        const { code, out } = run(["new/package.json"], `echo '${NX_ERROR}' >&2; exit 1`);
        assert.equal(code, 1);
        assert.match(out, /Unable to resolve the current version from git tag/);
        assert.match(out, /failed \(exit 1\): the release train would fail on this change/);
    });

    it("runs nx with CI=true and HUSKY=0, so nx fails instead of asking", () => {
        const { code, out } = run(["nx.json"], '[ "$CI" = true ] && [ "$HUSKY" = 0 ] && echo non-interactive');
        assert.equal(code, 0, out);
        assert.match(out, /passed/);
    });

    it("warns and passes when GitHub refuses nx with a 403 or a rate limit", () => {
        for (const msg of ["NX   Request failed with status code 403", "API rate limit exceeded for user"]) {
            const { code, out } = run(["nx.json"], `echo '${msg}' >&2; exit 1`);
            assert.equal(code, 0, out);
            assert.match(out, /WARNING: .* refused by GitHub/);
            assert.match(out, /did NOT check this push/);
        }
    });

    it("still fails on any other error", () => {
        const { code } = run(["nx.json"], "echo 'NX   Request failed with status code 500' >&2; exit 1");
        assert.equal(code, 1);
    });
});
