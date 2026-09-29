/**
 * @file The style ops: `style.patch`, `style.encode` and `style.template`. Every edit to the
 * style stack is one of them, and each is one undoable step.
 *
 * All three run on the immediate lane: the new stack is written when the command is dispatched,
 * so `styles.list()` shows it as soon as the verb returns, and the repaint follows on the
 * derivation lane. The stack is one frozen array of compiled layers (the `styles` slice), so a
 * step keeps the stack before and after by reference, and undo puts the identical, already
 * compiled layers back. See design/undo/undo-design.md sections 3.4, 5.2 and 11.3.
 *
 * What an edit does to the stack is worked out by the session's style compiler (the
 * {@link StyleService} its styles API registers), because compiling a layer needs the session's
 * columns and scales. This module says how each op behaves under undo.
 */

import type { Channel, LayerId, LayerSpec, RunId, StyleDocument } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { UndoableDefinition } from "../project/Dispatcher";
import type { Draft } from "../project/draft";
import type { ProjectState } from "../project/state";
import type { EncodingSpec } from "../styles/EncodingSpec";
import type { ExplainTarget } from "../styles/explain";
import type { LayerPosition } from "../styles/Layer";
import type { HighlightSpec } from "../styles/StylesApi";

/** The values of `style.patch`'s discriminant: one per styles verb that reaches it. */
const STYLE_PATCH_ACTIONS = Object.freeze([
    "add",
    "update",
    "remove",
    "move",
    "removeBySource",
    "highlight",
    "resolveToStatic",
] as const);

/** `style.patch`: one change to the stack, said the way the styles verb that made it says it. */
export type StylePatchCommand =
    | {
          readonly op: "style.patch";
          readonly action: "add";
          readonly spec: LayerSpec;
          /** Which neighbour to sit next to; the top of the stack when absent. */
          readonly at?: LayerPosition;
      }
    | {
          readonly op: "style.patch";
          readonly action: "update";
          readonly id: LayerId;
          /** Applied over the layer's specification one key deep; `undefined` clears a key. */
          readonly patch: Partial<LayerSpec>;
      }
    | { readonly op: "style.patch"; readonly action: "remove"; readonly id: LayerId }
    | {
          readonly op: "style.patch";
          readonly action: "move";
          readonly id: LayerId;
          /** The layer to sit immediately below, or null for the top of the stack. */
          readonly before: LayerId | null;
      }
    | {
          readonly op: "style.patch";
          readonly action: "removeBySource";
          /** The layers the sweep matched when it was dispatched. */
          readonly ids: readonly LayerId[];
      }
    | {
          readonly op: "style.patch";
          readonly action: "highlight";
          readonly spec: Omit<HighlightSpec, "run"> & { readonly run: RunId };
      }
    | {
          readonly op: "style.patch";
          readonly action: "resolveToStatic";
          readonly id: LayerId;
          readonly channel: Channel;
          readonly at?: ExplainTarget;
      };

/** `style.encode`: paint a run's measurement onto a channel. */
export interface StyleEncodeCommand {
    readonly op: "style.encode";
    readonly spec: Omit<EncodingSpec, "run"> & { readonly run: RunId };
}

/** `style.template`: add the layers of a style document. */
interface StyleTemplateCommand {
    readonly op: "style.template";
    readonly document: StyleDocument;
    /** Recorded as the template on every layer that names no source of its own. */
    readonly templateId?: string;
}

/** Every style op. */
export type StyleCommand = StylePatchCommand | StyleEncodeCommand | StyleTemplateCommand;

/** The session's style compiler, as the style ops reach it. */
export interface StyleService {
    /**
     * Work out the stack a command produces and write it through the draft. Throws a
     * `GraphtyError` to refuse, before anything is written.
     * @param command - The command.
     * @param draft - The draft of the command's step.
     * @returns What the verb resolves with.
     */
    execute(command: StyleCommand, draft: Draft): unknown;
}

/** What a style op's step is keyed on: the stack, one frozen value. */
const STYLES_KEY = ["styles"] as const;

/**
 * The name of a layer in the stack, for a label.
 * @param state - The state.
 * @param id - The layer.
 * @returns Its name in quotes, or its id when the stack does not hold it.
 */
function nameOf(state: ProjectState, id: LayerId): string {
    return `"${state.styles.find((entry) => entry.layer.id === id)?.layer.name ?? id}"`;
}

/**
 * The label of a `style.patch` step.
 * @param command - The command.
 * @param state - The state before it runs.
 * @returns The label.
 */
function patchLabel(command: StylePatchCommand, state: ProjectState): string {
    switch (command.action) {
        case "add":
            return `Added layer "${command.spec.name}"`;
        case "update":
            return `Changed layer ${nameOf(state, command.id)}`;
        case "remove":
            return `Removed layer ${nameOf(state, command.id)}`;
        case "move":
            return `Moved layer ${nameOf(state, command.id)}`;
        case "removeBySource":
            return command.ids.length === 1 ? "Removed 1 layer" : `Removed ${String(command.ids.length)} layers`;
        case "highlight":
            return `Highlighted ${command.spec.run}`;
        case "resolveToStatic":
            return `Fixed ${command.channel} on layer ${nameOf(state, command.id)}`;
        default:
            return "Changed the style layers";
    }
}

/**
 * The session's style compiler, or the refusal of a dispatcher that has none.
 * @param service - The registered service.
 * @returns It.
 */
function required(service: StyleService | undefined): StyleService {
    if (service === undefined) {
        throw new GraphtyError({
            code: "E_INTERNAL",
            message: "This dispatcher has no styles API registered, so it cannot run a style op.",
            source: "history",
        });
    }

    return service;
}

/** Shared by the three ops. */
const COMMON = {
    moves: false,
    draws: true,
    keys: () => STYLES_KEY,
    lane: { kind: "immediate" },
    byReference: ["userData"],
} as const;

const stylePatch: UndoableDefinition<StylePatchCommand> = {
    ...COMMON,
    op: "style.patch",
    variants: STYLE_PATCH_ACTIONS,
    undo: {
        kind: "undoable",
        label: patchLabel,
        // A drag of a colour picker is one step: updates of the same keys of one layer merge.
        coalesce: (command) =>
            command.action === "update" ? `style:${command.id}:${Object.keys(command.patch).sort().join(",")}` : null,
    },
    execute: (command, ctx) => required(ctx.services.styles).execute(command, ctx.draft),
};

const styleEncode: UndoableDefinition<StyleEncodeCommand> = {
    ...COMMON,
    op: "style.encode",
    undo: { kind: "undoable", label: (command) => `Encoded ${command.spec.channel} from ${command.spec.run}` },
    execute: (command, ctx) => required(ctx.services.styles).execute(command, ctx.draft),
};

const styleTemplate: UndoableDefinition<StyleTemplateCommand> = {
    ...COMMON,
    op: "style.template",
    undo: { kind: "undoable", label: () => "Applied a style document" },
    execute: (command, ctx) => required(ctx.services.styles).execute(command, ctx.draft),
};

/** The style ops' definitions. */
export const STYLE_DEFINITIONS = [stylePatch, styleEncode, styleTemplate] as const;
