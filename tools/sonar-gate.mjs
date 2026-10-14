#!/usr/bin/env node
// The pre-push SonarQube step: blocks a push when SonarQube finds a NEW issue or security hotspot
// on a line the push adds or changes. Run by tools/prepush.sh ("SonarQube (changed lines)").
// Design: design/sonarqube/design.md, section 1.
//
// 1. The changed files: `git diff -M --name-status --diff-filter=AMR <merge-base> HEAD` (the merge base
//    with the branch the push merges into, tools/push-base.mjs), kept to the
//    extensions SonarQube analyzes. A file with uncommitted changes is left out with a warning (the
//    scanner reads the working tree; the push sends HEAD). Nothing left: pass, no server contact.
// 2. The server and the setup. Unreachable, or not the pinned server: pass with a boxed warning and
//    send no token. Anything else wrong (no token, rejected token, no Java, no scanner, no
//    `<key>-local` project): block, with the fix.
// 3. Scan only those files into `<key>-local` (scratch; never `<key>`, which a partial scan would
//    empty), wait for the server to process it, read its open issues and hotspots.
//    A network or server fault after the server answered (a DNS failure, a refused, reset or
//    timed-out connection, an HTTP 5xx, the server closing the connection mid-scan) passes with the
//    boxed warning like an unreachable server; the scanner's own error and "Caused by" lines say
//    which. Any other scanner failure blocks.
// 4. A finding on a changed line (`git diff -M -U0 <merge-base> HEAD`) blocks, unless master's
//    analysis in `<key>` already has it, in the same file (following renames), one master finding
//    per finding: the same rule and line hash (a moved or reformatted line), or the same rule
//    pointing at the same code on the line an edit in place made of master's line (issue #2166; not
//    for a vulnerability). Master's issue counts when open, confirmed, accepted or a false positive;
//    its hotspot when to review or reviewed SAFE.
//    Cognitive complexity (S3776), regex complexity (S5843) and too many parameters (S107) are
//    reported on a function's name or a regex, which an edit inside the body leaves alone, so they
//    are judged by their whole span (the finding through its last secondary location; for S107 the
//    parameter list) and against the merge base, not master's analysis: when such a finding's span
//    overlaps a hunk, the merge base's copies of those files are scanned too (a second scan, into
//    the same scratch project). The finding blocks when the merge base has none there, when its
//    score rose, or -- "touch it, fix it" -- when it is S3776 scoring 16 to 20.
//    An issue on an UNCHANGED line whose rule and message master lacks for that file is a warning.
// 5. `// NOSONAR(<rule>): <reason of 10+ chars>` is the only accepted NOSONAR form on a changed line,
//    and it may not name a vulnerability rule. A `Sonar-Bypass: <reason>` trailer on HEAD passes a
//    push with findings, except vulnerabilities and hotspots.
//
// One deadline for the whole step (900 s, SONAR_GATE_DEADLINE): past it, the step stops the scanner
// and passes with the boxed warning. One scan per machine at a time (flock on
// <git common dir>/sonar/sonar-local.lock). Every run appends a line to <git common dir>/sonar/gate.log.
//
// Exit 0: passed, skipped or bypassed. Exit 1: blocked. Never prints the token.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    accessSync,
    appendFileSync,
    constants,
    existsSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { basename, delimiter, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { pushBase } from "./push-base.mjs";

import {
    ApiError,
    acquireLock,
    client,
    envWithoutToken,
    loadConfig,
    serverStatus,
    startScanner,
    stopScanner,
} from "./sonar/api.mjs";

const TOOLS_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".html", ".css", ".py"]);
const REPO_OF = { ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".mjs": "javascript" };
const SCORE_RULES = /:(S3776|S107|S5843)$/;
// "Touch it, fix it": an edited function scoring this much must come down to 15 or below.
const TOUCH_FIX = { rule: /:S3776$/, min: 16, max: 20 };
const NOSONAR_FORM = /NOSONAR\((S\d+)\): .{10,}/;
const SETUP_FIX = "run `node tools/sonar-baseline.mjs --setup` once (the owner, with the admin token)";
const TOKEN_FIX = "put a valid SonarQube user token in .env as SONAR_TOKEN (My Account > Security > Generate token)";
const RED = "\x1b[0;31m";
const YELLOW = "\x1b[1;33m";
const NC = "\x1b[0m";

// ---------------------------------------------------------------------------------------------
// Pure helpers (exported for the tests)
// ---------------------------------------------------------------------------------------------

/**
 * SonarQube's line hash: MD5 of the line with all whitespace removed (matching lines, not security).
 * @param line - One line of source, without its newline.
 * @returns The hash as lowercase hex, as the issues API reports it.
 */
export function lineHash(line) {
    const md5 = createHash("md5"); // NOSONAR(S4790): SonarQube's own line-hash formula, not a security use
    return md5.update(line.replaceAll(/\s/g, "")).digest("hex");
}

// `git diff --name-status -M` output -> [{ path, oldPath }].
function parseNameStatus(text) {
    return text
        .split("\n")
        .filter(Boolean)
        .map((line) => {
            const [status, first, second] = line.split("\t");
            return status.startsWith("R") ? { path: second, oldPath: first } : { path: first, oldPath: first };
        });
}

const hunkOf = (m) => ({
    oldStart: Number(m[1]),
    oldCount: m[2] === undefined ? 1 : Number(m[2]),
    newStart: Number(m[3]),
    newCount: m[4] === undefined ? 1 : Number(m[4]),
});

