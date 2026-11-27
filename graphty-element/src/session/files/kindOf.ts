/**
 * @file What a file is, read from its contents and never its name: a project, a recipe, a style
 * file, another graphty document, or graph data. `session.files.kindOf`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ProjectSource } from "../projectFile";

/**
 * What a file is, by its contents: `"project"` (a saved project: `project.open` replaces the
 * session with it), `"recipe"` (analysis steps for `recipes.apply`), `"style"` (style layers),
 * `"document"` (another graphty document, such as notes) or `"graph"` (anything else: graph
 * data for `data.prepare`). A file holding a recipe and its style is a recipe.
 * @since 3.40.0
 * @beta
 */
export type FileKind = "project" | "recipe" | "style" | "document" | "graph";

/** Reading files: `session.files`. */
export interface FilesApi {
    /**
     * What a file is, read from its contents, never its name or extension.
     *
     * ```ts
     * const kind = await session.files.kindOf(file);
     * if (kind === "recipe") await session.recipes.apply(file);
     * ```
     * @param source - The file, its bytes or its text.
     * @returns Its kind; `"graph"` for anything that is not a graphty document.
     * @since 3.40.0
     * @beta
     */
    kindOf(source: ProjectSource): Promise<FileKind>;
}

/**
 * Whether a value is a JSON object (not null, not an array). Kept here, not imported from
 * document2/framing, which would pull the whole version 2 save code into the main entry.
 * @param value - The value.
 * @returns Whether it is a JSON object.
 */
function isJsonObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The bytes read first: a graphty document is JSON, so it starts with `{`. */
const HEAD_BYTES = 1024;

/**
 * The file's text, or null when it cannot be a graphty document (it does not start with `{`).
 * @param source - The file, its bytes or its text.
 * @returns The text, or null.
 */
async function jsonTextOf(source: ProjectSource): Promise<string | null> {
    let head: string;
    if (typeof source === "string") {
        head = source.slice(0, HEAD_BYTES);
    } else if (source instanceof Uint8Array) {
        head = new TextDecoder().decode(source.subarray(0, HEAD_BYTES));
    } else {
        head = await source.slice(0, HEAD_BYTES).text();
    }

    if (!head.trimStart().startsWith("{")) {
        // A data file is never read whole only to say it is data.
        return null;
    }

    if (typeof source === "string") {
        return source;
    }

    return source instanceof Uint8Array ? new TextDecoder().decode(source) : source.text();
}

/**
 * The member or section kinds a parsed graphty document holds, as `graphty-<name>`.
 * @param value - The parsed file.
 * @returns The kinds; empty for JSON that is not a graphty document.
 */
function kindsIn(value: Record<string, unknown>): Set<string> {
    if (value.kind === "graphty-document") {
        const sections = isJsonObject(value.sections) ? Object.keys(value.sections) : [];
        const members = Array.isArray(value.members) ? (value.members as unknown[]) : [];
        return new Set([
            "graphty-document",
            ...sections.map((name) => `graphty-${name}`),
            ...members.flatMap((member) =>
                isJsonObject(member) && typeof member.kind === "string" ? [member.kind] : [],
            ),
        ]);
    }

    if (value.kind === undefined && Number.isInteger(value.version) && Array.isArray(value.layers)) {
        // A style file graphty-element 2.x wrote, with no kind.
        return new Set(["graphty-style"]);
    }

    return typeof value.kind === "string" && value.kind.startsWith("graphty-") ? new Set([value.kind]) : new Set();
}

/**
 * What a file is, by its contents.
 * @param source - The file, its bytes or its text.
 * @returns Its kind.
 */
async function kindOf(source: ProjectSource): Promise<FileKind> {
    const text = await jsonTextOf(source);
    let value: unknown;
    try {
        value = text === null ? undefined : JSON.parse(text);
    } catch {
        return "graph";
    }

    if (!isJsonObject(value)) {
        return "graph";
    }

    const kinds = kindsIn(value);
    // A version 1 project holds a session member; a version 2 one, a data section. The version 2
    // save code loads on demand, only for a file that could be one.
    if (kinds.has("graphty-session")) {
        return "project";
    }

    if (kinds.has("graphty-data") && (await import("../document2/onDemand")).isVersion2(value)) {
        return "project";
    }

    if (kinds.has("graphty-recipe")) {
        return "recipe";
    }

    if (kinds.has("graphty-style")) {
        return "style";
    }

    return kinds.size > 0 ? "document" : "graph";
}

/** The session's files API. */
export const FILES_API: FilesApi = Object.freeze({ kindOf });
