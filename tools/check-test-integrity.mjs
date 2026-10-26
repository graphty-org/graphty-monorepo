#!/usr/bin/env node
// Fails a change that weakens or deletes tests (design/ci/channels-pipeline/budgets-and-trust.md,
// section 4.1). It reads `git diff -M <base>...<head>` and reports, in test files (`*.test.*`,
// `*.spec.*`, `*.stories.*`) and vitest configs:
//
//   - fewer test declarations (it, test, bench and story exports), net of the whole change, so a
//     test moved to another file or rewritten in place does not count as gone; a deleted test file
//     is named when the net drops;
//   - fewer assertions (expect, assert), net of the whole change;
//   - more .skip, .only, .fails, .skipIf, .runIf or pending-test modifiers, net of the whole change;
//   - a timeout that grows, a retry added or raised, a timeout added to a vitest config;
//   - a coverage threshold that drops or goes, a vitest config's include or exclude changed, a
//     vitest config deleted;
//   - any package.json `scripts` entry changed, the root package.json's `pnpm` field changed;
//   - a line removed from tools/tool-tests.txt (the tool tests CI runs) whose test file still exists;
//   - a story's or a Storybook preview's `parameters.chromatic` settings added or changed.
//
// A finding is not always wrong: a story removed with its feature is legitimate. The pull request
// check (pr-integrity.yml) lets a code owner's approval of the head clear it.
//
//   node tools/check-test-integrity.mjs [--base <ref>] [--head <ref>] [--json]
//   node tools/check-test-integrity.mjs --replay <since> <until> [--ref <ref>]
//
// --base defaults to origin/master and --head to HEAD. --replay runs the check on every `land:`
// merge on the first-parent history of --ref (default origin/golden) between the two dates, as
// <merge>^1..<merge> (what the landing changed), and prints one line per landing with findings.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TEST_FILE = /\.(test|spec|stories)\.[cm]?[jt]sx?$/;
const STORIES = /\.stories\.[cm]?[jt]sx?$/;
const VITEST_CONFIG = /(^|\/)vitest(\.[\w-]+)*\.config\.[cm]?[jt]s$/;
const PREVIEW = /(^|\/)\.storybook\/preview\.[cm]?[jt]sx?$/;
const PACKAGE_JSON = /(^|\/)package\.json$/;
const TOOL_TESTS = "tools/tool-tests.txt";

// Counted over each file's whole text with its comments removed, so removing a commented-out test is
// free and commenting tests out, with // or /* */, counts as removing them.
const DECL = /(?<![.\w$])(?:it|test|bench)(?:\.\w+)*\s*\(/g;
const STORY_EXPORT = /^export\s+const\s+\w+/;
const ASSERT = /(?<![.\w$])(?:expect|assert)\s*[.(]/g;
const SKIP = /(?<![\w$])(?:it|test|describe|suite|bench|ctx|context)\.(?:skip|only|todo|fails|skipIf|runIf)\b/g;
const NUMBER = String.raw`(\d[\d_]*(?:\s*\*\s*\d[\d_]*)*)`;
const TIMEOUT = new RegExp(String.raw`\b(timeout|testTimeout|hookTimeout|teardownTimeout)\s*:\s*${NUMBER}`, "g");
// vitest's own name; `retries` is Playwright's and, in tests, the code under test's option.
const RETRY = new RegExp(String.raw`\b(retry)\s*:\s*${NUMBER}`, "g");
const THRESHOLD = new RegExp(String.raw`\b(lines|functions|statements|branches)\s*:\s*${NUMBER}`, "g");
const ONLY = /(?<![\w$])(?:it|test|describe|suite|bench)\.only\b/g;
// Scripts that run without being named: npm's lifecycle scripts, and a pre/post hook of a script or of an npm
// command. `preview` or `postcss:build` hooks no such script, so it is an ordinary new script.
const NPM_LIFECYCLE = ["install", "uninstall", "prepare", "publish", "publishOnly", "pack", "version", "dependencies"];
const NPM_COMMANDS = new Set([...NPM_LIFECYCLE, "test", "start", "stop", "restart", "shrinkwrap"]);
/**
 * Whether npm runs a script without its being named.
 * @param name the script's name
 * @param scripts every script of the package
 * @returns boolean
 */
function isLifecycle(name, scripts = {}) {
    if (NPM_LIFECYCLE.includes(name)) return true;
    const hooked = /^(?:pre|post)(.+)$/u.exec(name)?.[1];
    return !!hooked && (NPM_COMMANDS.has(hooked) || Object.hasOwn(scripts, hooked));
}

const git = (args, cwd) =>
    execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "pipe"] });

// A line without its `//` comment; a block comment's continuation line is all comment.
function code(line) {
    const cut = line.indexOf("//");
    const kept = cut < 0 ? line : line.slice(0, cut);
    return kept.trimStart().startsWith("*") ? "" : kept;
}
const hits = (re, line) => (line.match(re) || []).length;

