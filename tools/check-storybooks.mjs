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

const isStory = (e) => e.type === "story";
const tags = (e) => e.tags ?? [];
const top = (e) => e.title.split("/")[0];
const isVisible = (e) => !isStory(e) || tags(e).includes("dev");

/**
 * Groups values under a key.
 * @param list the values
 * @param keyOf the key of one value
 * @returns key -> values, in first-seen order
 */
function groupBy(list, keyOf) {
    const groups = new Map();
    for (const item of list) {
        const key = keyOf(item);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
    }
    return groups;
}

/**
 * Sections come from the taxonomy; there is an Introduction, and every other section has an Overview page
 * that links the package's docs.
 * @param c the check's context
 */
function checkSections(c) {
    for (const section of c.sections) {
        if (!c.taxonomy.sections.includes(section)) {
            c.problem(
                `section "${section}" is not in tools/storybook-taxonomy.json (${c.taxonomy.sections.join(", ")})`,
            );
        }
    }
    if (!c.sections.has("Introduction")) c.problem("there is no Introduction section");
    const docsLink = c.taxonomy.docsLink ?? DOCS_LINK;
    for (const section of [...c.sections].filter((s) => s !== "Introduction")) {
        const overview = c.overviewOf(section);
        if (!overview) {
            c.problem(`section "${section}" has no Overview docs page (title "${section}/Overview")`);
            continue;
        }
        const text = c.readSource(overview.importPath);
        if (text !== null && !text.includes(docsLink)) {
            c.problem(`${overview.importPath}: the ${section} Overview does not link to ${docsLink}`);
        }
    }
}

/**
 * The sidebar shows the sections in the taxonomy's order, each in one piece, and every section but the
 * Introduction opens on its Overview. index.json lists the entries in sidebar order.
 * @param c the check's context
 */
function checkOrder(c) {
    const runs = [];
    for (const e of c.visible) {
        if (runs.at(-1)?.section !== top(e)) runs.push({ section: top(e), first: e });
    }
    const order = runs.map((r) => r.section);
    const expected = c.taxonomy.sections.filter((s) => c.sections.has(s));
    if (order.join("\u0000") !== expected.join("\u0000")) {
        c.problem(
            `the sidebar lists the sections as ${order.join(" > ")}, not in the taxonomy's order (${expected.join(" > ")}); keep .storybook/preview's storySort.order and tools/storybook-taxonomy.json the same`,
        );
    }
    for (const { section, first } of runs.filter((r) => r.section !== "Introduction")) {
        if (first !== c.overviewOf(section)) {
            c.problem(`section "${section}" opens on "${first.title}" (${first.id}), not on its Overview`);
        }
    }
}

/**
 * A link from an MDX page to another page of this Storybook ("?path=/story/<id>" or "?path=/docs/<id>") names an
 * entry that exists, and a story a reader can find in the sidebar. A link into another Storybook
 * (https://graphty.app/storybook/<name>/?path=...) is tools/check-storybook-links.mjs's.
 * @param c the check's context
 */
function checkMdxLinks(c) {
    const mdxFiles = new Set(
        c.all.filter((e) => e.type === "docs" && e.importPath.endsWith(".mdx")).map((e) => e.importPath),
    );
    for (const importPath of mdxFiles) {
        const text = c.readSource(importPath) ?? "";
        for (const m of text.matchAll(/(storybook\/[a-z-]+\/)?\?path=\/(?:story|docs)\/([A-Za-z0-9_-]+)/g)) {
            if (m[1]) continue;
            const target = c.entries[m[2]];
            if (!target) {
                c.problem(`${importPath}: links to "${m[2]}", which is not in this Storybook`);
            } else if (!isVisible(target)) {
                c.problem(`${importPath}: links to "${m[2]}", a story hidden from the sidebar; link a visible one`);
            }
        }
    }
}

/**
 * Two entries with one title and one name show up as two identical sidebar items.
 * @param c the check's context
 */