/**
 * Parse `git diff -M -U0` output.
 * @param text - The diff.
 * @returns Map from each file's new path to its hunks, `{ oldStart, oldCount, newStart, newCount }`;
 *   a pure rename maps to [].
 */
export function parseHunks(text) {
    const files = new Map();
    let current = null;
    for (const line of text.split("\n")) {
        const target = line.match(/^(?:\+\+\+ b\/|rename to )(.+)$/)?.[1];
        const hunk = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (target) {
            current = target;
            if (!files.has(current)) files.set(current, []);
        } else if (line.startsWith("+++ /dev/null")) {
            current = null;
        } else if (hunk && current) {
            files.get(current).push(hunkOf(hunk));
        }
    }
    return files;
}

// Is new-side `line` added or changed by one of `hunks`?
const onChangedLine = (hunks, line) =>
    hunks.some((h) => h.newCount > 0 && line >= h.newStart && line < h.newStart + h.newCount);

/**
 * Where an old-side line sits on the new side. A pure insertion (`-a,0`) sits after old line a.
 * @param hunks - The file's hunks, from parseHunks.
 * @param line - A line number on the old side.
 * @returns `{ hunk }` when a hunk replaced the line, else `{ line }` shifted by the hunks above it.
 */
export function mapOldLine(hunks, line) {
    let shift = 0;
    for (const h of hunks) {
        if (h.oldCount > 0 && line >= h.oldStart && line < h.oldStart + h.oldCount) return { hunk: h };
        const above = h.oldCount > 0 ? h.oldStart <= line : h.oldStart < line;
        if (above) shift += h.newCount - h.oldCount;
    }
    return { line: line + shift };
}

const GLOB_TOKENS = { "**/": "(?:.*/)?", "**": ".*", "*": "[^/]*", "?": "[^/]" };

/**
 * Translate the glob syntax of sonar-project.properties (`**`, `*`, `?`).
 * @param glob - One pattern, such as `src/*.test.ts`.
 * @returns A RegExp over repository-relative paths.
 */
export function globToRegExp(glob) {
    const body = glob
        .split(/(\*\*\/|\*\*|\*|\?)/)
        .map((tok) => GLOB_TOKENS[tok] ?? tok.replaceAll(/[.+^${}()|[\]\\]/g, String.raw`\$&`))
        .join("");
    return new RegExp(`^${body}$`);
}

// One `key=value` from properties text (ours uses no continuation lines).
function readProperty(text, key) {
    const line = text.split("\n").find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : "";
}

// The score in an S3776 / S5843 message ("from 23 to the 15 allowed") or the parameter count in an
// S107 one ("too many parameters (8)"); a function's own name may hold digits.
const scoreOf = (message) => {
    const m = message.match(/from (\d+)|\((\d+)\)/);
    return m ? Number(m[1] ?? m[2]) : Number.NaN;
};

const isVulnerability = (issue) =>
    issue.type === "VULNERABILITY" || (issue.impacts ?? []).some((i) => i.softwareQuality === "SECURITY");

