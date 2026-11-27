// The Designloom records in design/designloom/ are the UI requirements base: personas, workflows, capabilities and
// components name each other by id. This checks that every id resolves and every link is listed from both sides.
//
//   node --test tools/designloom-links.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { parse as parseYaml } from "yaml";

const ROOT = new URL("../", import.meta.url);
const DIR = new URL("design/designloom/", ROOT);
// Designloom's status enum for capabilities and components
const STATUSES = ["planned", "in-progress", "implemented", "deprecated"];

/**
 * Every record of one kind, by id.
 * @param kind the subdirectory
 * @returns a Map of id to record
 */
function load(kind) {
    const dir = new URL(`${kind}/`, DIR);
    const records = new Map();
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
        const record = parseYaml(readFileSync(new URL(file, dir), "utf8"));
        assert.equal(`${record.id}.yaml`, file, `${kind}/${file} has id ${record.id}`);
        records.set(record.id, record);
    }
    return records;
}

const kinds = {
    personas: load("personas"),
    workflows: load("workflows"),
    capabilities: load("capabilities"),
    components: load("components"),
};

// [from kind, field, to kind, back field]: each id in `field` names a record of `to kind`, which lists the
// first record back in `back field`
const LINKS = [
    ["personas", "workflows", "workflows", "personas"],
    ["workflows", "requires_capabilities", "capabilities", "used_by_workflows"],
    ["capabilities", "implemented_by_components", "components", "implements_capabilities"],
    ["workflows", "suggested_components", "components", "used_in_workflows"],
];
// one-way links: each id names an existing record
const REFS = [["components", "dependencies", "components"]];

/**
 * The broken links of one link field.
 * @param from the kind holding the field
 * @param field the field listing ids
 * @param to the kind the ids name
 * @param [back] the field on the named record that must list the first record
 * @returns one line per broken link
 */
function broken(from, field, to, back) {
    const out = [];
    for (const [id, record] of kinds[from]) {
        for (const target of record[field] ?? []) {
            const other = kinds[to].get(target);
            if (!other) out.push(`${from}/${id} ${field}: no ${to}/${target}`);
            else if (back && !(other[back] ?? []).includes(id)) out.push(`${to}/${target} ${back}: missing ${id}`);
        }
    }
    return out;
}

