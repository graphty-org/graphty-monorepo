/**
 * Writers spell each program's own names from graphty's generic ones. A consumer such as graphty-element exports
 * styles in graphty's neutral vocabulary (an end cap and a row of parts, half-barb, inverted-vee, element shape names)
 * with nothing that says which program they came from; the file written from them must name the same arrows and
 * shapes as the file written straight from what graph-io read.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { type ExtractedStyles, SETTLED_EXT, type StyleRule } from "../../src/styles/internal.js";

const registry = createRegistry();
const SPECIMENS = resolve(import.meta.dirname, "specimens");

/**
 * The styles as a consumer hands them back: settled values with no record of what settling changed.
 * @param styles - the settled styles
 * @returns the styles, every settling mark taken off
 */
function asConsumerGives(styles: ExtractedStyles): ExtractedStyles {
    const rules = styles.styles.rules.map((rule): StyleRule => {
        const { [SETTLED_EXT]: _mark, ...ext } = rule.ext ?? {};
        return { ...rule, ext };
    });
    return { ...styles, styles: { ...styles.styles, rules } };
}

const CASES: readonly { file: string; format: string; names: RegExp; expect: readonly string[] }[] = [
    {
        file: "yed-graphml/specimen-arrows.graphml",
        format: "graphml",
        names: /<y:Arrows source="([^"]*)" target="([^"]*)"/g,
        expect: ["crows_foot_one_optional", "white_delta_bar", "skewed_dash"],
    },
    {
        file: "gml/specimen-arrows-p2.gml",
        format: "gml",
        names: /^\s*(?:source|target)Arrow\s+"?([\w-]+)"?\s*$/gm,
        expect: ["crows_foot_many_mandatory"],
    },
    {
        file: "dot/specimen-arrows.gv",
        format: "dot",
        names: /arrow(?:head|tail)="?([a-z]+)/g,
        expect: ["boxdotnormal", "lteeoldiamond", "dotodotdotodot"],
    },
    {
        file: "cx/specimen-arrows.cx",
        format: "cx",
        names: /[=,]K=\d+=([^,]+),V=\d+=([A-Z_]+)/g,
        expect: ["HALF_TOP", "HALF_BOTTOM"],
    },
    {
        file: "vis-network/specimen-arrows.json",
        format: "json",
        names: /"type":\s*"([a-z_]+)"/g,
        expect: ["crow"],
    },
    {
        file: "cytoscapejs/specimen-node-shapes.json",
        format: "json",
        names: /"shape":\s*"([a-z-]+)"/g,
        expect: ["round-triangle", "barrel"],
    },
    {
        file: "dot/specimen-node-shapes.gv",
        format: "dot",
        names: /shape="?([a-z]+)/g,
        expect: ["cylinder"],
    },
];

/**
 * Every name a pattern finds in a text, in order.
 * @param text - the text
 * @param pattern - the pattern, global, its groups the names
 * @returns the names
 */
function namesIn(text: string, pattern: RegExp): string[] {
    return [...text.matchAll(pattern)].flatMap((m) => m.slice(1));
}

describe("writers spell the program's names from graphty's generic ones", () => {
    it.each(CASES)("$file", async ({ file, format, names, expect: wanted }) => {
        const bytes = new Uint8Array(readFileSync(resolve(SPECIMENS, file)));
        const read = await registry.importGraph(bytes, { format, styles: true, errorLimit: Infinity });
        const { styles } = read;
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        const direct = await registry.exportGraphToString(read.snapshot, format, { styles });
        const generic = await registry.exportGraphToString(read.snapshot, format, { styles: asConsumerGives(styles) });
        const want = namesIn(direct, names);
        for (const name of wanted) {
            expect(want).toContain(name);
        }
        expect(namesIn(generic, names)).toEqual(want);
    });
});
