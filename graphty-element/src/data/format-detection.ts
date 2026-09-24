/**
 * @file The two-argument detection call `Graph` has always made, over the published detector.
 *
 * WHAT THIS USED TO BE. A module-private extension table and a hard-coded if-chain over the seven
 * formats the element ships. A registered format was invisible to both, so a file of that format
 * dropped on the element found nothing and reported that the element supports "JSON, GraphML,
 * GEXF, CSV, GML, DOT, Pajek" -- a list with the consumer's own format missing from it. Being
 * private also meant a consumer who wanted to label a drop target had to reimplement the table,
 * which `@graphty/graphty` did, in two files.
 *
 * WHAT IT IS NOW. The decision lives in `src/catalog/detect.ts`, is driven by the composed
 * descriptor list and the registry's sniffers, and is published from `./catalog` and `./extend`.
 * This module is the adapter that keeps the call shape `Graph.loadFromFile` and
 * `Graph.loadFromUrl` already make -- a file name and a content sample as two positional strings,
 * either of which may be empty -- so that both of them detect registered formats without either
 * of them changing. It exists to be deleted once those two call sites take the published
 * `detectFormat({ filename, sample })` directly.
 */

import { detectFormat as detectFromInput } from "../catalog/detect";
import type { FormatId } from "../catalog/types";

/**
 * Work out which format a file is, from its name, its first bytes, or both.
 * @param filename - The file name, or "" when there is none.
 * @param content - The first bytes of the file as text, or "" when they have not been read.
 * @returns The format's name, or null when neither the element nor any registered format
 * recognises the file.
 */
export function detectFormat(filename: string, content: string): FormatId | null {
    return detectFromInput({ filename, sample: content });
}