describe("Designloom links", () => {
    for (const [from, field, to, back] of LINKS) {
        it(`${from}.${field} and ${to}.${back} agree`, () => {
            assert.deepEqual([...broken(from, field, to, back), ...broken(to, back, from, field)], []);
        });
    }
    for (const [from, field, to] of REFS) {
        it(`${from}.${field} names existing ${to}`, () => {
            assert.deepEqual(broken(from, field, to), []);
        });
    }
    for (const kind of ["capabilities", "components"]) {
        it(`${kind} have a known status, and a shipped one names its code`, () => {
            const out = [];
            for (const [id, record] of kinds[kind]) {
                const status = record.status ?? "planned";
                if (!STATUSES.includes(status)) out.push(`${kind}/${id}: unknown status ${status}`);
                if (status !== "implemented" && status !== "in-progress") continue;
                const paths = String(record.notes ?? "").match(/[\w-]+\/[\w./-]*[\w/]/g) ?? [];
                if (paths.length === 0) out.push(`${kind}/${id}: ${status} but notes name no code`);
                for (const path of paths) if (!existsSync(new URL(path, ROOT))) out.push(`${kind}/${id}: no ${path}`);
            }
            assert.deepEqual(out, []);
        });
    }
    // A capability carries its research trace: at least one requirement and at least one source
    // (population-to-designloom-persona-index.md 10.1).
    it("capabilities have requirements and sources", () => {
        const out = [];
        for (const [id, record] of kinds.capabilities) {
            if ((record.requirements ?? []).length === 0) out.push(`capabilities/${id}: no requirements`);
            if ((record.sources ?? []).length === 0) out.push(`capabilities/${id}: no sources`);
        }
        assert.deepEqual(out, []);
    });
    // Every requirement line carries the priority of the research row it comes from, or says no row backs it
    // (population-to-designloom-persona-index.md 10.1).
    it("capability requirements carry a priority", () => {
        const out = [];
        for (const [id, record] of kinds.capabilities)
            for (const line of record.requirements ?? [])
                if (!/^(Must|Should|Could|Library parity): /.test(line))
                    out.push(`capabilities/${id}: ${String(line).slice(0, 60)}`);
        assert.deepEqual(out, []);
    });
    // A phase heading ("3. **Trace** (minutes)") carries a duration only when a research document gives that step
    // that time, or the workflow's own sources state it; a time target in success_criteria is sourced the same way
    // or says "design goal; no source measures it" (design/user-research/population-to-designloom-persona-index.md 1).
    it("workflow durations and time targets are sourced or labeled", () => {
        const DUR = /\b(seconds?|minutes?|hours?|days?|weeks?|months?|years?|mins?|h)\b|estimate/i;
        const QTY =
            /\b(\d[\d,.]*(?:-\d[\d,.]*)?|one|two|three|four|five|six|ten|twelve|thirty)[\s-]*(seconds?|minutes?|hours?|days?|weeks?|months?|min|h)\b/gi;
        const TIME_TARGET =
            /\b(under|within|about|inside|in)\b.*?\b(\d[\d,.]*|one|two|three|ten|an?)[\s-]*(seconds?|minutes?|hours?|days?|weeks?)\b|one working day|within hours/i;
        const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normDur = (s) =>
            norm(s.replace(/\bmins?\b|\bminute\b/gi, "minutes").replace(/\bh\b|\bhour\b/gi, "hours"));
        const research = new URL("design/user-research/", ROOT);
        const steps = [];
        for (const f of readdirSync(research).filter((f) => f.endsWith(".md"))) {
            for (const line of readFileSync(new URL(f, research), "utf8").split("\n")) {
                const m = line.match(/^\s*\d+\.\s+\*\*([^*(]+?)\s*(?:\(([^)]*)\))?[.:]?\*\*\s*(?:\(([^)]*)\))?/);
                for (const part of m ? `${m[2] ?? ""};${m[3] ?? ""}`.split(/[,;]\s*/) : [])
                    if (DUR.test(part)) steps.push(`${norm(m[1])}|${normDur(part)}`);
            }
        }
        const out = [];
        for (const [id, record] of kinds.workflows) {
            const sources = JSON.stringify(record.sources ?? []).toLowerCase();
            const cited = (text) => [...text.matchAll(QTY)].some((q) => sources.includes(q[0].toLowerCase()));
            for (const [, name, paren] of String(record.goal ?? "").matchAll(
                /^\s*\d+\. \*\*([^*]+)\*\* *\(([^)]*)\)/gm,
            )) {
                for (const part of paren.split(/[,;]\s*/)) {
                    const sourced = steps.some((k) => k.startsWith(`${norm(name)}|${normDur(part)}`)) || cited(part);
                    if (DUR.test(part) && !sourced) out.push(`${id} step "${name}": unsourced duration "${part}"`);
                }
            }
            for (const { target } of record.success_criteria ?? []) {
                const t = String(target ?? "");
                const labeled = /design goal|no source|unvalidated|estimate|https?:/i.test(t);
                if (TIME_TARGET.test(t) && !labeled && !cited(t))
                    out.push(`${id} target "${t}": unlabeled time target`);
            }
        }
        assert.deepEqual(out, []);
    });
    // Personas are named in reviews and studio runs, so a bio's leading name ("Dr. Lena Brandt is ...") must
    // name one persona: its given name is used by no other bio, and the full name is no other persona's id.
    it("persona names are unique", () => {
        const owners = new Map();
        const out = [];
        for (const [id, record] of kinds.personas) {
            const m = String(record.bio ?? "").match(
                /^(?:(?:Dr\.|Prof\.|Professor|Sgt\.)\s+)?([A-Z][\w'-]+)((?:\s+[A-Z][\w'-]+)?)/,
            );
            if (!m || ["A", "An", "The", "This"].includes(m[1])) continue;
            if (owners.has(m[1])) out.push(`${id} and ${owners.get(m[1])} are both ${m[1]}`);
            else owners.set(m[1], id);
            const slug = `${m[1]}${m[2]}`.toLowerCase().replace(/\s+/g, "-");
            if (slug !== id && kinds.personas.has(slug)) out.push(`${id} is named after personas/${slug}`);
        }
        assert.deepEqual(out, []);
    });
    // A tier belongs to the roster persona, so every in-scope file of one roster id carries the same tier
    // (population-to-designloom-persona-index.md 3.3).
    it("in-scope personas share their roster persona's tier", () => {
        const tiers = new Map();
        const out = [];
        for (const [id, record] of kinds.personas) {
            if (record.scope !== "in-scope") continue;
            const first = tiers.get(record.roster_persona);
            if (!first) tiers.set(record.roster_persona, { id, tier: record.tier });
            else if (first.tier !== record.tier)
                out.push(`${id} is tier ${record.tier}, ${first.id} (${record.roster_persona}) is ${first.tier}`);
        }
        assert.deepEqual(out, []);
    });
});
