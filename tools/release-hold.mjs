#!/usr/bin/env node
/**
 * Holds individual packages back from a release, so one package that must not ship never stops
 * the others (or the graphty.app deploy, which runs only after a release).
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
 * Usage: node tools/release-hold.mjs check   (exit 1 when release-hold.json is invalid)
 *        node tools/release-hold.mjs apply   (check, then leave the held projects out of nx.json)
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
        out.push("every project is held, which stops the release and the graphty.app deploy; hold fewer");
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

function main(mode) {
    const hold = JSON.parse(readFileSync(join(ROOT, "release-hold.json"), "utf8"));
    const projects = JSON.parse(
        execFileSync("pnpm", ["exec", "nx", "show", "projects", "--json"], { cwd: ROOT, encoding: "utf8" }),
    );
    const found = problems(hold, projects);
    if (found.length > 0) {
        for (const p of found) console.error(`release-hold.json: ${p}`);
        process.exit(1);
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
    const mode = process.argv[2] ?? "check";
    if (mode !== "check" && mode !== "apply") {
        console.error("usage: node tools/release-hold.mjs [check|apply]");
        process.exit(2);
    }
    main(mode);
}