function checkDuplicates(c) {
    for (const [key, list] of groupBy(c.visible, (e) => `${e.title}::${e.name}`)) {
        if (list.length > 1) {
            const [title, name] = key.split("::");
            c.problem(`"${title}" has two entries named "${name}" (${list.map((e) => e.id).join(", ")})`);
        }
    }
}

/**
 * One component id spread over several titles gets one Docs page, under one of them (strategy, section 2,
 * rule 5). A title left without one is reached from its section's Overview, which must link one of its
 * visible stories.
 * @param c the check's context
 */
function checkSharedIds(c) {
    const docsTitles = new Set(c.all.filter((e) => e.type === "docs").map((e) => e.title));
    for (const [component, stories] of groupBy(c.all.filter(isStory), (e) => e.id.split("--")[0])) {
        const titles = groupBy(stories, (e) => e.title);
        if (titles.size < 2) continue;
        for (const [title, list] of titles) {
            const shown = list.filter(isVisible);
            if (docsTitles.has(title) || shown.length === 0) continue;
            const overview = c.overviewOf(top(list[0]));
            const text = overview ? (c.readSource(overview.importPath) ?? "") : "";
            if (!shown.some((e) => text.includes(`?path=/story/${e.id}`))) {
                c.problem(
                    `"${title}" shares the component id "${component}" with another title and has no Docs page; link one of its stories (?path=/story/${shown[0].id}) from the section's Overview`,
                );
            }
        }
    }
}

/**
 * Hidden stories stay hidden and stay tested.
 * @param c the check's context
 */
function checkHiddenTags(c) {
    for (const e of c.all.filter(isStory)) {
        const t = tags(e);
        if (!t.includes("regression") && !t.includes("internal")) continue;
        if (t.includes("dev") || t.includes("autodocs")) {
            c.problem(`${e.id}: a regression or internal story must carry "!dev" and "!autodocs"`);
        }
        if (!t.includes("test")) {
            c.problem(`${e.id}: a regression or internal story must keep the "test" tag (never "!test")`);
        }
    }
}

/**
 * Names a reader sees: no auto-split identifiers, and Default then Playground first in each component.
 * @param c the check's context
 */
function checkNames(c) {
    const stories = c.visible.filter(isStory);
    for (const e of stories.filter((s) => AUTO_SPLIT.test(s.name))) {
        c.problem(`${e.id}: the name "${e.name}" looks split from an identifier; set the story's "name"`);
    }
    for (const [title, list] of groupBy(stories, (e) => e.title)) {
        const names = list.map((s) => s.name);
        const defaultAt = names.indexOf("Default");
        const playgroundAt = names.indexOf("Playground");
        if (defaultAt > 0) c.problem(`"${title}": Default must be the first story`);
        if (playgroundAt >= 0 && playgroundAt !== (defaultAt >= 0 ? 1 : 0)) {
            c.problem(`"${title}": Playground must come right after Default (or first)`);
        }
    }
}

/**
 * Every story with an approved image is still in the build.
 * @param c the check's context
 */
function checkBaselines(c) {
    const renamedTo = new Map(c.renames.map((r) => [r.from, r.to]));
    for (const id of c.baselineIds) {
        if (c.ids.has(id) || c.ids.has(renamedTo.get(id))) continue;
        c.problem(
            `${id}: has a baseline in visual-baselines/${c.pkg}/ and is not in the build; keep the old meta "id" (or the export name) so the id stays, or ask the owner for a rename record`,
        );
    }
}

/**
 * The accessibility budget, from the storybook test project's reports.
 * @param c the check's context
 */
function checkA11y(c) {
    const budget = c.taxonomy.a11yBudget;
    if (budget === null || budget === undefined) {
        c.note("accessibility: no budget yet (a11yBudget is null), not counted");
        return;
    }
    if (c.reports === null) {
        c.note(
            "accessibility: no story test reports in .storybook-reports/ (run the storybook test project), not counted",
        );
        return;
    }
    const count = c.reports
        .filter((r) => c.ids.has(r.id))
        .reduce((sum, r) => sum + (Number.isFinite(r.a11yViolations) ? r.a11yViolations : 0), 0);
    if (count > budget) c.problem(`accessibility: ${count} violations, over the budget of ${budget}`);
    else c.note(`accessibility: ${count} violations, budget ${budget}`);
}

