/**
 * The checks and helpers a style document is read through: its version, its shader list, the
 * source its layers are filed under and the rows they join.
 */
import { isShaderId } from "../../catalog/shaders";
import type { LayerId, LayerSpec, StyleDocument } from "../../catalog/types";
import { checkCarried } from "./carried";
import { badCommand } from "./styleErrors";

/** The only style document version there is. */
export const DOCUMENT_VERSION = 1;

/**
 * The source a document's layer is filed under.
 *
 * A layer that named its own source keeps it: a layer a run produced goes on saying so, which is
 * what lets it be re-run or swept with the rest of that run's work. A layer that named none is
 * filed under the template it arrived in, so the whole import can be swept away in one call.
 * @param spec - The layer as the document carried it.
 * @param templateId - What the import is called, when the caller named it.
 * @returns The specification to check.
 */
export function stamped(spec: LayerSpec, templateId: string | undefined): LayerSpec {
    if (spec.source !== undefined || templateId === undefined) {
        return spec;
    }

    return { ...spec, source: { by: "template", templateId } };
}

/**
 * The row each layer of a style document joins in this session.
 *
 * A document names a row by the id its node part had in the session that wrote it, and every layer
 * is given a new id on the way in, so the saved key names no layer here: the row would lose its
 * name and its parts. Each row is known again by its node part's new id (the last part's when it
 * has no node part), as `addRow` keys one.
 * @param specs - The document's layers.
 * @param ids - The id each layer is given here, by position.
 * @returns The new row key, by position, for each layer that is part of a row.
 */
export function documentRowKeys(specs: readonly LayerSpec[], ids: readonly LayerId[]): Map<number, LayerId> {
    const keyOf = new Map<string, LayerId>();
    const nodeKeyed = new Set<string>();
    specs.forEach((spec, index) => {
        if (spec.row !== undefined && !nodeKeyed.has(spec.row)) {
            keyOf.set(spec.row, ids[index]);
            if (spec.target === "node") {
                nodeKeyed.add(spec.row);
            }
        }
    });

    const keys = new Map<number, LayerId>();
    specs.forEach((spec, index) => {
        const key = spec.row === undefined ? undefined : keyOf.get(spec.row);
        if (key !== undefined) {
            keys.set(index, key);
        }
    });
    return keys;
}

/** The most pasted shaders one style document carries. */
const DOCUMENT_SHADER_LIMIT = 64;

/**
 * The most shader text one style document carries, in characters: 1 MiB, room for every preset
 * (about 220 KB) and the reader's own.
 */
const DOCUMENT_SHADER_TEXT_LIMIT = 1_048_576;

/**
 * Check a document's shader list: at most 64 entries, each an id and its text, at most 1 MiB of
 * text in all. The text itself is checked when the shader is added to the project.
 * @param shaders - The list, as the document carries it.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`, whose `details.code` is `shader.too-many`,
 *   `shader.too-large` or `shader.id-invalid`.
 */
function checkDocumentShaders(shaders: StyleDocument["shaders"]): void {
    if (shaders === undefined) {
        return;
    }

    if (!Array.isArray(shaders) || shaders.length > DOCUMENT_SHADER_LIMIT) {
        const count = Array.isArray(shaders) ? shaders.length : 0;
        throw badCommand(`A style document carries at most ${String(DOCUMENT_SHADER_LIMIT)} shaders.`, {
            code: "shader.too-many",
            count,
            limit: DOCUMENT_SHADER_LIMIT,
        });
    }

    let bytes = 0;
    for (const entry of shaders as readonly unknown[]) {
        const { id, text } = (entry ?? {}) as { id?: unknown; text?: unknown };
        if (!isShaderId(id) || typeof text !== "string") {
            throw badCommand("Each shader in a style document is { id, text }.", {
                code: "shader.id-invalid",
                id: String(id),
            });
        }

        bytes += text.length;
    }

    if (bytes > DOCUMENT_SHADER_TEXT_LIMIT) {
        throw badCommand("A style document carries at most 1 MiB of shader text.", {
            code: "shader.too-large",
            bytes,
            limit: DOCUMENT_SHADER_TEXT_LIMIT,
        });
    }
}

/**
 * Check a style document is one this element can read at all.
 *
 * A document carries every palette and label look its layers name, built-ins included, and its
 * layers resolve them there before this build's catalog (`carried.ts`), so a carried entry is
 * checked for its shape and never refused for being unknown here.
 * @param document - The document.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` for a version this element does not read, or a
 *   carried palette or label look that is not well formed.
 */
export function checkDocument(document: StyleDocument): void {
    // Read as a number rather than as the literal the type declares: a document is data off a
    // disk or a wire, and the one thing a version field exists for is to carry a value this
    // build has never heard of.
    const { version } = document as { version: number };

    if (version !== DOCUMENT_VERSION) {
        throw badCommand(
            `This element reads style documents of version ${String(DOCUMENT_VERSION)}, and this one says version ${String(version)}.`,
            { version },
        );
    }

    checkDocumentShaders(document.shaders);
    checkCarried(document);
}
