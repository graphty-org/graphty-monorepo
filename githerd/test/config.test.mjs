import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import {
    CONFIG_FILE,
    DEFAULTS,
    defaultBranch,
    effectiveMode,
    normalizeConfig,
    repoRoot,
    resolveConfig,
} from "../lib/config.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MINIMAL = { repo: "o/r", lanes: { ci: { workflow: "ci.yml", gating: "required" } } };
const with_ = (extra) => normalizeConfig({ ...MINIMAL, ...extra });

describe("normalizeConfig", () => {
    it("fills the defaults", () => {
        const c = normalizeConfig(MINIMAL);
        expect(c.mode).toBe("dry-run");
        expect(c.pollSeconds).toBe(180);
        expect(c.servherdCommand).toEqual(["npx", "-y", "servherd"]);
        expect(c.actions).toEqual({
            statuses: false,
            prUpkeep: false,
            runWrites: false,
            proposals: false,
            incidents: false,
        });
        expect(c.protectedPaths).toEqual(DEFAULTS.protectedPaths);
        expect(c.noAutoMergePaths).toEqual(DEFAULTS.noAutoMergePaths);
        expect(c.notify).toEqual({ command: null, maxPerHour: 6 });
        expect(c.ownerGate).toBeNull();
        expect(c.worktreeSetup).toBeNull();
        expect(c.runs.caps.default).toEqual({ turns: 30, budgetUsd: 1.5, timeoutMinutes: 15 });
        expect(c.lanes.ci).toEqual({ workflow: "ci.yml", gating: "required", maxMinutes: null });
    });

    it("does not share default objects between results", () => {
        const a = normalizeConfig(MINIMAL);
        a.runs.caps.default.turns = 999;
        a.protectedPaths.push("x");
        expect(normalizeConfig(MINIMAL).runs.caps.default.turns).toBe(30);
        expect(normalizeConfig(MINIMAL).protectedPaths).not.toContain("x");
    });

    it("rejects unknown keys at every level", () => {
        expect(() => with_({ pollSecond: 60 })).toThrow(/pollSecond is not a setting/);
        expect(() => with_({ actions: { merges: true } })).toThrow(/actions\.merges is not a setting/);
        expect(() =>
            with_({ runs: { caps: { default: { turns: 1, budgetUsd: 1, timeoutMinutes: 1, x: 1 } } } }),
        ).toThrow(/runs\.caps\.default\.x is not a setting/);
        expect(() => with_({ lanes: { ci: { workflow: "ci.yml", gating: "required", extra: 1 } } })).toThrow(
            /lanes\.ci\.extra/,
        );
        expect(() => with_({ notify: { cmd: [] } })).toThrow(/notify\.cmd/);
    });

    it.each([
        ["pushToDefaultBranch", { pushToDefaultBranch: true }],
        ["merge", { actions: { merge: true } }],
        ["approveVisual", { approveVisual: true }],
        ["deleteBranches", { deleteBranches: true }],
        ["deleteLabels", { actions: { deleteLabels: true } }],
        ["repos", { repos: ["other/repo"] }],
        ["removeProtectedPaths", { removeProtectedPaths: [".github/"] }],
        ["reverts", { actions: { reverts: true } }],
    ])("rejects the forbidden key %s", (key, extra) => {
        expect(() => with_(extra)).toThrow(new RegExp(`${key} is forbidden`));
    });

    it("adds a repository's lists to the default protected lists, and cannot drop one", () => {
        const c = with_({ protectedPaths: ["visual-baselines/"], noAutoMergePaths: ["githerd/", ".github/"] });
        for (const p of DEFAULTS.protectedPaths) {
            expect(c.protectedPaths).toContain(p);
            expect(c.noAutoMergePaths).toContain(p);
        }
        expect(c.protectedPaths).toContain("visual-baselines/");
        expect(c.noAutoMergePaths.filter((p) => p === ".github/")).toHaveLength(1);
        expect(with_({ protectedPaths: [] }).protectedPaths).toEqual(DEFAULTS.protectedPaths);
        expect(() => with_({ protectedPaths: ["../outside"] })).toThrow(/inside the repository/);
    });

    it("has no list of trusted authors: githerd trusts only the account gh is logged in as", () => {
        for (const list of [[], ["apowers313"], ["apowers313", "someone"]]) {
            expect(() => with_({ trustedAuthors: list })).toThrow(/trustedAuthors is forbidden.*gh is logged in as/);
        }
        expect(Object.keys(with_({}))).not.toContain("trustedAuthors");
    });

    it("lets reverts happen only through actions.incidents", () => {
        expect(with_({ actions: { incidents: true } }).actions.incidents).toBe(true);
        expect(() => with_({ revert: true })).toThrow(/revert is forbidden.*incident issue/);
        expect(() => with_({ grace: { revertMinutes: 0 } })).toThrow(/grace\.revertMinutes/);
    });

    it.each([
        [{ repo: "nope" }, /repo must be/],
        [{ lanes: {} }, /lanes must name at least one/],
        [{ lanes: { ci: { workflow: "ci.yml", gating: "sometimes" } } }, /gating/],
        [{ mode: "yolo" }, /mode must be/],
        [{ pollSeconds: 30 }, /pollSeconds must be an integer at least 60/],
        [{ actions: { statuses: "yes" } }, /actions\.statuses must be true or false/],
        [{ release: { commitPattern: "(", stallHours: 6 } }, /not a valid regular expression/],
        [{ grace: { closeIssueDays: 2, closeIssueShownDays: 3 } }, /closeIssueShownDays/],
        [{ digest: { weekday: "funday" } }, /digest\.weekday/],
        [{ retriage: { startHourUtc: 24 } }, /from 0 to 23/],
        [{ runs: { caps: { "pr-fix": { turns: 10 } } } }, /runs\.caps\.pr-fix\.budgetUsd is required/],
        [{ servherdCommand: [] }, /non-empty array/],
        [{ runRulesFile: "/etc/passwd" }, /inside the repository/],
        [{ ownerGate: { steps: [] } }, /ownerGate\.steps/],
        [[], /must be a JSON object/],
    ])("rejects %j", (extra, message) => {
        expect(() => (Array.isArray(extra) ? normalizeConfig(extra) : with_(extra))).toThrow(message);
    });

    it("keeps the default cap and model when a repository adds kinds", () => {
        const c = with_({
            runs: {
                model: { "master-red": "opus" },
                caps: { backlog: { turns: 80, budgetUsd: 5, timeoutMinutes: 60 } },
            },
        });
        expect(c.runs.model).toEqual({ default: "sonnet", "backlog-high": "opus", "master-red": "opus" });
        expect(Object.keys(c.runs.caps).sort()).toEqual(["backlog", "backlog-high", "default"]);
    });

    it("validates graphty's real file", () => {
        const c = normalizeConfig(JSON.parse(readFileSync(join(ROOT, CONFIG_FILE), "utf8")));
        expect(c.repo).toBe("graphty-org/graphty-monorepo");
        expect(c.mode).toBe("dry-run");
        expect(Object.values(c.actions).every((v) => v === false)).toBe(true);
        expect(c.protectedPaths).toEqual(
            expect.arrayContaining(["visual-baselines/", "githerd/", ...DEFAULTS.protectedPaths]),
        );
        expect(c.ownerGate?.reviewServer?.name).toBe("visual-review");
    });
});

