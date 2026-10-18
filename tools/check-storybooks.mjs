#!/usr/bin/env node
/**
 * check-storybooks.mjs -- the structural rules every published Storybook keeps
 * (design/storybook/strategy.md, section 4.1).
 *
 * Usage: node tools/check-storybooks.mjs [--report-only] [--root <dir>] [--reports-root <dir>] [<package>...]
 *   <package>             a package directory with a Storybook, as tools/storybook-taxonomy.json names it;
 *                         none means every package there, and then every project visual-review.config.json
 *                         captures must be in the taxonomy too
 *   --root <dir>          the checkout whose builds, MDX files, baselines, taxonomy and CI shards are read
 *                         (default: this one)
 *   --reports-root <dir>  the checkout whose story test reports are read (default: --root)
 *   --report-only         print every problem, but exit 0 for them; a missing build still fails
 *
 * It reads <root>/<package>/storybook-static/index.json, the MDX files that index names (by
 * importPath), <root>/visual-baselines/<package>/ (file names only, never written), the story test
 * reports in <root>/<package>/.storybook-reports/ (written by the storybook test project's setup,
 * tools/storybook-story-checks.mjs), tools/storybook-taxonomy.json and tools/ci-test-matrix.mjs.
 *
 * A story is visible when it has the `dev` tag (Storybook gives every story `dev` unless it says
 * `!dev`), and a docs entry is always visible. The sidebar rules apply to visible entries only;
 * hidden regression and internal stories may keep their old titles.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const AUTO_SPLIT = /\b[A-Z] \d|\d [A-Z]\b|\b[A-Z] [A-Z]\b/;
const DOCS_LINK = "https://graphty.app/docs/";

/**
 * Every problem one package's Storybook has.
 * @param input what is checked
 * @param input.pkg the package
 * @param input.taxonomy its taxonomy entry
 * @param input.entries index.json's entries
 * @param input.readSource the text of a file the index names
 * @param input.baselineIds the story ids that have a baseline image
 * @param input.renames the baseline rename records
 * @param input.reports the story test reports, or null when none were written
 * @param input.shards the CI test shards
 * @returns the problems, and notes on what was not counted
 */
