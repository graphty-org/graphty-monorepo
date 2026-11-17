#!/usr/bin/env node
// Per-package coverage badges (#3042): reads the per-package lcov files tools/merge-coverage.sh leaves in
// .coverage-packages/<package>.info and writes, for each package, <package>.json (a shields.io endpoint badge
// of its line coverage) and <package>.md (its coverage report: line coverage per source file). coverage.yml
// pushes them to the coverage-badges branch, which every package README's badge reads.
//
//   node tools/coverage-badges.mjs <.coverage-packages dir> <output dir> [commit]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * Lines found and hit per source file, from an lcov file's DA records (a file lcov-result-merger merged has no
 * LF/LH summary lines), counted the way tools/merge-coverage.sh's summary counts them.
 * @param lcov the lcov text
 * @returns Map of source path to `{ found, hit }`
 */
export function linesPerFile(lcov) {
    const files = new Map();
    let current;
    for (const line of lcov.split("\n")) {
        if (line.startsWith("SF:")) {
            const path = line.slice(3).trim();
            current = files.get(path) ?? { found: 0, hit: 0 };
            files.set(path, current);
        } else if (line.startsWith("DA:") && current) {
            current.found++;
            if (Number(line.split(",")[1]) > 0) current.hit++;
        }
    }
    return files;
}

/**
 * shields.io's coverage colors.
 * @param pct line coverage in percent
 * @returns a shields.io color name
 */
export function color(pct) {
    if (pct >= 90) return "brightgreen";
    if (pct >= 80) return "green";
    if (pct >= 70) return "yellowgreen";
    if (pct >= 60) return "yellow";
    if (pct >= 50) return "orange";
    return "red";
}

const percent = (hit, found) => (found > 0 ? (hit / found) * 100 : 0);

/**
 * The badge and the report of one package.
 * @param pkg the package directory name
 * @param lcov its lcov text
 * @param [commit] the commit the coverage was measured on
 * @returns `{ badge, report }`: the endpoint JSON object and the Markdown report
 */
export function render(pkg, lcov, commit) {
    const files = [...linesPerFile(lcov)].sort(([a], [b]) => a.localeCompare(b));
    const found = files.reduce((n, [, f]) => n + f.found, 0);
    const hit = files.reduce((n, [, f]) => n + f.hit, 0);
    const pct = percent(hit, found);
    const badge = { schemaVersion: 1, label: "coverage", message: `${pct.toFixed(1)}%`, color: color(pct) };
    const rows = files.map(
        ([path, f]) => `| ${path} | ${f.hit} / ${f.found} | ${percent(f.hit, f.found).toFixed(1)}% |`,
    );
    const on = commit ? ` on ${commit}` : "";
    const report = [
        `# ${pkg} coverage`,
        "",
        `Line coverage ${pct.toFixed(1)}% (${hit} of ${found} lines)${on}.`,
        "",
        "| File | Lines hit | Coverage |",
        "| --- | --- | --- |",
        ...rows,
        "",
    ].join("\n");
    return { badge, report };
}

if (process.argv[1] && basename(process.argv[1]) === "coverage-badges.mjs") {
    const [input, output, commit] = process.argv.slice(2);
    if (!input || !output) {
        console.error("usage: node tools/coverage-badges.mjs <.coverage-packages dir> <output dir> [commit]");
        process.exit(1);
    }
    mkdirSync(output, { recursive: true });
    for (const name of readdirSync(input).filter((n) => n.endsWith(".info"))) {
        const pkg = name.slice(0, -".info".length);
        const { badge, report } = render(pkg, readFileSync(join(input, name), "utf8"), commit);
        writeFileSync(join(output, `${pkg}.json`), `${JSON.stringify(badge)}\n`);
        writeFileSync(join(output, `${pkg}.md`), report);
        console.log(`${pkg}: ${badge.message}`);
    }
}