// Escapes, strings, line comments and block comments, in source order: a comment opener inside a
// string (a glob such as "src/**/*.test.ts") or a regex escape (/\/\//) is not a comment.
const LEXEME = new RegExp(
    [
        String.raw`\\[\s\S]`,
        String.raw`"(?:\\.|[^"\\\n])*"`,
        String.raw`'(?:\\.|[^'\\\n])*'`,
        String.raw`\`(?:\\[\s\S]|[^\`\\])*\``,
        String.raw`\/\/[^\n]*`,
        String.raw`\/\*[\s\S]*?(?:\*\/|$)`,
    ].join("|"),
    "g",
);
// A file's lines with every comment blanked; a block comment keeps its line breaks.
const codeLines = (text) => text.replaceAll(LEXEME, (m) => (m[0] === "/" ? m.replaceAll(/[^\n]/g, "") : m)).split("\n");
const toNumber = (s) => s.split("*").reduce((p, f) => p * Number(f.replaceAll("_", "").trim()), 1);

function values(re, lines) {
    const out = {};
    for (const line of lines) {
        for (const m of code(line).matchAll(re)) {
            out[m[1]] ??= [];
            out[m[1]].push(toNumber(m[2]));
        }
    }
    return out;
}

// Splits `git diff -U0` output into files: { oldPath, newPath, status, added, removed }.
// git's C-style quoting of a path; an octal escape it cannot be read as JSON stays as written
function unquote(quoted) {
    try {
        return JSON.parse(`"${quoted}"`);
    } catch {
        return quoted;
    }
}

function parseDiff(text) {
    const files = [];
    let f = null;
    for (const line of text.split("\n")) {
        if (line.startsWith("diff --git ")) {
            // a path with a quote, a backslash or a non-ASCII byte is quoted (core.quotePath)
            const m = /^diff --git (?:"a\/(.*)"|a\/(.*)) (?:"b\/(.*)"|b\/(.*))$/.exec(line);
            const path = (quoted, plain) => (quoted === undefined ? plain : unquote(quoted));
            f = { oldPath: path(m[1], m[2]), newPath: path(m[3], m[4]), status: "M", added: [], removed: [] };
            files.push(f);
        } else if (!f) {
            continue;
        } else if (line.startsWith("@@")) {
            f.inHunk = true; // past the header: a line starting "--- " or "+++ " is content now
        } else if (f.inHunk) {
            if (line.startsWith("+")) f.added.push(line.slice(1));
            else if (line.startsWith("-")) f.removed.push(line.slice(1));
        } else if (line.startsWith("new file mode")) f.status = "A";
        else if (line.startsWith("deleted file mode")) f.status = "D";
        else if (line.startsWith("rename from ")) [f.status, f.oldPath] = ["R", line.slice(12)];
        else if (line.startsWith("rename to ")) f.newPath = line.slice(10);
    }
    return files;
}

// A file's text before (`old`) or after (`new`) the change; empty on the side where it does not exist.
function sideText(f, read, side) {
    if (side === "old") return f.status === "A" ? "" : read.old(f.oldPath);
    return f.status === "D" ? "" : read.new(f.newPath);
}
const sum = (lines, measure) => lines.reduce((s, l) => s + measure(l), 0);
const delta = (f, measure) => sum(f.lines.new, measure) - sum(f.lines.old, measure);
const pathOf = (f) => (f.status === "D" ? f.oldPath : f.newPath);
const isTestFile = (f) => TEST_FILE.test(f.oldPath) || TEST_FILE.test(f.newPath);
const isConfig = (f) => VITEST_CONFIG.test(f.oldPath) || VITEST_CONFIG.test(f.newPath);

function declMeasure(f) {
    const stories = STORIES.test(pathOf(f));
    return (l) => hits(DECL, l) + (stories && STORY_EXPORT.test(l) ? 1 : 0);
}

// A net count over the whole change: `sign` -1 reports a drop, +1 a rise.
function netFinding(files, measure, sign, what) {
    const per = files.map((f) => [pathOf(f), delta(f, measure(f)), f.status]).filter(([, d]) => d !== 0);
    const net = per.reduce((s, [, d]) => s + d, 0);
    if (net * sign <= 0) return [];
    const where = per
        .filter(([, d]) => d * sign > 0)
        .map(([p, d, s]) => `${p} ${d > 0 ? "+" : ""}${d}${s === "D" ? " (deleted)" : ""}`);
    return [`${what} ${net > 0 ? "+" : ""}${net} net: ${where.join(", ")}`];
}

