#!/usr/bin/env node
/**
 * Holds individual packages back from a release, so one package that must not ship never stops
 * the others.
 *
 * release-hold.json at the repository root lists the held packages:
 *
 *   { "hold": [{ "project": "graphty-element", "reason": "API change not reviewed", "since": "2026-10-03" }] }
 *
 * `project` is an nx project name (`pnpm exec nx show projects`). `apply` rewrites nx.json's
 * release.projects in the release job's checkout from ["*"] to ["*", "!graphty-element", ...]. A
 * project outside release.projects is outside the release graph entirely, so it is neither
 * versioned from its own commits nor patch-bumped as a dependent of a package that was
 * (`nx release --projects` alone does not do that: with updateDependents "auto" nx adds a filtered
 * project back as a dependent). nx stages only the manifests and changelogs it wrote, so the
 * edited nx.json never reaches the version commit. A held package keeps its last
 * `{projectName}@{version}` tag, so when it leaves the list the next release bumps it from every
 * commit since that tag.
 *
 * An ad hoc release of named packages (release.yml's `packages` input) runs `apply --only a,b`:
 * every project not named is held for that run as well, on top of the holds in the file, which
 * still apply. Nothing is written to release-hold.json.
 *
 * Both modes also check that nx can resolve a current version for every project in nx.json's
 * release.projects: its last `{projectName}@{version}` tag, else the version in its package.json
 * (release.version.fallbackCurrentVersionResolver "disk"). A project with neither stops the whole
 * release train ("Unable to resolve the current version from git tag ... and there is no version
 * on disk to fall back to"); give it a "version" in its package.json. They also check that no project in
 * release.projects is private ("private": true in its package.json): every project is released
 * (owner decision, 2026-10-23), and npm refuses to publish a private package. The workspace root's
 * package.json is not an nx release project and stays private.
 *
 * Usage: node tools/release-hold.mjs check   (exit 1 when release-hold.json is invalid)
 *        node tools/release-hold.mjs apply   (check, then leave the held projects out of nx.json)
 *        node tools/release-hold.mjs apply --only <project>[,<project>...]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Everything wrong with a parsed release-hold.json.
 * @param hold - the parsed file
 * @param projects - every nx project name in the workspace
 * @returns one message per problem; empty when the file is valid
 */
export function problems(hold, projects) {
    if (!Array.isArray(hold?.hold)) {
        return ['release-hold.json must be { "hold": [ ... ] }'];
    }
    const out = [];
    const seen = new Set();
    for (const [i, entry] of hold.hold.entries()) {
        const where = `hold[${i}]`;
        const name = entry?.project;
        if (typeof name !== "string" || !projects.includes(name)) {
            out.push(`${where}: "${name}" is not an nx project (one of: ${projects.join(", ")})`);
        } else if (seen.has(name)) {
            out.push(`${where}: "${name}" is listed twice`);
        }
        seen.add(name);
        if (typeof entry?.reason !== "string" || entry.reason.trim() === "") {
            out.push(`${where}: "reason" must say why ${name} is held`);
        }
        if (typeof entry?.since !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.since)) {
            out.push(`${where}: "since" must be a date, YYYY-MM-DD`);
        }
    }
    if (projects.length > 0 && projects.every((p) => seen.has(p))) {
        out.push("every project is held, which stops the release; hold fewer");
    }
    return out;
}

/**
 * nx.json's release.projects with the held projects left out.
 * @param current - release.projects as nx.json has it
 * @param held - the held project names
 * @returns the new list (the same list when nothing is held)
 */
export function releaseProjects(current, held) {
    return [...current, ...held.map((name) => `!${name}`)];
}

/**
 * The hold list for a release of only the named projects: the file's holds plus every project
 * not named.
 * @param hold - the parsed, valid release-hold.json
 * @param projects - every nx project name in the workspace
 * @param only - the project names to release
 * @param since - today, YYYY-MM-DD
 * @returns the widened hold list, or the problems with `only`
 */
export function holdAllBut(hold, projects, only, since) {
    const unknown = only.filter((name) => !projects.includes(name));
    if (only.length === 0 || unknown.length > 0) {
        return {
            problems: [`--only must name nx projects; not one: ${unknown.join(", ") || "(none given)"}`],
        };
    }
    const held = new Set(hold.hold.map((h) => h.project));
    const reason = `not named by the ad hoc release of ${only.join(", ")}`;
    const extra = projects
        .filter((name) => !only.includes(name) && !held.has(name))
        .map((project) => ({ project, reason, since }));
    return { hold: { hold: [...hold.hold, ...extra] }, problems: [] };
}