const COMMENT_MARKER = /(?:\/\/|\/\*|#|<!--)\s*NOSONAR/;
const balanced = (s) => ['"', "'", "`"].every((q) => s.split(q).length % 2 === 1);

/**
 * Find a NOSONAR comment: a comment marker (`//`, `/*`, `#`, `<!--`) directly before NOSONAR, with
 * the quotes before it balanced, so a NOSONAR inside a string or a code span is not mistaken for one.
 * @param text - One line of source.
 * @returns The comment text from its marker on, or null.
 */
export function nosonarComment(text) {
    const m = COMMENT_MARKER.exec(text);
    return m && balanced(text.slice(0, m.index)) ? text.slice(m.index) : null;
}

// Suppression comments on changed lines: the malformed ones (blocking) and the rule each good one names.
function checkNosonar(files) {
    const malformed = [];
    const named = new Map(); // `${path}:${line}` -> "S1234"
    for (const [path, f] of files) {
        f.lines.forEach((text, i) => {
            const line = i + 1;
            const comment = nosonarComment(text);
            if (!comment || !onChangedLine(f.hunks, line)) return;
            const rule = comment.match(NOSONAR_FORM)?.[1];
            if (rule) named.set(`${path}:${line}`, rule);
            else {
                const message = "write it as // NOSONAR(<rule>): <reason of 10+ characters>";
                malformed.push({ path, line, rule: "NOSONAR", message, kind: "nosonar" });
            }
        });
    }
    return { malformed, named };
}

// The merge base's S3776 / S107 / S5843 finding that is this one: the same rule, on the line the
// hunks shift it to, or inside the hunk that rewrote its line.
function priorScored(issue, f, baseIssues) {
    return baseIssues.find((m) => {
        if (m.rule !== issue.rule || !m.line) return false;
        const where = mapOldLine(f.hunks, m.line);
        return where.hunk ? onChangedLine([where.hunk], issue.line) : where.line === issue.line;
    });
}

// The last line of the parameter list that opens on `start` (where the brackets balance again).
function paramListEnd(lines, start) {
    let depth = 0;
    let opened = false;
    for (let i = start - 1; i < Math.min(lines.length, start + 50); i++) {
        for (const ch of lines[i]) {
            if (ch === "(") {
                depth++;
                opened = true;
            } else if (ch === ")") {
                depth--;
            }
            if (opened && depth === 0) return i + 1;
        }
    }
    return start;
}

/**
 * The lines an S3776 / S5843 / S107 finding covers: from its own range to its last secondary
 * location (each complexity increment is one), and for S107, which has none, through the parameter
 * list. A function's lines after its last increment are not in it.
 * @param issue - The finding, with `textRange` and `flows` as the issues API reports them.
 * @param lines - The file's lines.
 * @returns `{ start, end }`, 1-based and inclusive.
 */
export function scoredSpan(issue, lines) {
    const start = issue.textRange?.startLine ?? issue.line;
    const ends = (issue.flows ?? []).flatMap((fl) => fl.locations.map((l) => l.textRange?.endLine ?? 0));
    let end = Math.max(issue.textRange?.endLine ?? start, ...ends);
    if (/:S107$/.test(issue.rule)) end = Math.max(end, paramListEnd(lines, start));
    return { start, end };
}

// Does a hunk add, change or delete a line inside `span`? A deletion sits after new line newStart.
const touches = (hunks, { start, end }) =>
    hunks.some((h) =>
        h.newCount > 0 ? h.newStart <= end && h.newStart + h.newCount > start : h.newStart >= start && h.newStart < end,
    );

// Is this scored finding one the push edits?
const scoredTouched = (issue, f) => SCORE_RULES.test(issue.rule) && touches(f.hunks, scoredSpan(issue, f.lines));

// Why an edited S3776 / S107 / S5843 finding blocks, or null when it does not.
function scoredVerdict(issue, prior) {
    const score = scoreOf(issue.message);
    if (!prior) return issue.message;
    const was = scoreOf(prior.message);
    if (score > was) return `${issue.message} (was ${was} at the merge base)`;
    if (TOUCH_FIX.rule.test(issue.rule) && score >= TOUCH_FIX.min && score <= TOUCH_FIX.max) {
        return `${issue.message} This push edits the function: bring it to 15 or below (touch it, fix it).`;
    }
    return null;
}

/**
 * Where an old-side line is on the new side, line for line: an unchanged line shifts with the hunks
 * above it, and a line inside a hunk that replaced exactly as many lines as it removed (an edit in
 * place) keeps its offset in the hunk. Inside any other hunk a line has no one counterpart.
 * @param hunks - The file's hunks, from parseHunks.
 * @param line - A line number on the old side.
 * @returns The new-side line number, or null.
 */
export function mapOldLineExact(hunks, line) {
    const where = mapOldLine(hunks, line);
    if (!where.hunk) return where.line;
    const h = where.hunk;
    return h.oldCount === h.newCount ? h.newStart + (line - h.oldStart) : null;
}

/**
 * The code a finding points at: its `textRange` cut out of a file's lines.
 * @param lines - The file's lines.
 * @param range - `{ startLine, endLine, startOffset, endOffset }`, as the issues and hotspots APIs
 *   report it.
 * @returns The text, or null without a range, outside the file, or for an empty range.
 */
export function spanText(lines, range) {
    if (!range || !lines) return null;
    const rows = lines.slice(range.startLine - 1, range.endLine);
    if (rows.length === 0 || rows.length !== range.endLine - range.startLine + 1) return null;
    rows[rows.length - 1] = rows.at(-1).slice(0, range.endOffset);
    rows[0] = rows[0].slice(range.startOffset);
    return rows.join("\n") || null;
}

/**
 * Which of a file's findings master already has. Each master finding vouches for at most ONE
 * finding, so a rule that occurs N times where master had it fewer times blocks the rest. Findings
 * on unchanged lines claim theirs first. Then a finding on a changed line is master's when an
 * unclaimed master finding has the same rule and the same line hash (the line moved or was
 * reformatted), else -- when the finding allows it -- the same rule pointing at the same code
 * (`span`) on the line an edit in place made of master's line. Master's line is checked against
 * the merge base's text (`baseLines`), since master's analysis may be of a later commit.
 * @param found - The local findings, `{ rule, line, hash, span, inPlace }`.
 * @param prior - Master's findings for the file, `{ rule, line, hash, span }` (`span` cut from the
 *   merge base).
 * @param f - The file: `{ hunks, baseLines }`.
 * @returns The set of `found` entries master vouches for (changed lines only).
 */
export function vouchedFor(found, prior, f) {
    const used = new Set();
    const take = (x, ok) => {
        const m = prior.find((c) => !used.has(c) && c.rule === x.rule && ok(c));
        if (m) used.add(m);
        return Boolean(m);
    };
    const sameHash = (x) => (m) => Boolean(m.hash) && m.hash === x.hash;
    const landsOn = (x) => (m) => {
        const text = f.baseLines?.[m.line - 1];
        return text !== undefined && lineHash(text) === m.hash && mapOldLineExact(f.hunks, m.line) === x.line;
    };
    const sameCode = (x) => (m) => m.span !== null && m.span === x.span && landsOn(x)(m);
    const changed = found.filter((x) => onChangedLine(f.hunks, x.line));
    for (const x of found) if (!changed.includes(x)) take(x, landsOn(x)) || take(x, sameHash(x));
    const vouched = new Set(changed.filter((x) => take(x, sameHash(x))));
    for (const x of changed) if (!vouched.has(x) && x.inPlace && take(x, sameCode(x))) vouched.add(x);
    return vouched;
}

/**
 * The verdict. Inputs are plain data, so the tests drive it without a server.
 * @param input - What the step gathered.
 * @param input.local - `{ issues, hotspots }` of <key>-local, each with a repository-relative `path`.
 * @param input.master - `issuesByFile(oldPath)` and `hotspotsByFile(oldPath)` (arrays) and
 *   `lineAt(oldPath, line)` (master's text of that line, or null), from <key>.
 * @param input.files - Map from each scanned path to `{ oldPath, hunks, lines, baseLines }` (HEAD's
 *   lines and the merge base's lines of `oldPath`).
 * @param input.base - `issuesByFile(oldPath)`: the S3776 / S107 / S5843 findings of the merge base's
 *   copy of each file whose such findings the push edits (the second scan); omitted, none.
 * @returns `{ blocking, existing, warnings, named }`: findings as `{ path, line, rule, message, kind }`,
 *   and the rule each well-formed NOSONAR names, by `path:line`.
 */
export function decide({ local, master, files, base = { issuesByFile: () => [] } }) {
    const { malformed, named } = checkNosonar(files);
    const out = { blocking: [...malformed], existing: [], warnings: [] };
    for (const [path, f] of files) {
        judgeIssues(
            local.issues.filter((x) => x.path === path && x.line),
            f,
            { master: master.issuesByFile(f.oldPath), base: base.issuesByFile(f.oldPath) },
            out,
        );
        const hotspots = local.hotspots.filter(
            (h) => h.path === path && h.line && named.get(`${path}:${h.line}`) !== h.ruleKey.split(":")[1],
        );
        judgeHotspots(hotspots, f, master, out);
    }
    return { ...out, named };
}

// Sort a file's issues into blocking, existing (on a changed line, master has it) or warnings.
// Master's issue counts when open, confirmed, accepted or marked a false positive. A vulnerability
// is master's only by its line hash: an edit in place may change what it exposes. An S3776 / S107 /
// S5843 finding whose span the push edits is judged against the merge base instead.
function judgeIssues(issues, f, prior, out) {
    const plain = (x) => !SCORE_RULES.test(x.rule);
    const asFound = (x, lines) => ({
        ref: x,
        rule: x.rule,
        line: x.line,
        hash: x.hash,
        span: spanText(lines, x.textRange),
        inPlace: !isVulnerability(x),
    });
    const found = issues.filter(plain).map((x) => asFound(x, f.lines));
    const masterPlain = prior.master.filter((m) => plain(m) && m.line).map((m) => asFound(m, f.baseLines));
    const vouched = new Set([...vouchedFor(found, masterPlain, f)].map((e) => e.ref));
    for (const issue of issues) placeIssue(issue, f, prior, vouched, out);
}

// One issue of judgeIssues: blocking, existing, a warning, or nothing.
function placeIssue(issue, f, prior, vouched, out) {
    const kind = isVulnerability(issue) ? "vulnerability" : "issue";
    const entry = { path: issue.path, line: issue.line, rule: issue.rule, message: issue.message, kind };
    if (scoredTouched(issue, f)) {
        const why = scoredVerdict(issue, priorScored(issue, f, prior.base));
        if (why) out.blocking.push({ ...entry, message: why });
        else out.existing.push(entry);
    } else if (!SCORE_RULES.test(issue.rule) && onChangedLine(f.hunks, issue.line)) {
        (vouched.has(issue) ? out.existing : out.blocking).push(entry);
    } else if (!prior.master.some((m) => m.rule === issue.rule && m.message === issue.message)) {
        out.warnings.push(entry);
    }
}

// Sort a file's hotspots on changed lines into blocking or existing. Master's counts when it is to
// review or reviewed SAFE; through an edit in place only when it points at the same code, so a SAFE
// review never covers code nobody reviewed.
function judgeHotspots(hotspots, f, master, out) {
    const asFound = (h, hash, lines) => ({
        ref: h,
        rule: h.ruleKey,
        line: h.line,
        hash,
        span: spanText(lines, h.textRange),
        inPlace: true,
    });
    const found = hotspots.map((h) => asFound(h, lineHash(f.lines[h.line - 1] ?? ""), f.lines));
    const prior = master
        .hotspotsByFile(f.oldPath)
        .filter((m) => m.line && (m.status === "TO_REVIEW" || (m.status === "REVIEWED" && m.resolution === "SAFE")))
        .map((m) => {
            const text = master.lineAt(f.oldPath, m.line);
            return asFound(m, text === null ? null : lineHash(text), f.baseLines);
        });
    const vouched = new Set([...vouchedFor(found, prior, f)].map((e) => e.ref));
    for (const h of hotspots) {
        if (!onChangedLine(f.hunks, h.line)) continue;
        const entry = { path: h.path, line: h.line, rule: h.ruleKey, message: h.message, kind: "hotspot" };
        (vouched.has(h) ? out.existing : out.blocking).push(entry);
    }
}

// What a failed scanner run says about why: the bootstrapper's and the engine's ERROR lines, the
// engine's top exception (the line after "Error during SonarScanner Engine execution") and every
// "Caused by" line. The stack frames between them say nothing a reader can act on.
const CAUSE_LINE = /^\s*(?:\[ERROR\]|Caused by: )/;
const AFTER_ENGINE_ERROR = /Error during SonarScanner Engine execution/;
// A network or server fault, as the Node bootstrapper (axios, node:net) and the Java engine (okhttp,
// the SonarQube web service client) word it. Anything else -- a 401, a 403, a 404, a missing file, a
// plugin that cannot start -- is not on this list and blocks.
const NODE_CODES = [
    "ENOTFOUND",
    "EAI_AGAIN",
    "ECONNREFUSED",
    "ECONNRESET",
    "ECONNABORTED",
    "ETIMEDOUT",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "EPIPE",
    "UND_ERR_SOCKET",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
];
const JAVA_NET = [
    "UnknownHostException",
    "ConnectException",
    "NoRouteToHostException",
    "SocketTimeoutException",
    "SocketException",
];
const NETWORK_FAULT = new RegExp(
    [
        String.raw`\b(?:${NODE_CODES.join("|")})\b`,
        "socket hang up",
        String.raw`status code 5\d\d\b`,
        String.raw`timeout of \d+ms exceeded`,
        String.raw`java\.net\.(?:${JAVA_NET.join("|")})`,
        String.raw`java\.io\.(?:EOFException|InterruptedIOException)`,
        "unexpected end of stream",
        String.raw`HttpException: Error 5\d\d on `,
    ].join("|"),
);

/**
 * Why the scanner failed, from its own output.
 * @param output - The scanner's output (the token already redacted by startScanner).
 * @returns `{ cause, network }`: the lines that explain the failure (credentials in URLs masked), and
 *   whether they name a network or server fault -- a DNS failure, a refused, reset or timed-out
 *   connection, an HTTP 5xx, or the server closing the connection mid-scan.
 */
export function scannerFailure(output) {
    const lines = output.split("\n");
    const cause = lines
        .filter((l, i) => CAUSE_LINE.test(l) || (i > 0 && AFTER_ENGINE_ERROR.test(lines[i - 1])))
        .map((l) => l.trim().replaceAll(/\/\/[^/@\s]+@/g, "//***@"));
    return { cause, network: cause.some((l) => NETWORK_FAULT.test(l)) };
}

/**
 * Did a Web API call fail because the server or the network did (HTTP 5xx, no answer, a timeout),
 * rather than because of what was asked?
 * @param e - What `client().call` threw.
 * @returns True for a network or server fault.
 */
export function isNetworkError(e) {
    if (e instanceof ApiError) return e.status >= 500;
    if (e?.name === "TimeoutError" || e?.name === "AbortError") return true;
    return NETWORK_FAULT.test(String(e?.cause?.code ?? e?.code ?? ""));
}

// ---------------------------------------------------------------------------------------------
// The step
// ---------------------------------------------------------------------------------------------

// How a run ends: thrown by any phase, caught once in main.
class Outcome extends Error {
    constructor(outcome, code, lines) {
        super(outcome);
        this.outcome = outcome;
        this.code = code;
        this.lines = lines;
    }
}
const skip = (reason, why) =>
    new Outcome(`skipped:${reason}`, 0, [why, "The next push from the owner's network checks the whole branch."]);
// The server or the network failed after the server had answered: the same as an unreachable server.
const serverFault = (why) => skip("server-fault", `The SonarQube server or the network failed: ${why}`);

const git = (args) => execFileSync("git", args, { encoding: "utf8", env: envWithoutToken(), maxBuffer: 256 << 20 });

function isExecutable(p) {
    try {
        accessSync(p, constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

const findOnPath = (cmd) =>
    (process.env.PATH ?? "")
        .split(delimiter)
        .map((dir) => join(dir, cmd))
        .find((p) => p !== cmd && isExecutable(p)) ?? null;

// Printed width: the color codes take no columns, so they must not count toward the padding.
const visibleLength = (l) => [RED, YELLOW, NC].reduce((t, c) => t.replaceAll(c, ""), l).length;

function box(lines) {
    const width = Math.max(...lines.map(visibleLength)) + 4;
    const bar = `+${"-".repeat(width - 2)}+`;
    console.log(YELLOW + bar);
    for (const l of lines)
        console.log(`${YELLOW}| ${NC}${l}${" ".repeat(width - 4 - visibleLength(l))}${YELLOW} |${NC}`);
    console.log(bar + NC);
}

// Phase 1: the analyzable files the push changes, minus those with uncommitted changes.
function changedFiles(run) {
    run.base = pushBase({ env: envWithoutToken() });
    const changed = parseNameStatus(git(["diff", "-M", "--name-status", "--diff-filter=AMR", run.base, "HEAD"]));
    const analyzable = changed.filter((c) => EXTENSIONS.has(extname(c.path)));
    const dirty = new Set(git(["diff", "--name-only", "HEAD"]).split("\n").filter(Boolean));
    run.leftOut = analyzable.filter((c) => dirty.has(c.path)).map((c) => c.path);
    for (const p of run.leftOut) {
        console.log(`${YELLOW}not checked: ${p} has uncommitted changes; the next push checks it${NC}`);
    }
    return analyzable.filter((c) => !dirty.has(c.path));
}

// The server answers and is the one `--setup` pinned; otherwise a skip (no token is sent).
async function checkServer(run, cfg) {
    if (!cfg.host) throw skip("no-host", "SONAR_HOST_URL is not set (environment or .env).");
    // 15 s, not 3: this network's DNS stalls for about 4 s every 35 s, and the step runs beside the tests,
    // so waiting costs the push nothing.
    const status = await serverStatus(cfg.host, 15000);
    if (!status) throw skip("unreachable", "The SonarQube server did not answer within 15 s.");
    const pinFile = join(run.sonarDir, "server-id");
    if (!existsSync(pinFile)) throw run.blockSetup("no pinned server id", SETUP_FIX);
    if (readFileSync(pinFile, "utf8").trim() !== status.id) {
        throw skip("not-pinned-server", "Something answered at SONAR_HOST_URL, but it is not the owner's server.");
    }
}

// Phase 2: everything the scan needs, or an Outcome. Sends the token only to the pinned server.
async function checkSetup(run) {
    const cfg = loadConfig(run.top);
    await checkServer(run, cfg);
    if (!cfg.token)
        throw run.blockSetup("no SONAR_TOKEN", "put SONAR_TOKEN=<your SonarQube token> in the repository's .env");
    if (!cfg.projectKey) throw run.blockSetup("no SONAR_PROJECT_KEY", "put SONAR_PROJECT_KEY=graphty-monorepo in .env");

    const api = client(cfg.host, cfg.token);
    const me = await api.call("api/users/current").catch((e) => ({ error: e }));
    if (me.error && isNetworkError(me.error)) throw serverFault(`api/users/current: ${me.error.message}`);
    if (me.error || !me.isLoggedIn) {
        const why = me.error instanceof ApiError ? `HTTP ${me.error.status}` : (me.error?.message ?? "not logged in");
        throw run.blockSetup(`the token was rejected (${why})`, TOKEN_FIX);
    }
    const java = cfg.java || findOnPath("java");
    if (!java || !isExecutable(java)) {
        throw run.blockSetup(
            "no Java",
            "set SONAR_SCANNER_JAVA_EXE_PATH (.env or the environment) to a Java 17+ `java`",
        );
    }
    const scanner = process.env.SONAR_GATE_SCANNER || join(TOOLS_ROOT, "node_modules/.bin/sonar-scanner-npm");
    if (!isExecutable(scanner)) throw run.blockSetup("the scanner is not installed", "run `pnpm install`");
    const localKey = `${cfg.projectKey}-local`;
    try {
        await api.call("api/components/show", { component: localKey });
    } catch (e) {
        if (isNetworkError(e)) throw serverFault(`api/components/show: ${e.message}`);
        const missing = e instanceof ApiError && e.status === 404;
        throw run.blockSetup(
            missing ? `project ${localKey} is missing` : `api/components/show: ${e.message}`,
            SETUP_FIX,
        );
    }
    return { cfg, api, java, localKey };
}

// Run the scanner on `paths` (relative to `baseDir`) into <key>-local and wait for the server to
// process the report. `extra` are further scanner properties.
async function runScan(run, setup, { baseDir, paths, workDir, extra }) {
    const { cfg, api, java, localKey } = setup;
    const props = readFileSync(join(run.top, "sonar-project.properties"), "utf8");
    const testGlobs = readProperty(props, "sonar.test.inclusions").split(",").filter(Boolean).map(globToRegExp);
    const isTest = (p) => testGlobs.some((re) => re.test(p));
    rmSync(workDir, { recursive: true, force: true });
    let output = "";
    const scanner = startScanner(
        run.top,
        [
            `-Dsonar.projectKey=${localKey}`,
            `-Dsonar.host.url=${cfg.host}`,
            // The files themselves, not `.` narrowed by inclusions: given a directory the scanner
            // walks the whole tree and stats every entry before any exclusion applies, so a file a
            // test shard deletes mid-walk (browser-results.json) fails the scan (issue #1297).
            `-Dsonar.sources=${paths.filter((p) => !isTest(p)).join(",")}`,
            `-Dsonar.tests=${paths.filter(isTest).join(",")}`,
            `-Dsonar.working.directory=${workDir}`,
            "-Dsonar.javascript.lcov.reportPaths=",
            "-Dsonar.qualitygate.wait=false",
            ...(baseDir === run.top ? [] : [`-Dsonar.projectBaseDir=${baseDir}`]),
            ...extra,
        ],
        {
            token: cfg.token,
            env: { ...process.env, SONAR_SCANNER_JAVA_EXE_PATH: java },
            onOutput: (s) => (output += s),
        },
    );
    run.scanner = scanner.child;
    const { code, error } = await scanner.done;
    run.scanner = null;
    if (code !== 0) {
        const { cause, network } = scannerFailure(output);
        // No recognizable cause: the end of the output, as before.
        console.log((cause.length ? cause : output.trim().split("\n").slice(-20)).join("\n"));
        if (network) throw serverFault(`the scanner lost the server (exit ${code}; its errors are above)`);
        const detail = error ? `, ${error.message}` : "";
        throw run.blockSetup(`the scanner failed (exit ${code}${detail})`, "read the scanner output above");
    }

    const taskId = readProperty(readFileSync(join(workDir, "report-task.txt"), "utf8"), "ceTaskId");
    let task = (await api.call("api/ce/task", { id: taskId })).task;
    while (task.status === "PENDING" || task.status === "IN_PROGRESS") {
        await new Promise((r) => setTimeout(r, 1000));
        task = (await api.call("api/ce/task", { id: taskId })).task;
    }
    if (task.status !== "SUCCESS") {
        const why = `the server could not process the scan (${task.status}: ${task.errorMessage ?? ""})`;
        throw run.blockSetup(why, "see the project's background tasks on the server");
    }
}

const withPath = (x) => ({ ...x, path: x.component.slice(x.component.indexOf(":") + 1) });
const openIssues = (setup) =>
    setup.api.all("api/issues/search", { components: setup.localKey, issueStatuses: "OPEN,CONFIRMED" }, "issues");

// Phase 3: scan the files into <key>-local and read back its open issues and hotspots.
async function scan(run, setup, scanList) {
    console.log(`SonarQube: scanning ${scanList.length} changed file(s) into ${setup.localKey}...`);
    const workDir = join(run.sonarDir, basename(run.top));
    const paths = scanList.map((c) => c.path);
    await runScan(run, setup, { baseDir: run.top, paths, workDir, extra: [`-Dsonar.scm.revision=${run.head}`] });
    const issues = (await openIssues(setup)).map(withPath);
    const query = { project: setup.localKey, status: "TO_REVIEW" };
    const hotspots = (await setup.api.all("api/hotspots/search", query, "hotspots")).map(withPath);
    return { issues, hotspots };
}

// Phase 3b: the merge base's copies of `oldPaths`, scanned into <key>-local from a directory of
// their own; their S3776 / S107 / S5843 findings by path.
async function scanBase(run, setup, oldPaths) {
    console.log(`SonarQube: scanning the merge base's copy of ${oldPaths.length} file(s) to compare complexity...`);
    const baseDir = join(run.sonarDir, `base-${basename(run.top)}`);
    rmSync(baseDir, { recursive: true, force: true });
    mkdirSync(baseDir, { recursive: true });
    // The same settings (exclusions, test globs, path decisions) as the scan of HEAD.
    writeFileSync(join(baseDir, "sonar-project.properties"), readFileSync(join(run.top, "sonar-project.properties")));
    for (const p of oldPaths) {
        mkdirSync(dirname(join(baseDir, p)), { recursive: true });
        writeFileSync(join(baseDir, p), git(["show", `${run.base}:${p}`]));
    }
    const workDir = join(run.sonarDir, `base-work-${basename(run.top)}`);
    await runScan(run, setup, { baseDir, paths: oldPaths, workDir, extra: ["-Dsonar.scm.disabled=true"] });
    const found = (await openIssues(setup)).map(withPath).filter((x) => SCORE_RULES.test(x.rule));
    return { issuesByFile: (p) => found.filter((x) => x.path === p) };
}

// Phase 4: master's findings for the files that have any, from <key>.
async function masterFindings(api, mainKey, oldPaths) {
    const revision = await api
        .call("api/project_analyses/search", { project: mainKey, ps: 1 })
        .then((r) => r.analyses?.[0]?.revision ?? null)
        .catch(() => null);
    const issues = new Map();
    const hotspots = new Map();
    // A file master never analyzed has nothing; a server that stopped answering is not "nothing".
    const none = (e) => {
        if (isNetworkError(e)) throw e;
        return [];
    };
    for (const old of oldPaths) {
        // A false positive or an accepted issue is master's too: someone already decided it.
        const issueQuery = {
            components: `${mainKey}:${old}`,
            issueStatuses: "OPEN,CONFIRMED,ACCEPTED,FALSE_POSITIVE",
        };
        issues.set(old, await api.all("api/issues/search", issueQuery, "issues").catch(none));
        const toReview = { project: mainKey, files: old, status: "TO_REVIEW" };
        const safe = { project: mainKey, files: old, status: "REVIEWED", resolution: "SAFE" };
        hotspots.set(old, [
            ...(await api.all("api/hotspots/search", toReview, "hotspots").catch(none)),
            ...(await api.all("api/hotspots/search", safe, "hotspots").catch(none)),
        ]);
    }
    const text = new Map();
    const lineAt = (old, line) => {
        if (!revision) return null;
        if (!text.has(old)) {
            try {
                text.set(old, git(["show", `${revision}:${old}`]).split("\n"));
            } catch {
                text.set(old, null);
            }
        }
        return text.get(old)?.[line - 1] ?? null;
    };
    return {
        issuesByFile: (p) => issues.get(p) ?? [],
        hotspotsByFile: (p) => hotspots.get(p) ?? [],
        lineAt,
    };
}

// A NOSONAR naming a vulnerability rule hides whatever else is on its line: it blocks.
async function vulnerabilityNosonar(api, named) {
    const found = [];
    for (const [where, rule] of named) {
        const cut = where.lastIndexOf(":");
        const path = where.slice(0, cut);
        const repo = REPO_OF[extname(path)];
        if (!repo) continue;
        const r = await api
            .call("api/rules/show", { key: `${repo}:${rule}` })
            .then((x) => x.rule)
            .catch(() => null);
        if (r?.type === "VULNERABILITY") {
            const message = "NOSONAR may not name a vulnerability rule; use a path entry in sonar-project.properties";
            found.push({ path, line: Number(where.slice(cut + 1)), rule, message, kind: "nosonar" });
        }
    }
    return found;
}

function verdictOutcome(verdict, host, bypass) {
    const fmt = (f) =>
        `  ${f.path}:${f.line}  ${f.rule}  ${f.kind === "hotspot" ? "[security hotspot]  " : ""}${f.message}`;
    const lines = [];
    if (verdict.existing.length) {
        lines.push(
            "Existing issues on lines you touched (not blocking; master has them):",
            ...verdict.existing.map(fmt),
            "",
        );
    }
    if (verdict.warnings.length) {
        const head = `${YELLOW}Possibly introduced by this push (warning; on lines it did not change):${NC}`;
        lines.push(head, ...verdict.warnings.map(fmt), "");
    }
    if (!verdict.blocking.length) {
        lines.push("SonarQube: no new issue or hotspot on the changed lines.");
        return new Outcome("passed", 0, lines);
    }
    lines.push(`${RED}SonarQube: new findings on lines this push adds or changes:${NC}`);
    for (const f of verdict.blocking) {
        lines.push(fmt(f));
        if (f.kind !== "nosonar") lines.push(`      ${host}/coding_rules?open=${f.rule}&rule_key=${f.rule}`);
    }
    lines.push(
        "",
        "Fix each one. For a false positive: `// NOSONAR(<rule>): <reason>` on the line, or a reasoned",
        "sonar.issue.ignore.multicriteria entry in sonar-project.properties. Emergencies only: a",
        "`Sonar-Bypass: <reason>` trailer on the HEAD commit (never covers vulnerabilities or hotspots).",
    );
    const hard = verdict.blocking.some((f) => f.kind === "vulnerability" || f.kind === "hotspot");
    if (bypass && !hard) return new Outcome("bypassed", 0, [...lines, `Sonar-Bypass: ${bypass}`]);
    if (bypass) lines.push(`${RED}Sonar-Bypass does not cover vulnerabilities or security hotspots.${NC}`);
    return new Outcome("blocked", 1, lines);
}

// A file's lines at a revision, or [] when it is not there (a file the push adds).
function showOrEmpty(spec) {
    try {
        return git(["show", spec]).split("\n");
    } catch {
        return [];
    }
}

async function check(run) {
    const scanList = changedFiles(run);
    if (scanList.length === 0) {
        return new Outcome("passed", 0, ["No analyzable file changed; nothing for SonarQube to check."]);
    }
    run.bypass = git(["log", "-1", "--format=%(trailers:key=Sonar-Bypass,valueonly,separator=%x20)", "HEAD"]).trim();
    const setup = await checkSetup(run);

    const paths = scanList.flatMap((c) => [c.path, c.oldPath]);
    const hunks = parseHunks(git(["diff", "-M", "-U0", run.base, "HEAD", "--", ...new Set(paths)]));
    const files = new Map(
        scanList.map((c) => [
            c.path,
            {
                oldPath: c.oldPath,
                hunks: hunks.get(c.path) ?? [],
                lines: git(["show", `HEAD:${c.path}`]).split("\n"),
                baseLines: showOrEmpty(`${run.base}:${c.oldPath}`),
            },
        ]),
    );

    const release = await acquireLock(join(run.sonarDir, "sonar-local.lock"), run.left() / 1000);
    if (!release) throw skip("deadline", "Another scan held the lock until the deadline.");
    let local;
    let base;
    try {
        local = await scan(run, setup, scanList);
        // The merge base's copies of the files whose complexity findings the push edits.
        const edited = local.issues.filter((x) => files.has(x.path) && scoredTouched(x, files.get(x.path)));
        const atBase = [...new Set(edited.map((x) => files.get(x.path)))].filter((f) => f.baseLines.length);
        if (atBase.length) base = await scanBase(run, setup, [...new Set(atBase.map((f) => f.oldPath))]);
    } finally {
        release();
    }

    const withFindings = new Set([...local.issues, ...local.hotspots].map((x) => files.get(x.path)?.oldPath));
    withFindings.delete(undefined);
    const master = await masterFindings(setup.api, setup.cfg.projectKey, withFindings);
    const verdict = decide({ local, master, files, base });
    verdict.blocking.push(...(await vulnerabilityNosonar(setup.api, verdict.named)));
    return verdictOutcome(verdict, setup.cfg.host, run.bypass);
}

async function main() {
    const started = Date.now();
    const deadlineMs = Number(process.env.SONAR_GATE_DEADLINE ?? 900) * 1000;
    const top = git(["rev-parse", "--show-toplevel"]).trim();
    const sonarDir = join(git(["rev-parse", "--path-format=absolute", "--git-common-dir"]).trim(), "sonar");
    mkdirSync(sonarDir, { recursive: true });
    let branch = "(detached)";
    try {
        branch = git(["symbolic-ref", "--short", "-q", "HEAD"]).trim();
    } catch {
        // detached HEAD
    }
    const run = {
        top,
        sonarDir,
        head: git(["rev-parse", "HEAD"]).trim(),
        leftOut: [],
        bypass: "",
        scanner: null,
        left: () => deadlineMs - (Date.now() - started),
        blockSetup(why, fix) {
            if (this.bypass)
                return new Outcome("bypassed", 0, [`The scan could not run: ${why}`, `Sonar-Bypass: ${this.bypass}`]);
            return new Outcome("blocked", 1, [`${RED}SonarQube step cannot run: ${why}${NC}`, `Fix: ${fix}`]);
        },
    };

    const finish = (o) => {
        if (o.outcome.startsWith("skipped")) box(["SonarQube did NOT check this push", ...o.lines]);
        else if (o.outcome === "bypassed") box(["SonarQube: passed by the Sonar-Bypass trailer on HEAD", ...o.lines]);
        else for (const l of o.lines) console.log(l);
        const entry = [
            new Date().toISOString(),
            branch,
            run.head.slice(0, 12),
            o.outcome,
            `left-out:${run.leftOut.length}`,
        ];
        appendFileSync(join(sonarDir, "gate.log"), `${entry.join(" ")}\n`);
        return o.code;
    };

    // The deadline covers the lock wait, the scan, the server's queue and the reads.
    const timer = setTimeout(() => {
        if (run.scanner) stopScanner(run.scanner);
        process.exit(
            finish(skip("deadline", `The ${deadlineMs / 1000} s deadline passed (is the server's queue busy?).`)),
        );
    }, run.left());
    let outcome;
    try {
        outcome = await check(run);
    } catch (e) {
        if (e instanceof Outcome) outcome = e;
        else if (isNetworkError(e)) outcome = serverFault(e.message);
        else outcome = new Outcome("blocked", 1, [`${RED}SonarQube step failed: ${e.message}${NC}`]);
    }
    clearTimeout(timer);
    return finish(outcome);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    process.exitCode = await main();
}
