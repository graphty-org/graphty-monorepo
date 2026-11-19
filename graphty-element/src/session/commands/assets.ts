/**
 * @file The asset op: `asset.defaults`, which changes a model's own settings (the project's
 * `modelDefaults` slice): the `node.model*` values a node drawing it starts from, and the pictures
 * it is drawn without. One undoable step; `session.assets.setDefaults` dispatches it.
 *
 * The patch is merged into what the project holds when it runs, so a command replayed from a
 * journal does what it did; each value is checked against its channel here, so none can put a
 * value into the slice that its channel would refuse.
 */

import { GraphtyError } from "../../errors/GraphtyError";
import {
    MODEL_DEFAULT_CHANNELS,
    type ModelDefaultChannel,
    type ModelDefaults,
    type ModelDefaultsPatch,
} from "../assets/AssetsApi";
import type { UndoableDefinition } from "../project/Dispatcher";
import { channelDescriptor } from "../styles/channels";
import { checkStaticValue } from "../styles/Layer";

/** `asset.defaults`: change one model's own settings. */
interface AssetDefaultsCommand {
    readonly op: "asset.defaults";
    /** The model's asset id. */
    readonly id: string;
    /** What to set, take out (`undefined` or `null`) or replace (`hiddenTextures`). */
    readonly patch: ModelDefaultsPatch;
}

/** Every asset op. */
export type AssetCommand = AssetDefaultsCommand;

/**
 * Refuse a patch that is not a model's settings.
 * @param id - The model.
 * @param detail - What is wrong.
 * @returns The error.
 */
function badPatch(id: string, detail: string): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `A model's settings take its node.model* values and picture names: ${detail}.`,
        source: "style",
        details: { id, detail },
    });
}

/**
 * The settings a patch leaves a model with.
 * @param id - The model.
 * @param prior - What it held.
 * @param patch - The change.
 * @returns The settings, or null when none is left.
 * @throws GraphtyError `E_BAD_COMMAND` for a channel or a value the patch may not carry.
 */
export function patchedDefaults(
    id: string,
    prior: ModelDefaults | undefined,
    patch: ModelDefaultsPatch,
): ModelDefaults | null {
    const style: Partial<Record<ModelDefaultChannel, unknown>> = { ...prior?.style };
    for (const [name, value] of Object.entries(patch.style ?? {})) {
        const channel = name as ModelDefaultChannel;
        if (!MODEL_DEFAULT_CHANNELS.includes(channel)) {
            throw badPatch(id, `${name} is not a model's setting`);
        }

        if (value === undefined || value === null) {
            Reflect.deleteProperty(style, channel);
            continue;
        }

        const descriptor = channelDescriptor(channel);
        if (descriptor !== undefined && checkStaticValue(descriptor, value, channel) !== null) {
            throw badPatch(id, `${name} does not take ${JSON.stringify(value)}`);
        }

        style[channel] = value;
    }

    const hidden = patch.hiddenTextures ?? prior?.hiddenTextures ?? [];
    if (!Array.isArray(hidden) || !hidden.every((name) => typeof name === "string")) {
        throw badPatch(id, "hiddenTextures is a list of picture names");
    }

    if (Object.keys(style).length === 0 && hidden.length === 0) {
        return null;
    }

    return Object.freeze({
        style: Object.freeze(style) as ModelDefaults["style"],
        hiddenTextures: Object.freeze([...new Set(hidden)]),
    });
}

const assetDefaults: UndoableDefinition<AssetDefaultsCommand> = {
    op: "asset.defaults",
    undo: {
        kind: "undoable",
        label: () => "Change a model's settings",
        fact: (command) => ({ code: "asset.defaults", params: { id: command.id } }),
    },
    // The settings repaint the model's nodes through the slice's own hook.
    moves: false,
    keys: (command) => [`modelDefaults/${command.id}`],
    lane: { kind: "immediate" },
    execute: (command, ctx) => {
        const next = patchedDefaults(command.id, ctx.state.modelDefaults.get(command.id), command.patch);
        if (next === null) {
            ctx.draft.modelDefaults.delete(command.id);
        } else {
            ctx.draft.modelDefaults.set(command.id, next);
        }
    },
};

export const ASSET_DEFINITIONS = [assetDefaults] as const;
