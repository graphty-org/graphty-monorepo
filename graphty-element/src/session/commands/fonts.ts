/**
 * @file The font op: `font.set`, which puts an uploaded font into the project's `fonts` slice or
 * takes it out. One undoable step; `session.fonts` dispatches it after it has read the bytes, and
 * the slice's hook puts the face on the page (`../fonts.ts`).
 *
 * This op only refuses what is not shaped like a font entry, so a command replayed from a journal
 * cannot put anything else into the slice.
 */

import type { StyleDocumentFont } from "../../catalog/types";
import type { UndoableDefinition } from "../project/Dispatcher";
import { checkFontEntry } from "../styles/carried";

/** `font.set`: one font in the project, or null to take it out. */
export interface FontCommand {
    /** The op name. */
    readonly op: "font.set";
    /** The family the font is held under. */
    readonly family: string;
    /** The font, its family the same as `family`; null to remove it. */
    readonly font: StyleDocumentFont | null;
}

const fontSet: UndoableDefinition<FontCommand> = {
    op: "font.set",
    undo: {
        kind: "undoable",
        label: (command) => `${command.font === null ? "Remove" : "Add"} the font ${command.family}`,
        fact: (command) => ({
            code: command.font === null ? "font.remove" : "font.add",
            params: { family: command.family },
        }),
    },
    // A font repaints nothing by itself: the slice's hook redraws the labels drawn in its family.
    moves: false,
    keys: (command) => [`fonts/${command.family}`],
    lane: { kind: "immediate" },
    execute: (command, ctx) => {
        const { family, font } = command;
        if (font === null) {
            ctx.draft.fonts.delete(family);
            return;
        }

        checkFontEntry(font, family);
        ctx.draft.fonts.set(family, Object.freeze({ ...font }));
    },
};

export const FONT_DEFINITIONS = [fontSet] as const;
