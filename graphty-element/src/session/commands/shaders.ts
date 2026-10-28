/**
 * @file The shader op: `shader.set`, which puts a shader's text into the project's `shaders`
 * slice, replaces it, or takes it out. Each is one undoable step; `session.shaders.add` with
 * `apply` joins it with the layer write in one transaction (design/rendering/shader-styles.md
 * section 3.5).
 *
 * The text is checked by `session.shaders` before it is dispatched; this op only refuses what is
 * not shaped like an entry, so a command replayed from a journal cannot put a non-string into the
 * slice.
 */

import { isShaderId } from "../../catalog/shaders";
import { GraphtyError } from "../../errors/GraphtyError";
import type { UndoableDefinition } from "../project/Dispatcher";

/** `shader.set`: one shader's text in the project, or null to take it out. */
export interface ShaderSetCommand {
    readonly op: "shader.set";
    /** The shader's namespaced id. */
    readonly id: string;
    /** Its text, or null to remove it. */
    readonly text: string | null;
}

/** Every shader op. */
export type ShaderCommand = ShaderSetCommand;

/**
 * What one `shader.set` did, by what the project held before it.
 * @param command - The command.
 * @param had - Whether the project held the id before.
 * @returns `shader.add`, `shader.replace` or `shader.remove`.
 */
function codeOf(command: ShaderSetCommand, had: boolean): "shader.add" | "shader.replace" | "shader.remove" {
    if (command.text === null) {
        return "shader.remove";
    }

    return had ? "shader.replace" : "shader.add";
}

const shaderSet: UndoableDefinition<ShaderSetCommand> = {
    op: "shader.set",
    undo: {
        kind: "undoable",
        label: (command, state) => {
            const code = codeOf(command, state.shaders.has(command.id));
            const verbs = { "shader.add": "Add", "shader.replace": "Replace", "shader.remove": "Remove" } as const;
            return `${verbs[code]} the shader ${command.id}`;
        },
        fact: (command, state) => {
            const code = codeOf(command, state.shaders.has(command.id));
            const params: Record<string, string | null> = { id: command.id };
            if (code === "shader.add") {
                params.layer = null;
            }

            return { code, params };
        },
    },
    // A shader's text repaints nothing by itself: the layers naming it read it at draw time.
    moves: false,
    keys: (command) => [`shaders/${command.id}`],
    lane: { kind: "immediate" },
    execute: (command, ctx) => {
        const { id, text } = command;
        if (!isShaderId(id, true) || !(text === null || typeof text === "string")) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: 'A project shader is { id: "<namespace>/<name>", text }, or text null to remove it.',
                source: "style",
                details: { id },
            });
        }

        if (text === null) {
            ctx.draft.shaders.delete(id);
        } else {
            ctx.draft.shaders.set(id, Object.freeze({ text }));
        }
    },
};

export const SHADER_DEFINITIONS = [shaderSet] as const;