/**
 * The projects nx cannot resolve a current version for, so cannot version.
 * @param released - each project in release.projects: its name, its package.json version, and
 *   whether a `{name}@...` tag exists
 * @returns one message per project with neither; empty when every one resolves
 */
export function unversionable(released) {
    return released
        .filter(({ version, tagged }) => !tagged && (typeof version !== "string" || version === ""))
        .map(
            ({ name }) =>
                `nx.json release.projects: ${name} has no ${name}@<version> tag and no version in its ` +
                `package.json, so nx release cannot version it; add "version" to its package.json`,
        );
}

/**
 * The projects in the release that are private, so npm would never publish them.
 * @param released - each project in release.projects: its name and whether its package.json is private
 * @returns one message per private project; empty when none is
 */
export function privateProjects(released) {
    return released
        .filter(({ isPrivate }) => isPrivate === true)
        .map(
            ({ name }) =>
                `nx.json release.projects: ${name} is private ("private": true in its package.json), but every ` +
                `project is released; remove "private" and make it publishable`,
        );
}

/**
 * The projects in nx.json's release.projects, read from nx, their package.json and git tags.
 * @returns the input `unversionable` and `privateProjects` take
 */
function releasedProjects() {
    const nx = (...args) => execFileSync("pnpm", ["exec", "nx", ...args], { cwd: ROOT, encoding: "utf8" });
    const patterns = JSON.parse(readFileSync(join(ROOT, "nx.json"), "utf8")).release.projects;
    const names = JSON.parse(nx("show", "projects", "--json", "-p", patterns.join(",")));
    const nodes = JSON.parse(nx("graph", "--file=stdout")).graph.nodes;
    const tags = execFileSync("git", ["tag", "-l"], { cwd: ROOT, encoding: "utf8" }).split("\n");
    return names.map((name) => {
        let pkg = {};
        try {
            pkg = JSON.parse(readFileSync(join(ROOT, nodes[name].data.root, "package.json"), "utf8"));
        } catch {
            // no package.json: nothing on disk to fall back to
        }
        return {
            name,
            version: pkg.version,
            isPrivate: pkg.private === true,
            tagged: tags.some((tag) => tag.startsWith(`${name}@`)),
        };
    });
}

function fail(found) {
    for (const p of found) console.error(p.startsWith("nx.json") ? p : `release-hold.json: ${p}`);
    process.exit(1);
}

function main(mode, only) {
    let hold = JSON.parse(readFileSync(join(ROOT, "release-hold.json"), "utf8"));
    const projects = JSON.parse(
        execFileSync("pnpm", ["exec", "nx", "show", "projects", "--json"], { cwd: ROOT, encoding: "utf8" }),
    );
    const released = releasedProjects();
    let found = [...problems(hold, projects), ...unversionable(released), ...privateProjects(released)];
    if (found.length > 0) fail(found);
    if (only) {
        const widened = holdAllBut(hold, projects, only, new Date().toISOString().slice(0, 10));
        found = widened.problems.length > 0 ? widened.problems : problems(widened.hold, projects);
        if (found.length > 0) fail(found);
        hold = widened.hold;
    }
    for (const { project, reason, since } of hold.hold) {
        // a workflow annotation in a release run, a plain line anywhere else
        console.log(`::warning::${project} is held from release since ${since}: ${reason}`);
    }
    if (mode !== "apply" || hold.hold.length === 0) return;
    const nxFile = join(ROOT, "nx.json");
    const nx = JSON.parse(readFileSync(nxFile, "utf8"));
    nx.release.projects = releaseProjects(
        nx.release.projects,
        hold.hold.map((h) => h.project),
    );
    writeFileSync(nxFile, `${JSON.stringify(nx, null, 4)}\n`);
    console.log(`nx.json release.projects: ${JSON.stringify(nx.release.projects)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [mode = "check", flag, list] = process.argv.slice(2);
    const onlyGiven = mode === "apply" && flag === "--only";
    if ((mode !== "check" && mode !== "apply") || (flag !== undefined && !onlyGiven)) {
        console.error("usage: node tools/release-hold.mjs [check|apply [--only <project>,...]]");
        process.exit(2);
    }
    const only = onlyGiven
        ? (list ?? "")
              .split(",")
              .map((name) => name.trim())
              .filter(Boolean)
        : undefined;
    main(mode, only);
}