// How a number on the removed lines became the one on the added lines, or null when that is not
// a weakening: `grows` reports a rise (timeouts, retries), else a drop or a removal (thresholds).
function weakened(was, now, { grows, added }) {
    if (was === undefined) return added && now !== undefined ? "added" : null;
    if (now === undefined) return grows ? null : "removed";
    const worse = grows ? now > was : now < was;
    return worse ? `${was} -> ${now}` : null;
}

function numberFindings(f, re, rule) {
    const extreme = rule.grows ? Math.max : Math.min;
    const pick = (vals) => (vals ? extreme(...vals) : undefined);
    const [before, after] = [values(re, f.removed), values(re, f.added)];
    const out = [];
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        const how = weakened(pick(before[key]), pick(after[key]), rule);
        if (how) out.push(`${pathOf(f)}: ${rule.what} ${key} ${how}`);
    }
    return out;
}

// The bracketed text after every match of `re`, which ends in its opening bracket.
function blocks(text, re) {
    const out = [];
    for (const m of (text || "").matchAll(re)) {
        const [open, close] = m[0].endsWith("[") ? ["[", "]"] : ["{", "}"];
        let depth = 0;
        let i = m.index + m[0].length - 1;
        for (; i < text.length; i++) {
            if (text[i] === open) depth++;
            else if (text[i] === close) depth--;
            if (depth === 0) break;
        }
        out.push(text.slice(m.index, i + 1).replaceAll(/\s+/g, " "));
    }
    return out;
}