export function checkStorybook({ pkg, taxonomy, entries, readSource, baselineIds, renames, reports, shards }) {
    const problems = [];
    const notes = [];
    const all = Object.values(entries);
    const isStory = (e) => e.type === "story";
    const tags = (e) => e.tags ?? [];
    const visible = all.filter((e) => !isStory(e) || tags(e).includes("dev"));
    const top = (e) => e.title.split("/")[0];

    // Sections come from the taxonomy; every one but Introduction opens with an Overview page.
    const sections = new Set(visible.map(top));
    for (const section of sections) {
        if (!taxonomy.sections.includes(section)) {
            problems.push(
                `section "${section}" is not in tools/storybook-taxonomy.json (${taxonomy.sections.join(", ")})`,
            );
        }
    }
    if (!sections.has("Introduction")) {
        problems.push("there is no Introduction section");
    }
    // An Overview page is titled "<section>/Overview", or is the docs entry named Overview of the title "<section>".
    const overviewOf = (section) =>
        all.find(
            (e) =>
                e.type === "docs" &&
                (e.title === `${section}/Overview` || (e.title === section && e.name === "Overview")),
        );
    for (const section of [...sections].filter((s) => s !== "Introduction")) {
        const overview = overviewOf(section);
        if (!overview) {
            problems.push(`section "${section}" has no Overview docs page (title "${section}/Overview")`);
            continue;
        }
        const text = readSource(overview.importPath);
        const docsLink = taxonomy.docsLink ?? DOCS_LINK;
        if (text !== null && !text.includes(docsLink)) {
            problems.push(`${overview.importPath}: the ${section} Overview does not link to ${docsLink}`);
        }
    }

    // The sidebar shows the sections in the taxonomy's order, each in one piece, and every section but the
    // Introduction opens on its Overview. index.json lists the entries in sidebar order.
    const runs = [];
    for (const e of visible) {
        if (runs.at(-1)?.section !== top(e)) runs.push({ section: top(e), first: e });
    }
    const order = runs.map((r) => r.section);
    const expected = taxonomy.sections.filter((s) => sections.has(s));
    if (order.join("\u0000") !== expected.join("\u0000")) {
        problems.push(
            `the sidebar lists the sections as ${order.join(" > ")}, not in the taxonomy's order (${expected.join(" > ")}); keep .storybook/preview's storySort.order and tools/storybook-taxonomy.json the same`,
        );
    }
    for (const { section, first } of runs.filter((r) => r.section !== "Introduction")) {
        if (first !== overviewOf(section)) {
            problems.push(`section "${section}" opens on "${first.title}" (${first.id}), not on its Overview`);
        }
    }

    // A link from an MDX page to another page of this Storybook ("?path=/story/<id>" or "?path=/docs/<id>") names
    // an entry that exists, and a story a reader can find in the sidebar. A link into another Storybook
    // (https://graphty.app/storybook/<name>/?path=...) is tools/check-storybook-links.mjs's.
    const mdxFiles = new Set(
        all.filter((e) => e.type === "docs" && e.importPath.endsWith(".mdx")).map((e) => e.importPath),
    );
    for (const importPath of mdxFiles) {
        const text = readSource(importPath) ?? "";
        for (const m of text.matchAll(/(storybook\/[a-z-]+\/)?\?path=\/(?:story|docs)\/([A-Za-z0-9_-]+)/g)) {
            if (m[1]) continue;
            const target = entries[m[2]];
            if (!target) {
                problems.push(`${importPath}: links to "${m[2]}", which is not in this Storybook`);
            } else if (isStory(target) && !tags(target).includes("dev")) {
                problems.push(`${importPath}: links to "${m[2]}", a story hidden from the sidebar; link a visible one`);
            }
        }
    }

    // Two entries with one title and one name show up as two identical sidebar items.
    const seen = new Map();
    for (const e of visible) {
        const key = `${e.title}::${e.name}`;
        if (seen.has(key)) {
            problems.push(`"${e.title}" has two entries named "${e.name}" (${seen.get(key)}, ${e.id})`);
        } else {
            seen.set(key, e.id);
        }
    }

    // One component id spread over several titles gets one Docs page, under one of them (strategy, section 2,
    // rule 5). A title left without one is reached from its section's Overview, which must link one of its
    // visible stories.
    const titlesOf = new Map();
    for (const e of all.filter(isStory)) {
        const component = e.id.split("--")[0];
        if (!titlesOf.has(component)) titlesOf.set(component, new Set());
        titlesOf.get(component).add(e.title);
    }
    const docsTitles = new Set(all.filter((e) => e.type === "docs").map((e) => e.title));
    for (const [component, titles] of titlesOf) {
        if (titles.size < 2) continue;
        for (const title of [...titles].filter((t) => !docsTitles.has(t))) {
            const stories = visible.filter((v) => isStory(v) && v.title === title);
            const overview = overviewOf(title.split("/")[0]);
            const text = overview ? (readSource(overview.importPath) ?? "") : "";
            if (stories.length > 0 && !stories.some((e) => text.includes(`?path=/story/${e.id}`))) {
                problems.push(
                    `"${title}" shares the component id "${component}" with another title and has no Docs page; link one of its stories (?path=/story/${stories[0].id}) from the section's Overview`,
                );
            }
        }
    }

    // Hidden stories stay hidden and stay tested.
    for (const e of all.filter(isStory)) {
        const t = tags(e);
        if (!t.includes("regression") && !t.includes("internal")) continue;
        if (t.includes("dev") || t.includes("autodocs")) {
            problems.push(`${e.id}: a regression or internal story must carry "!dev" and "!autodocs"`);
        }
        if (!t.includes("test")) {
            problems.push(`${e.id}: a regression or internal story must keep the "test" tag (never "!test")`);
        }
    }

    // Names a reader sees.
    const byTitle = new Map();
    for (const e of visible.filter(isStory)) {
        if (AUTO_SPLIT.test(e.name)) {
            problems.push(`${e.id}: the name "${e.name}" looks split from an identifier; set the story's "name"`);
        }
        if (!byTitle.has(e.title)) byTitle.set(e.title, []);
        byTitle.get(e.title).push(e);
    }
    for (const [title, stories] of byTitle) {
        const names = stories.map((s) => s.name);
        const at = (name) => names.indexOf(name);
        if (at("Default") > 0) {
            problems.push(`"${title}": Default must be the first story`);
        }
        if (at("Playground") >= 0 && at("Playground") !== (at("Default") >= 0 ? 1 : 0)) {
            problems.push(`"${title}": Playground must come right after Default (or first)`);
        }
    }

    // Every story with an approved image is still in the build.
    const ids = new Set(Object.keys(entries));
    const renamedTo = new Map(renames.map((r) => [r.from, r.to]));
    for (const id of baselineIds) {
        if (ids.has(id) || ids.has(renamedTo.get(id))) continue;
        problems.push(
            `${id}: has a baseline in visual-baselines/${pkg}/ and is not in the build; keep the old meta "id" (or the export name) so the id stays, or ask the owner for a rename record`,
        );
    }

    // The accessibility budget, from the storybook test project's reports.
    if (taxonomy.a11yBudget === null || taxonomy.a11yBudget === undefined) {
        notes.push("accessibility: no budget yet (a11yBudget is null), not counted");
    } else if (reports === null) {
        notes.push(
            "accessibility: no story test reports in .storybook-reports/ (run the storybook test project), not counted",
        );
    } else {
        const count = reports
            .filter((r) => ids.has(r.id))
            .reduce((sum, r) => sum + (Number.isFinite(r.a11yViolations) ? r.a11yViolations : 0), 0);
        if (count > taxonomy.a11yBudget) {
            problems.push(`accessibility: ${count} violations, over the budget of ${taxonomy.a11yBudget}`);
        } else {
            notes.push(`accessibility: ${count} violations, budget ${taxonomy.a11yBudget}`);
        }
    }

    // Some CI shard runs the stories as tests.
    const shard = shards.find((s) => s.shard === taxonomy.storyShard);
    if (!taxonomy.storyShard || !shard || shard.package !== pkg) {
        problems.push(
            `no CI shard runs these stories: storyShard "${taxonomy.storyShard ?? ""}" is not a shard of ${pkg} in tools/ci-test-matrix.mjs`,
        );
    }

    return { problems, notes };
}