describe("effectiveMode", () => {
    const acting = { mode: "acting" };
    it("only lowers", () => {
        expect(effectiveMode(acting, null)).toBe("acting");
        expect(effectiveMode(acting, "paused")).toBe("paused");
        expect(effectiveMode(acting, "dry-run")).toBe("dry-run");
        expect(effectiveMode({ mode: "dry-run" }, "acting")).toBe("dry-run");
        expect(effectiveMode({ mode: "paused" }, "dry-run")).toBe("paused");
        expect(effectiveMode(acting, "bogus")).toBe("acting");
    });
});

describe("resolveConfig", () => {
    let dir;
    let remote;
    let clone;
    const valid = JSON.stringify({ ...MINIMAL, repo: "o/from-remote" });

    beforeAll(() => {
        isolateGit();
        dir = mkdtempSync(join(tmpdir(), "githerd-config-"));
        remote = join(dir, "remote.git");
        const seed = join(dir, "seed");
        git(dir, "init", "--bare", "-b", "main", remote);
        mkdirSync(seed);
        git(seed, "init", "-b", "main");
        writeFileSync(join(seed, CONFIG_FILE), valid);
        git(seed, "add", ".");
        git(seed, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "config");
        git(seed, "push", remote, "main");
        clone = join(dir, "clone");
        git(dir, "clone", remote, clone);
    });
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it("finds the default branch and the root from a worktree", () => {
        expect(defaultBranch(clone)).toBe("main");
        const wt = join(dir, "wt");
        git(clone, "worktree", "add", "-b", "side", wt);
        expect(repoRoot(join(wt))).toBe(repoRoot(clone));
        expect(repoRoot(clone)).toBe(clone);
        git(clone, "worktree", "remove", wt);
    });

    it("reads the default branch's file", () => {
        const r = resolveConfig(clone, {});
        expect(r.configured && r.config.repo).toBe("o/from-remote");
        expect(r.configured && r.source).toBe(`origin/main:${CONFIG_FILE}`);
    });

    it("ignores a working tree edit", () => {
        writeFileSync(join(clone, CONFIG_FILE), JSON.stringify({ ...MINIMAL, repo: "o/working-tree" }));
        const r = resolveConfig(clone, {});
        expect(r.configured && r.config.repo).toBe("o/from-remote");
        writeFileSync(join(clone, CONFIG_FILE), valid);
    });

    it("prefers GITHERD_CONFIG", () => {
        const file = join(dir, "dev.json");
        writeFileSync(file, JSON.stringify({ ...MINIMAL, repo: "o/dev" }));
        const r = resolveConfig(clone, { GITHERD_CONFIG: file });
        expect(r.configured && r.config.repo).toBe("o/dev");
        writeFileSync(file, "{");
        expect(() => resolveConfig(clone, { GITHERD_CONFIG: file })).toThrow(/not valid JSON/);
    });

    it("is not configured with neither", () => {
        const bare = join(dir, "lonely");
        mkdirSync(bare);
        git(bare, "init", "-b", "main");
        expect(defaultBranch(bare)).toBeNull();
        expect(resolveConfig(bare, {})).toEqual({ configured: false, reason: expect.stringMatching(/not configured/) });
        git(bare, "remote", "add", "origin", remote);
        git(bare, "fetch", "origin");
        git(bare, "remote", "set-head", "origin", "main");
        git(
            bare,
            "update-ref",
            "refs/remotes/origin/main",
            git(
                bare,
                "-c",
                "user.name=t",
                "-c",
                "user.email=t@t",
                "commit-tree",
                "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
                "-m",
                "empty",
            ),
        );
        expect(resolveConfig(bare, {})).toEqual({
            configured: false,
            reason: expect.stringMatching(/no githerd\.config\.json/),
        });
    });

    it("throws outside a repository", () => {
        expect(() => repoRoot(tmpdir())).toThrow(/not inside a git repository/);
    });
});