// The test-file globs in include or exclude arrays (not optimizeDeps' module names), as a list.
// vitest's default excludes never count: a config that names them only restates the default.
const DEFAULT_EXCLUDES = new Set(["**/node_modules/**", "**/dist/**"]);
function entries(text, key) {
    const uncommented = (text || "").split("\n").map(code).join("\n");
    return blocks(uncommented, new RegExp(String.raw`\b${key}\s*:\s*\[`, "g"))
        .flatMap((b) => b.match(/(["'`])[^"'`]*\1/g) || [])
        .map((x) => x.slice(1, -1))
        .filter((x) => /\*|\.(test|spec|stories)\./.test(x) && !DEFAULT_EXCLUDES.has(x));
}
const minus = (a, b) => a.filter((x) => !b.includes(x));
const prefix = (glob) => glob.split("*")[0];
const overlaps = (a, b) => prefix(a).startsWith(prefix(b)) || prefix(b).startsWith(prefix(a));

// Loosened, over every vitest config of the change together (a project moved between configs is
// not loosened): an exclude entry added where no include entry under the same directory was gained,
// or an include entry dropped where no exclude entry under it was dropped too (a test file removed
// from both is the test count's to judge).
function includeExcludeFindings(configs, read) {
    const all = (key, side) => configs.flatMap((f) => entries(sideText(f, read, side), key));
    const [inc0, inc1, exc0, exc1] = [
        all("include", "old"),
        all("include", "new"),
        all("exclude", "old"),
        all("exclude", "new"),
    ];
    const [incGained, excDropped] = [minus(inc1, inc0), minus(exc0, exc1)];
    const loosened = [
        ...minus(exc1, exc0).filter((e) => !incGained.some((i) => overlaps(e, i))),
        ...minus(inc0, inc1).filter((i) => !excDropped.some((e) => overlaps(e, i))),
    ];
    return loosened.length ? [`vitest config include or exclude loosened: ${[...new Set(loosened)].join(", ")}`] : [];
}

function configFindings(f) {
    if (f.status === "D") return [`${f.oldPath}: vitest config deleted`];
    return [
        ...numberFindings(f, TIMEOUT, { grows: true, added: true, what: "timeout" }),
        ...numberFindings(f, THRESHOLD, { grows: false, added: false, what: "coverage threshold" }),
    ];
}

// Blocks of `chromatic: { ... }` in a file's text, whitespace-normalised.
const chromaticBlocks = (text) => blocks(text, /\bchromatic\s*:\s*\{/g);

function sortedJson(v) {
    return JSON.stringify(v, (_, x) =>
        x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x,
    );
}

function packageFindings(f, read) {
    const parse = (t) => {
        try {
            return t ? JSON.parse(t) : {};
        } catch {
            return {};
        }
    };
    const [was, now] = [parse(read.old(f.oldPath)), parse(read.new(f.newPath))];
    const out = [];
    const names = new Set([...Object.keys(was.scripts || {}), ...Object.keys(now.scripts || {})]);
    for (const n of names) {
        const [before, after] = [was.scripts?.[n], now.scripts?.[n]];
        if (before === after || (before === undefined && !isLifecycle(n, now.scripts))) continue;
        let how = "changed";
        if (before === undefined) how = "added";
        else if (after === undefined) how = "removed";
        out.push(`${pathOf(f)}: scripts.${n} ${how}`);
    }
    if (pathOf(f) === "package.json" && sortedJson(was.pnpm) !== sortedJson(now.pnpm))
        out.push("package.json: pnpm field changed");
    return out;
}

// A test dropped from the tool test list stops running in CI while its file stays, so the net
// declaration count never sees it.
function toolTestFindings(f, read) {
    const entries = (t) =>
        new Set(
            t
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l && !l.startsWith("#")),
        );
    const now = entries(sideText(f, read, "new"));
    return [...entries(sideText(f, read, "old"))]
        .filter((p) => !now.has(p) && read.new(p))
        .map((p) => `${TOOL_TESTS}: ${p} removed while the file still exists`);
}

function chromaticFindings(f, read) {
    const before = chromaticBlocks(sideText(f, read, "old"));
    const after = chromaticBlocks(sideText(f, read, "new"));
    const fresh = after.filter((b) => !before.includes(b));
    return fresh.length ? [`${pathOf(f)}: parameters.chromatic added or changed: ${fresh[0]}`] : [];
}

// Every finding for parsed diff files; `read.old(path)` and `read.new(path)` return a file's text.
function findings(files, read) {
    const tests = files.filter(isTestFile);
    for (const f of tests)
        f.lines = { old: codeLines(sideText(f, read, "old")), new: codeLines(sideText(f, read, "new")) };
    const out = [
        ...netFinding(tests, declMeasure, -1, "tests"),
        ...netFinding(tests, () => (l) => hits(ASSERT, l), -1, "assertions"),
        // A new file's conditional or known-failure tests are new tests; only `.only` counts there.
        ...netFinding(tests, (f) => (l) => hits(f.status === "A" ? ONLY : SKIP, l), 1, "skip/only/todo"),
    ];
    out.push(...includeExcludeFindings(files.filter(isConfig), read));
    for (const f of files) {
        if (isTestFile(f) || isConfig(f)) {
            out.push(...numberFindings(f, RETRY, { grows: true, added: true, what: "retry" }));
        }
        // A timeout added to a test file that already existed lengthens a wait that had the default.
        if (isTestFile(f) && !isConfig(f))
            out.push(...numberFindings(f, TIMEOUT, { grows: true, added: f.status !== "A", what: "timeout" }));
        if (isConfig(f)) out.push(...configFindings(f));
        if (PACKAGE_JSON.test(f.oldPath) || PACKAGE_JSON.test(f.newPath)) out.push(...packageFindings(f, read));
        if (STORIES.test(pathOf(f)) || PREVIEW.test(pathOf(f))) out.push(...chromaticFindings(f, read));
        if (f.oldPath === TOOL_TESTS) out.push(...toolTestFindings(f, read));
    }
    return out;
}

/**
 * Findings for `git diff -M base...head` in the repository at `cwd`.
 * @param options the two revisions and the repository
 * @param options.base the revision the change is measured from (its merge base with head)
 * @param options.head the revision holding the change
 * @param options.cwd the repository
 * @returns one line per finding; empty when no test is weakened
 */
export function check({ base, head, cwd }) {
    const mergeBase = git(["merge-base", base, head], cwd).trim();
    const files = parseDiff(
        git(
            [
                "-c",
                "core.quotePath=false",
                "diff",
                "-M",
                "-l100000",
                "-U0",
                "--no-color",
                "--no-ext-diff",
                `${mergeBase}..${head}`,
            ],
            cwd,
        ),
    );
    const show = (rev) => (path) => {
        try {
            return git(["show", `${rev}:${path}`], cwd);
        } catch {
            return "";
        }
    };
    return findings(files, { old: show(mergeBase), new: show(head) });
}

function replay(since, until, ref, cwd) {
    const merges = git(
        ["log", "--first-parent", "--merges", `--since=${since}`, `--until=${until}`, "--format=%H %s", ref],
        cwd,
    )
        .split("\n")
        .filter((l) => / land: /.test(l));
    let hits = 0;
    for (const line of merges) {
        const [sha, ...subject] = line.split(" ");
        const found = check({ base: `${sha}^1`, head: sha, cwd });
        if (found.length) {
            hits++;
            console.log(`${sha.slice(0, 10)} ${subject.join(" ")}\n  ${found.join("\n  ")}`);
        }
    }
    console.log(`${hits} of ${merges.length} landings had findings`);
}

function main(argv) {
    const opt = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt);
    const cwd = process.cwd();
    if (argv.includes("--replay")) {
        const i = argv.indexOf("--replay");
        return replay(argv[i + 1], argv[i + 2], opt("--ref", "origin/golden"), cwd);
    }
    const found = check({ base: opt("--base", "origin/master"), head: opt("--head", "HEAD"), cwd });
    if (argv.includes("--json")) console.log(JSON.stringify(found));
    else if (found.length) console.log(`Test integrity: ${found.length} finding(s)\n  ${found.join("\n  ")}`);
    else console.log("Test integrity: no tests weakened");
    process.exitCode = found.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
