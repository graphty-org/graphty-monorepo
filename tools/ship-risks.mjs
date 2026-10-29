// The named risks of a cut, printed by `land.mjs cut` and `land.mjs ship` before they act, so whoever
// ships sees them instead of reasoning from memory (issue #3365). Printing only: nothing refuses on them.
//
//   1. Screenshot baselines the cut changes whose newest review record is a local capture
//      (`subject.local` names the project): CI has not drawn them yet, and may draw them differently.
//   2. Landings on golden the cut lacks that touch a file the cut also changes, a story or story helper,
//      or graphty-element's camera and framing code: the cut may be missing the fix for what CI runs.
//
//   node tools/ship-risks.mjs [<cut>] [<golden>] [<master>]   print them (read-only)
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REVIEWS = "visual-baselines/reviews/";
const LAND_SUBJECT = /^land: (\S+)$/;
// Files whose change on golden can decide whether the cut's stories and screenshots pass.
const WATCHED = [
    /\.stories\.(tsx?|mdx)$/,
    /(^|\/)(stories|\.storybook)\//,
    /^graphty-element\/src\/cameras?\//,
    /^graphty-element\/src\/managers\/(UpdateManager|RenderManager)\.ts$/,
];

function git(cwd, args, input) {
    const r = spawnSync("git", args, { cwd, input, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr.trim()}`);
    return r.stdout;
}

const lines = (text) => text.split("\n").filter(Boolean);
const changed = (cwd, range, ...paths) =>
    lines(git(cwd, ["diff", "--name-only", "--diff-filter=AM", range, "--", ...paths]));

/**
 * Every review record in `ref`'s tree, newest first (the file names start with their UTC time), read
 * in one `git cat-file --batch`.
 * @param cwd any directory of the repository
 * @param ref the commit to read them at
 * @returns `[{ path, record }]`
 */
function reviewRecords(cwd, ref) {
    const paths = lines(git(cwd, ["ls-tree", "--name-only", ref, REVIEWS])).filter((p) => p.endsWith(".json"));
    paths.sort().reverse();
    const out = Buffer.from(
        spawnSync("git", ["cat-file", "--batch"], {
            cwd,
            input: paths.map((p) => `${ref}:${p}\n`).join(""),
            maxBuffer: 256 * 1024 * 1024,
        }).stdout,
    );
    const records = [];
    let at = 0;
    for (const path of paths) {
        const eol = out.indexOf(10, at);
        const size = Number(out.toString("utf8", at, eol).split(" ")[2]);
        records.push({ path, record: JSON.parse(out.toString("utf8", eol + 1, eol + 1 + size)) });
        at = eol + 1 + size + 1;
    }
    return records;
}

const capturedLocally = (record, png) =>
    (record.subject?.local ?? []).some((l) => png.startsWith(`visual-baselines/${l.project}/`));

/**
 * The baselines `cut` changes against `master` whose newest review record took them from a local
 * capture, with no CI-captured record after it.
 * @param cwd any directory of the repository
 * @param cut the cut
 * @param master what is shipped
 * @returns `[{ path, record }]`, `record` the review record's path
 */
export function localBaselines(cwd, cut, master) {
    const pngs = changed(cwd, `${master}...${cut}`, "visual-baselines/*.png");
    if (!pngs.length) return [];
    const records = reviewRecords(cwd, cut);
    return pngs.flatMap((png) => {
        const newest = records.find((r) => (r.record.items ?? []).some((i) => i.path === png));
        return newest && capturedLocally(newest.record, png) ? [{ path: png, record: newest.path }] : [];
    });
}

/**
 * The "land: <branch>" merges on golden's first-parent line that the cut lacks and that touch a file the
 * cut changes against master, or a watched file (WATCHED).
 * @param cwd any directory of the repository
 * @param cut the cut
 * @param golden golden's tip
 * @param master what is shipped
 * @returns `[{ sha, branch, files }]`, oldest first
 */
export function missingLandings(cwd, cut, golden, master) {
    const own = new Set(changed(cwd, `${master}...${cut}`));
    const log = lines(git(cwd, ["log", "--first-parent", "--reverse", "--format=%H%x00%P%x00%s", `${cut}..${golden}`]));
    return log.flatMap((line) => {
        const [sha, parents, subject] = line.split("\0");
        const landed = LAND_SUBJECT.exec(subject);
        if (!landed || parents.split(" ").length !== 2) return [];
        const files = changed(cwd, `${sha}^1..${sha}`).filter((f) => own.has(f) || WATCHED.some((w) => w.test(f)));
        return files.length ? [{ sha, branch: landed[1], files }] : [];
    });
}

const fileList = (files, max = 8) =>
    files.length > max ? `${files.slice(0, max).join(", ")} and ${files.length - max} more` : files.join(", ");

/**
 * The cut's named risks, as the lines to print.
 * @param cwd any directory of the repository
 * @param refs the refs to compare
 * @param refs.cut the cut
 * @param refs.golden golden's tip
 * @param refs.master what is shipped
 * @returns the lines
 */
export function riskLines(cwd, { cut, golden, master }) {
    const baselines = localBaselines(cwd, cut, master);
    const landings = missingLandings(cwd, cut, golden, master);
    const short = git(cwd, ["rev-parse", "--short=10", cut]).trim();
    if (!baselines.length && !landings.length) return [`land: no known risks for the cut at ${short}`];
    const out = [`land: known risks of the cut at ${short} (printed only; nothing is refused for them):`];
    if (baselines.length) {
        out.push(`  ${baselines.length} screenshot baselines accepted from a local capture, not yet confirmed by CI:`);
        for (const b of baselines) out.push(`    ${b.path} (${b.record})`);
    }
    if (landings.length) {
        out.push(`  ${landings.length} landings on golden the cut lacks that touch files the cut uses:`);
        for (const l of landings) out.push(`    ${l.sha.slice(0, 10)} ${l.branch}: ${fileList(l.files)}`);
    }
    return out;
}

/**
 * Prints the cut's risks; a failure to list them is printed too and never stops the caller.
 * @param cwd any directory of the repository
 * @param refs as riskLines takes them
 */
export function printRisks(cwd, refs) {
    try {
        console.log(riskLines(cwd, refs).join("\n"));
    } catch (e) {
        console.log(`land: could not list the cut's known risks: ${e.message}`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [cut = "origin/golden-cut", golden = "origin/golden", master = "origin/master"] = process.argv.slice(2);
    printRisks(process.cwd(), { cut, golden, master });
}
