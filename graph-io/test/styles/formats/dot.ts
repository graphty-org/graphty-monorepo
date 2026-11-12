/**
 * DOT in the style harness: the committed DOT corpus read with Graphviz's rules and Graphviz's defaults, and the
 * round trip through the DOT writer, which writes Graphviz attributes and carries the `graphty.styles` block as the
 * quoted graph attribute `"graphty.styles"`.
 */

import { join } from "node:path";

import { fileInput, readCorpusFile, registerStyleFormat, STYLE_CORPUS, type StyleFormat } from "../harness.js";

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/**
 * A written file with one node's `fillcolor` changed, as another program would edit it.
 * @param written - the file graphty wrote
 * @returns the edited file, or null when no node has a fill
 */
export function editDotNodeFill(written: Uint8Array): Uint8Array | null {
    const text = decode(written);
    // a node statement's fill only: a `graph [...]` line's fillcolor is the root's or a cluster's (issue #3099), and
    // `node [...]` is the defaults; the color's six digits only, so an alpha after them stays
    const match =
        /^[ \t]*(?!(?:graph|node|edge)\b)(?:"(?:[^"\\\n]|\\.)*"|[\w.]+)[ \t]*\[[^\n]*?\bfillcolor="(#[0-9A-Fa-f]{6})/m.exec(
            text,
        );
    if (match === null) {
        return null;
    }
    const at = match.index + match[0].length - match[1].length;
    const next = match[1].toLowerCase() === "#123456" ? "#654321" : "#123456";
    return encode(text.slice(0, at) + next + text.slice(at + match[1].length));
}

/**
 * A written file with its `graphty.styles` block replaced. The new block is written the way the writer writes one:
 * quotes and backslashes inside its strings as `\u` escapes, so the DOT text stays readable whatever the block holds.
 * @param written - the file graphty wrote
 * @param change - the new block from the old one
 * @returns the changed file
 */
export function replaceDotBlock(written: Uint8Array, change: (block: string) => string): Uint8Array {
    return encode(
        decode(written).replace(/"graphty\.styles"="((?:[^"\\]|\\.)*)"/, (_m, body: string) => {
            let block = change(body.replaceAll('\\"', '"')).replace(/\\(["\\])/g, (_e, c: string) =>
                c === '"' ? "\\u0022" : "\\u005c",
            );
            if (block.endsWith("\\")) {
                block += " ";
            }
            return `"graphty.styles"="${block.replaceAll('"', '\\"')}"`;
        }),
    );
}

/** The large generated file, and the name of its cut in failures and RESULTS.md. */
export const RANDOM_10000 = "dot/generated/random-10000.gv.gz";
export const RANDOM_10000_CUT = `${RANDOM_10000} (cut)`;

/**
 * A small piece of random-10000 with the kinds of rules the whole file has: its first edges, every self-loop and
 * parallel edge (which Graphviz draws bent, so only they give the edges' `bends`), and the nodes they join. It runs
 * the round trip checks that do not grow with the graph, which the whole file leaves to it (SCALE_POINTS).
 * @param format - the DOT format
 * @returns the cut, as an input
 */
function random10000Cut(format: StyleFormat): StyleFormat["inputs"] {
    return () => {
        const { bytes } = readCorpusFile(join(STYLE_CORPUS, RANDOM_10000));
        const lines = decode(bytes).split("\n");
        const ends = (line: string): readonly string[] | null => /^(\S+) -- (\S+) /.exec(line)?.slice(1, 3) ?? null;
        const pairOf = (e: readonly string[]): string => [...e].sort().join(" ");
        const copies = new Map<string, number>();
        for (const e of lines.map(ends)) {
            if (e !== null) {
                copies.set(pairOf(e), (copies.get(pairOf(e)) ?? 0) + 1);
            }
        }
        let edges = 0;
        const joined = new Set<string>();
        const kept = lines.filter((line) => {
            const e = ends(line);
            const keep = e === null || edges++ < 150 || e[0] === e[1] || (copies.get(pairOf(e)) ?? 0) > 1;
            if (keep && e !== null) {
                joined.add(e[0]).add(e[1]);
            }
            return keep;
        });
        // the node statements of the nodes the kept edges join; the graph's own lines stay
        const cut = kept.filter(
            (line) => ends(line) !== null || !/^n\d+ \[/.test(line) || joined.has(line.split(" ")[0]),
        );
        return [fileInput(format, RANDOM_10000_CUT, encode(cut.join("\n")), "random-10000-cut.gv")];
    };
}

const dot: StyleFormat = {
    name: "dot",
    mutantsPerFile: 1,
    writer: {
        format: "dot",
        // DOT holds one direction per file: a graph mixing both is written directed, as the error asks
        options: { onMixedDirection: "directed" },
        editNative: editDotNodeFill,
        replaceBlock: replaceDotBlock,
    },
};
registerStyleFormat({ ...dot, inputs: random10000Cut(dot) });
