/**
 * @file The published expression language (spec/README.md, section 4.8.2) against graphty-element's
 * evaluator: every case in spec/conformance/expressions.json matches or is refused as it says, every
 * `where` the worked examples hold parses, and every path member they hold is a raw path of the
 * shape section 4.8.1 gives.
 */

import { readdirSync, readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import type { Path } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { PATH_MEMBERS } from "../../../src/session/document2/codecs/recipeCommands";
import { compileExpressionPredicate, expressionPaths } from "../../../src/session/styles/predicate";

const SPEC = new URL("../../../spec/", import.meta.url);

/** One case of the conformance file. */
interface Case {
    readonly where: string;
    readonly on?: "nodes" | "edges";
    readonly values?: Readonly<Record<Path, unknown>>;
    readonly matches?: boolean;
    readonly refused?: true;
}

const { cases } = JSON.parse(readFileSync(new URL("conformance/expressions.json", SPEC), "utf8")) as {
    cases: readonly Case[];
};

/**
 * Whether an expression matches one element holding some values.
 * @param where - The expression.
 * @param values - The element's values, by raw path.
 * @returns True when it matches.
 */
function matches(where: string, values: Readonly<Record<Path, unknown>>): boolean {
    const { test } = compileExpressionPredicate(where, {
        value: (_index, path) => values[path],
        has: (_index, path) => values[path] !== undefined && values[path] !== null,
        idOf: null,
        indexOf: null,
    });
    return test(0);
}

describe("the expression conformance cases", () => {
    it("holds about forty cases, each a match or a refusal", () => {
        assert.isAtLeast(cases.length, 40);
        for (const each of cases) {
            assert.isTrue(each.refused === true || typeof each.matches === "boolean", each.where);
        }
    });

    for (const each of cases) {
        if (each.refused === true) {
            it(`refuses ${each.where}`, () => {
                try {
                    matches(each.where, {});
                } catch (error) {
                    assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_SELECTOR", String(error));
                    return;
                }

                assert.fail(`${each.where} was accepted`);
            });
        } else {
            it(`${each.where} over ${JSON.stringify(each.values)} is ${String(each.matches)}`, () => {
                assert.strictEqual(matches(each.where, each.values ?? {}), each.matches);
            });
        }
    }
});

/** The section kinds whose members read paths and expressions. */
const READING_KINDS = new Set(["graphty-style", "graphty-view", "graphty-recipe"]);

/** The pattern of a raw path (common schema `path`). */
const PATH = /^(data\..+|store\.graphty\.[^.]+\..+|graphty\..+|_source\.loads)$/;

/**
 * Every example file, as a path under spec/examples/.
 * @returns The files.
 */
function exampleFiles(): string[] {
    return readdirSync(new URL("examples/", SPEC), { recursive: true, encoding: "utf8" })
        .filter((file) => file.endsWith(".json"))
        .sort((a, b) => a.localeCompare(b));
}

/**
 * Collect every `where` string and every path member under a value.
 * @param value - The value.
 * @param at - Its pointer.
 * @param out - Where they go.
 * @param out.wheres - The expressions, by pointer.
 * @param out.paths - The path members, by pointer.
 * @param reading - Whether the value is inside a section that reads paths.
 */
function collect(
    value: unknown,
    at: string,
    out: { wheres: [string, string][]; paths: [string, string][] },
    reading = false,
): void {
    if (Array.isArray(value)) {
        value.forEach((each: unknown, n) => {
            collect(each, `${at}/${String(n)}`, out, reading);
        });
        return;
    }

    if (typeof value !== "object" || value === null) {
        return;
    }

    const object = value as Record<string, unknown>;
    const inside = reading || (typeof object.kind === "string" && READING_KINDS.has(object.kind));
    const isSource = "runId" in object || "template" in object || "plugin" in object;
    for (const [key, each] of Object.entries(object)) {
        const pointer = `${at}/${key}`;
        if (key === "params" || key === "options") {
            continue;
        }

        if (inside && typeof each === "string") {
            if (key === "where") {
                out.wheres.push([pointer, each]);
            } else if (PATH_MEMBERS.has(key) && !(key === "by" && isSource) && !(key === "reads" && each === "id")) {
                out.paths.push([pointer, each]);
            }
        }

        collect(each, pointer, out, inside);
    }
}

describe("the worked examples", () => {
    for (const file of exampleFiles()) {
        it(`${file}: every where parses and every path member is a raw path`, () => {
            const out = { wheres: [] as [string, string][], paths: [] as [string, string][] };
            collect(JSON.parse(readFileSync(new URL(`examples/${file}`, SPEC), "utf8")), "", out);
            for (const [pointer, where] of out.wheres) {
                assert.isAbove(expressionPaths(where).length, 0, `${pointer}: ${where}`);
            }

            for (const [pointer, path] of out.paths) {
                assert.match(path, PATH, pointer);
                assert.notStrictEqual(path, "graphty.types", pointer);
            }
        });
    }
});
