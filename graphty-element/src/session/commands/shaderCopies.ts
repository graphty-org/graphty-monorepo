/**
 * @file Copying catalog shaders into the project where every write commits
 * (design/architecture/self-contained-save-files.md, section 1.3).
 *
 * A layer's use, an encode key and the background name the project's own shaders. A write that
 * names a shader id the project does not hold copies that shader's text in first, in the write's
 * own draft, so the copy and the use are one undoable step and every save carries what it uses.
 * Applying a document copies nothing: a file carries its own shaders.
 */

import { loadShaderSource, projectShaderDescriptor } from "../../catalog/shaderRegistry";
import { GraphtyError } from "../../errors/GraphtyError";
import type { Dispatcher } from "../project/Dispatcher";
import type { Draft } from "../project/draft";
import type { ProjectState } from "../project/state";

/** An encode key that sets a shader parameter: `<target>.shaders.<id>.<param>`. */
const ENCODE_KEY = /^(?:node|edge)\.shaders\.(.+)\.[^.]+$/;

/**
 * The shader ids a command's payload names: uses in `node.shaders` and `edge.shaders` lists
 * (`off: true` too), the id of an encode key or of an encoding's `channel`, and a `shader: { id }`
 * (the background's look).
 * @param value - The payload.
 * @param into - Where the ids go.
 * @param seen - The objects walked already.
 * @returns The ids.
 */
export function shaderIdsIn(value: unknown, into = new Set<string>(), seen = new WeakSet()): Set<string> {
    if (typeof value !== "object" || value === null || seen.has(value)) {
        return into;
    }

    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
        // Data the application hangs on a layer is not a style.
        if (key === "userData") {
            continue;
        }

        if ((key === "node.shaders" || key === "edge.shaders") && Array.isArray(child)) {
            for (const use of child as unknown[]) {
                const id = (use as { shader?: unknown } | null)?.shader;
                if (typeof id === "string") {
                    into.add(id);
                }
            }
        }

        // An encode key, or an encoding's `channel` that names one.
        const encoded =
            ENCODE_KEY.exec(key) ?? (key === "channel" && typeof child === "string" ? ENCODE_KEY.exec(child) : null);
        if (encoded !== null) {
            into.add(encoded[1]);
        }

        const look = key === "shader" ? (child as { id?: unknown } | null)?.id : undefined;
        if (typeof look === "string") {
            into.add(look);
        }

        shaderIdsIn(child, into, seen);
    }

    return into;
}

/**
 * Load the body of every catalog shader a write names that no project holds, so the write's
 * executor can copy its text in (it cannot wait). A body that fails to load refuses the write.
 * @param command - The write, or the members of a batch.
 * @returns The loads to wait for, or undefined when there is nothing to load.
 */
export function loadNamedShaders(command: unknown): Promise<unknown> | undefined {
    const ids = [...shaderIdsIn(command)].filter((id) => projectShaderDescriptor(id) === undefined);
    const loads = ids.flatMap((id) => loadShaderSource(id) ?? []);
    // Nothing to load answers at once: an await here would move the write out of the caller's
    // transaction, so a style write inside one would record its own step.
    return loads.length === 0 ? undefined : Promise.all(loads);
}

/**
 * Copy into the project every shader the ids name that it does not hold, in this draft.
 * @param ids - The ids a write names.
 * @param draft - The write's draft.
 * @param services - The dispatcher's services: the copy source.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when a catalog shader cannot be copied in:
 *   `details.code` `shader.not-loaded` (or the load's problem) when its body has not loaded, since
 *   an executor cannot wait for it; `shader.too-many` when the project would pass its limit;
 *   `shader.not-copyable` when it brings its own WGSL.
 */
export function settleShaderCopies(
    ids: Iterable<string>,
    draft: Draft,
    services: Pick<Dispatcher["services"], "shaderCopy">,
): void {
    if (services.shaderCopy === undefined) {
        return;
    }

    for (const id of ids) {
        const copy = services.shaderCopy(id);
        if (typeof copy === "string") {
            draft.shaders.set(id, Object.freeze({ text: copy }));
        } else if (copy !== undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The shader "${id}" cannot be copied into the project (${copy.code}).`,
                source: "style",
                details: { id, code: copy.code, problem: copy },
            });
        }
    }
}

/**
 * The shader ids the project's layers and settings name now.
 * @param state - The project state.
 * @returns The ids.
 */
export function namedShaders(state: ProjectState): Set<string> {
    return shaderIdsIn(
        state.styles.map((entry) => entry.layer),
        shaderIdsIn(Object.fromEntries(state.config)),
    );
}

/**
 * Remove, in this draft, each unchanged catalog copy whose last use the write took away, so a
 * preset picked and then dropped does not stay in the project. A copy nothing named before the
 * write (one added on purpose) stays.
 * @param before - The ids named before the write ({@link namedShaders}).
 * @param state - The project state, with the write applied.
 * @param draft - The write's draft.
 * @param services - The dispatcher's services: which ids are unchanged copies.
 */
export function dropUnusedShaderCopies(
    before: ReadonlySet<string>,
    state: ProjectState,
    draft: Draft,
    services: Pick<Dispatcher["services"], "shaderIsCopy">,
): void {
    if (services.shaderIsCopy === undefined) {
        return;
    }

    const after = namedShaders(state);
    for (const id of before) {
        if (!after.has(id) && state.shaders.has(id) && services.shaderIsCopy(id)) {
            draft.shaders.delete(id);
        }
    }
}

/**
 * A copy of a layer specification without the shader uses and encode keys whose id fails `keep`,
 * the walk {@link shaderIdsIn} makes. A file that cannot be fully read loses only those uses.
 * @param value - The specification, or any part of it.
 * @param keep - Whether an id may stay.
 * @param dropped - Collects each dropped use: the channel or encode key, and the id.
 * @returns The copy, or `value` itself when nothing was dropped from it.
 */
export function withoutShaderUses<T>(
    value: T,
    keep: (id: string) => boolean,
    dropped: { channel: string; shader: string }[],
): T {
    if (typeof value !== "object" || value === null) {
        return value;
    }

    if (Array.isArray(value)) {
        const items = value.map((item: unknown) => withoutShaderUses(item, keep, dropped));
        return (items.every((item, at) => item === value[at]) ? value : items) as T;
    }

    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
        const encoded = key === "userData" ? null : ENCODE_KEY.exec(key);
        if (encoded !== null && !keep(encoded[1])) {
            dropped.push({ channel: key, shader: encoded[1] });
            changed = true;
            continue;
        }

        let next: unknown = key === "userData" ? child : withoutShaderUses(child, keep, dropped);
        if ((key === "node.shaders" || key === "edge.shaders") && Array.isArray(next)) {
            const uses = (next as unknown[]).filter((use) => {
                const id = (use as { shader?: unknown } | null)?.shader;
                if (typeof id === "string" && !keep(id)) {
                    dropped.push({ channel: key, shader: id });
                    return false;
                }

                return true;
            });
            next = uses.length === (next as unknown[]).length ? next : uses;
        }

        changed ||= next !== child;
        out[key] = next;
    }

    return (changed ? out : value) as T;
}
