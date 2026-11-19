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
});