/**
 * The story ids a package's baselines name: a file's name before its first ".", for PNG files.
 * @param dir visual-baselines/<package>
 * @returns the ids, and the rename records of renames.json
 */
export function readBaselines(dir) {
    if (!existsSync(dir)) return { ids: [], renames: [] };
    const files = readdirSync(dir);
    const ids = [...new Set(files.filter((f) => f.endsWith(".png")).map((f) => f.split(".")[0]))];
    const renamesFile = join(dir, "renames.json");
    const renames = existsSync(renamesFile) ? JSON.parse(readFileSync(renamesFile, "utf8")) : [];
    return { ids, renames };
}

/**
 * The story test reports a package's storybook test project wrote, or null when there are none.
 * @param dir <package>/.storybook-reports
 * @returns the reports, or null
 */
function readReports(dir) {
    if (!existsSync(dir)) return null;
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    return files.length === 0 ? null : files.map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}

async function main(argv) {
    const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
    const reportOnly = argv.includes("--report-only");
    const root = resolve(option("--root") ?? join(HERE, ".."));
    const reportsRoot = resolve(option("--reports-root") ?? root);
    const values = new Set([option("--root"), option("--reports-root")]);
    const named = argv.filter((a) => !a.startsWith("--") && !values.has(a));
    // The checkout's own taxonomy and shard list, as CI reads them; this copy's when it has none.
    const own = (file) => (existsSync(join(root, "tools", file)) ? join(root, "tools", file) : join(HERE, file));
    const taxonomy = JSON.parse(readFileSync(own("storybook-taxonomy.json"), "utf8")).packages;
    const { SHARDS } = await import(pathToFileURL(own("ci-test-matrix.mjs")).href);
    const packages = named.length > 0 ? named : Object.keys(taxonomy);

    let failed = false;
    let found = 0;
    if (named.length === 0) {
        const config = join(root, "visual-review.config.json");
        const captured = existsSync(config) ? Object.keys(JSON.parse(readFileSync(config, "utf8")).projects) : [];
        for (const project of captured.filter((p) => !taxonomy[p])) {
            console.log(
                `check-storybooks: ${project} has a Storybook (visual-review.config.json) and is not in tools/storybook-taxonomy.json`,
            );
            found++;
        }
    }
    for (const pkg of packages) {
        const label = `check-storybooks ${pkg}`;
        if (!taxonomy[pkg]) {
            console.log(`${label}: not in tools/storybook-taxonomy.json`);
            failed = true;
            continue;
        }
        const indexFile = join(root, pkg, "storybook-static", "index.json");
        if (!existsSync(indexFile)) {
            console.log(`${label}: no build (${indexFile} is missing; build the Storybook first)`);
            failed = true;
            continue;
        }
        const { entries } = JSON.parse(readFileSync(indexFile, "utf8"));
        const { ids, renames } = readBaselines(join(root, "visual-baselines", pkg));
        const { problems, notes } = checkStorybook({
            pkg,
            taxonomy: taxonomy[pkg],
            entries,
            readSource: (importPath) => {
                const file = join(root, pkg, importPath);
                return existsSync(file) ? readFileSync(file, "utf8") : null;
            },
            baselineIds: ids,
            renames,
            reports: readReports(join(reportsRoot, pkg, ".storybook-reports")),
            shards: SHARDS,
        });
        for (const p of problems) console.log(`${label}: ${p}`);
        for (const n of notes) console.log(`${label}: ${n}`);
        console.log(`${label}: ${Object.keys(entries).length} entries, ${problems.length} problems`);
        found += problems.length;
    }
    if (reportOnly && found > 0) {
        console.log(`check-storybooks: report only, so ${found} problems do not fail this run`);
    }
    process.exit(failed || (found > 0 && !reportOnly) ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main(process.argv.slice(2));
}
