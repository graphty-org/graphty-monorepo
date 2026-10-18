/**
 * A digest of what every conformance fixture imports to and exports as when no styles are asked for: the snapshot's
 * content hash, its meta, the report (without its duration), and the check notes and bytes of an export in the same
 * format. The committed baseline was taken from the code before styles were added; the plumbing test compares the
 * current code with it, so adding styles changes nothing for a caller who does not ask for them.
 *
 * It takes the registry functions as arguments, so the same digest runs against any copy of the sources.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

import type { GraphSnapshot } from "@graphty/graph-format";

/** The registry functions the digest calls. */
interface DigestRegistry {
    importGraph(
        input: Uint8Array,
        options: Record<string, unknown>,
    ): Promise<{ snapshot: GraphSnapshot; report: object }>;
    checkExport(snapshot: GraphSnapshot, format: string, options?: Record<string, unknown>): readonly object[];
    exportGraphToBytes(snapshot: GraphSnapshot, format: string, options?: Record<string, unknown>): Promise<Uint8Array>;
    hasExporter(format: string): boolean;
}

/** One fixture of a manifest, as much as the digest reads. */
interface FixtureEntry {
    readonly file: string;
    readonly options?: Readonly<Record<string, unknown>>;
}

/**
 * The first 64 bits of a SHA-256 of text or bytes, as hex.
 * @param data - the input
 * @returns the hash
 */
function sha(data: string | Uint8Array): string {
    return createHash("sha256").update(data).digest("hex").slice(0, 16);
}

/**
 * The code of a thrown value.
 * @param err - the thrown value
 * @returns its issue code, error code or name
 */
function codeOf(err: unknown): string {
    const e = err as { issue?: { code?: string } | null; code?: string; name?: string };
    return e.issue?.code ?? e.code ?? e.name ?? "unknown";
}

/**
 * JSON text with bigints as text.
 * @param v - the value
 * @returns the text
 */
function json(v: unknown): string {
    return JSON.stringify(v, (_k, x: unknown) => (typeof x === "bigint" ? `${x.toString()}n` : x));
}

/**
 * The digest of one format's fixtures.
 * @param registry - the registry functions
 * @param fixturesRoot - the conformance fixtures directory
 * @param format - the format
 * @returns per fixture file, one line of hashes
 */
export async function digestFormat(
    registry: DigestRegistry,
    fixturesRoot: string,
    format: string,
): Promise<Record<string, string>> {
    const manifest = JSON.parse(readFileSync(join(fixturesRoot, format, "manifest.json"), "utf-8")) as {
        fixtures: FixtureEntry[];
    };
    const out: Record<string, string> = {};
    for (const fixture of manifest.fixtures) {
        const bytes = new Uint8Array(readFileSync(join(fixturesRoot, format, fixture.file)));
        let line: string;
        try {
            const { snapshot, report } = await registry.importGraph(bytes, {
                format,
                filename: basename(fixture.file),
                ...fixture.options,
            });
            const { durationMs: _d, ...rest } = report as { durationMs: number };
            line = `import ${sha(json([snapshot.contentHash(), snapshot.meta, rest]))}`;
            if (registry.hasExporter(format)) {
                const options = format === "cys" ? { sanitizeIds: "mangle" } : {};
                const notes = registry.checkExport(snapshot, format, options);
                let written: string;
                try {
                    written = sha(await registry.exportGraphToBytes(snapshot, format, options));
                } catch (err) {
                    written = `throws ${codeOf(err)}`;
                }
                line += ` check ${sha(json(notes))} export ${written}`;
            }
        } catch (err) {
            line = `import throws ${codeOf(err)}`;
        }
        out[fixture.file] = line;
    }
    return out;
}
