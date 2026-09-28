/**
 * @file What the extending guides' tests share: how a guide shows an example, how its author lines
 * are counted against the adoption budget (about 15 author lines, never more than 20, counted end
 * to end), and the terms a first plugin must never need.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const DOCS = join(__dirname, "..", "..", "docs");

/**
 * Terms a first plugin must not need, matched as whole words: the element's internals.
 */
export const INTERNAL_TERMS = [
    "snapshot",
    "row",
    "rows",
    "rowPtr",
    "colIdx",
    "CSR",
    "arc",
    "arcs",
    "Float32Array",
    "Int32Array",
    "Uint32Array",
    "mask",
    "NodeMask",
    "EdgeMask",
    "yieldNow",
    "forEachChunked",
    "chunk",
    "costClass",
    "costUnits",
    "complexity",
    "plainName",
    "technicalName",
    "namespace",
    "descriptor",
    "fields",
    "caveats",
    "declaredCaveats",
    "GraphtyError",
    "idOf",
    "edgeId",
    "DeclaredAlgorithm",
];

/**
 * Every TypeScript block of a Markdown text, in order.
 * @param markdown - The text.
 * @returns The blocks' contents.
 */
export function tsBlocks(markdown: string): string[] {
    return [...markdown.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1].trim());
}

/**
 * Author lines: not blank, not a comment, not an import.
 * @param code - The code.
 * @returns How many.
 */
export function authorLines(code: string): number {
    return code.split("\n").filter((line) => {
        const trimmed = line.trim();
        return trimmed !== "" && !trimmed.startsWith("//") && !trimmed.startsWith("import ");
    }).length;
}

/**
 * The internal terms a piece of code names.
 * @param code - The code.
 * @param allowed - Terms that mean something else here (a layout's rows of nodes).
 * @returns The terms found.
 */
export function internalTermsIn(code: string, allowed: readonly string[] = []): string[] {
    return INTERNAL_TERMS.filter((term) => !allowed.includes(term) && new RegExp(`\\b${term}\\b`, "i").test(code));
}

/**
 * An example as a guide shows it: a `#region` of a file under docs/examples, or the whole file,
 * dedented and trimmed.
 * @param file - The file, relative to docs/examples.
 * @param region - The region, or undefined for the whole file.
 * @returns The code.
 */
export function exampleText(file: string, region?: string): string {
    const text = readFileSync(join(DOCS, "examples", file), "utf8");
    if (region === undefined) {
        return text.trim();
    }

    const match = new RegExp(`// #region ${region}\\n([\\s\\S]*?)\\n\\s*// #endregion ${region}`).exec(text);
    if (match === null) {
        throw new Error(`${file} has no region "${region}"`);
    }

    const lines = match[1].split("\n");
    const indent = Math.min(...lines.filter((line) => line.trim() !== "").map((line) => /^ */.exec(line)?.[0].length ?? 0));
    return lines
        .map((line) => line.slice(indent))
        .join("\n")
        .trim();
}