/**
 * Some CI shard runs the stories as tests.
 * @param c the check's context
 */
function checkShard(c) {
    const shard = c.shards.find((s) => s.shard === c.taxonomy.storyShard);
    if (!c.taxonomy.storyShard || shard?.package !== c.pkg) {
        c.problem(
            `no CI shard runs these stories: storyShard "${c.taxonomy.storyShard ?? ""}" is not a shard of ${c.pkg} in tools/ci-test-matrix.mjs`,
        );
    }
}

const RULES = [
    checkSections,
    checkOrder,
    checkMdxLinks,
    checkDuplicates,
    checkSharedIds,
    checkHiddenTags,
    checkNames,
    checkBaselines,
    checkA11y,
    checkShard,
];

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
export function checkStorybook(input) {
    const problems = [];
    const notes = [];
    const all = Object.values(input.entries);
    const visible = all.filter(isVisible);
    // An Overview page is titled "<section>/Overview", or is the docs entry named Overview of the title "<section>".
    const overviewOf = (section) =>
        all.find(
            (e) =>
                e.type === "docs" &&
                (e.title === `${section}/Overview` || (e.title === section && e.name === "Overview")),
        );
    const context = {
        ...input,
        all,
        visible,
        sections: new Set(visible.map(top)),
        ids: new Set(Object.keys(input.entries)),
        overviewOf,
        problem: (text) => problems.push(text),
        note: (text) => notes.push(text),
    };
    for (const rule of RULES) rule(context);
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

/**
 * The Storybooks visual-review captures that the taxonomy does not list.
 * @param root the checkout
 * @param taxonomy the taxonomy's packages
 * @returns the project names
 */
function uncaptured(root, taxonomy) {
    const config = join(root, "visual-review.config.json");
    const captured = existsSync(config) ? Object.keys(JSON.parse(readFileSync(config, "utf8")).projects) : [];
    return captured.filter((p) => !taxonomy[p]);
}

/**
 * Checks one package's build and prints what it found.
 * @param pkg the package
 * @param options where to read from
 * @param options.root the checkout
 * @param options.reportsRoot the checkout whose story test reports are read
 * @param options.taxonomy the taxonomy's packages
 * @param options.shards the CI test shards
 * @returns the number of problems, or null when the package cannot be checked at all
 */
function checkPackage(pkg, { root, reportsRoot, taxonomy, shards }) {
    const label = `check-storybooks ${pkg}`;
    if (!taxonomy[pkg]) {
        console.log(`${label}: not in tools/storybook-taxonomy.json`);
        return null;
    }
    const indexFile = join(root, pkg, "storybook-static", "index.json");
    if (!existsSync(indexFile)) {
        console.log(`${label}: no build (${indexFile} is missing; build the Storybook first)`);
        return null;
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
        shards,
    });
    for (const p of problems) console.log(`${label}: ${p}`);
    for (const n of notes) console.log(`${label}: ${n}`);
    console.log(`${label}: ${Object.keys(entries).length} entries, ${problems.length} problems`);
    return problems.length;
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

    let found = 0;
    if (named.length === 0) {
        for (const project of uncaptured(root, taxonomy)) {
            console.log(
                `check-storybooks: ${project} has a Storybook (visual-review.config.json) and is not in tools/storybook-taxonomy.json`,
            );
            found++;
        }
    }
    const counts = (named.length > 0 ? named : Object.keys(taxonomy)).map((pkg) =>
        checkPackage(pkg, { root, reportsRoot, taxonomy, shards: SHARDS }),
    );
    const failed = counts.includes(null);
    found += counts.reduce((sum, n) => sum + (n ?? 0), 0);
    if (reportOnly && found > 0) {
        console.log(`check-storybooks: report only, so ${found} problems do not fail this run`);
    }
    process.exit(failed || (found > 0 && !reportOnly) ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main(process.argv.slice(2));
}
