/**
 * @file Which graphs a file holds, before loading one.
 *
 * Some files hold several graphs -- a Cytoscape session holds every network of a project. A host
 * that wants to offer a choice asks `listGraphs(source)` first, shows the list, and loads the
 * chosen one with the `graphIndex` or `graphName` option. Loading without a choice reads the
 * first graph.
 *
 * The question goes to the format's own importer: the graph-io importer behind a built-in
 * format, or the `static listGraphs` a registered reader declares (`DataSource.fromImporter`
 * sets it from its importer), so a third party's format answers it the same way a built-in does.
 */

import type { GraphListing } from "@graphty/graph-io";

import { readSource, sampleOf, urlTail } from "../data/source-bytes";
import { GraphtyError } from "../errors";
import type { DataSourceInput } from "../session/types";
import { builtInImporter, detectFormat, undetectedFormat, unknownFormat } from "./detect";
import { type GraphLister, registeredFormatById } from "./formatRegistry";
import { FORMAT_DESCRIPTORS } from "./formats";

/**
 * The name detection reads an extension from: the one given, else the file's, else the URL's.
 * @param source - The source.
 * @returns The name, or undefined when there is none.
 */
function nameOf(source: DataSourceInput): string | undefined {
    const { file, url } = source.config;
    const fileName = typeof file === "object" && file !== null ? (file as { name?: unknown }).name : undefined;
    if (source.name !== undefined) {
        return source.name;
    }

    if (typeof fileName === "string") {
        return fileName;
    }

    return typeof url === "string" ? urlTail(url) : undefined;
}

/**
 * The lister for a format, or undefined when its files hold one graph.
 * @param type - The format id.
 * @returns The lister.
 * @throws A `GraphtyError` with `E_UNKNOWN_FORMAT` when nothing answers to the id.
 */
function listerFor(type: string): GraphLister | undefined {
    const importer = builtInImporter(type);
    if (importer !== undefined) {
        return importer.listGraphs?.bind(importer);
    }

    const registered = registeredFormatById(type);
    if (registered === undefined && !FORMAT_DESCRIPTORS.some((descriptor) => descriptor.id === type)) {
        throw unknownFormat(type);
    }

    return registered?.listGraphs;
}

/**
 * List the graphs a file holds, so a host can offer a choice before loading one.
 *
 * ```js
 * import { listGraphs } from "@graphty/graphty-element/catalog";
 *
 * const graphs = await listGraphs({ config: { file } });
 * // [{ index: 0, name: "Network 1", nodes: 120, edges: 340 }, ...], or null
 * await element.loadFromFile(file, { graphIndex: 1 });
 * ```
 * @param source - The source, as `session.data.import` takes it: an optional format `type`, and
 *     a `config` holding inline `data` (text, a `Uint8Array` or an `ArrayBuffer`), a `file` or a
 *     `url`. The format is detected, as a load detects it, when `type` is absent.
 * @returns The graphs in file order, or null for a format whose file holds one graph.
 * @throws A `GraphtyError`: `E_BAD_COMMAND` when the config has no data, file or url;
 *     `E_UNKNOWN_FORMAT` when the format is not recognised or not registered; `E_FETCH_FAILED`
 *     when the URL cannot be read; `E_PARSE_FAILED` when the file cannot be read.
 */
export async function listGraphs(source: DataSourceInput): Promise<readonly GraphListing[] | null> {
    const input = await readSource(source.config);
    if (input === null) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "listGraphs needs a source: inline `data`, a `file` or a `url` in its config",
            source: "data",
        });
    }

    const name = nameOf(source);
    const type =
        source.type ?? detectFormat({ ...(name === undefined ? {} : { filename: name }), sample: sampleOf(input) });
    if (type === null) {
        throw undetectedFormat(name ?? "the data", 'listGraphs({ type: "graphml", config })');
    }

    const lister = listerFor(type);
    if (lister === undefined) {
        return null;
    }

    try {
        return await lister(input);
    } catch (error) {
        throw GraphtyError.wrap(error, {
            code: "E_PARSE_FAILED",
            source: "data",
            message: `Could not list the graphs of ${name ?? "the data"} as ${type}: ${error instanceof Error ? error.message : String(error)}`,
            details: { format: type },
        });
    }
}
