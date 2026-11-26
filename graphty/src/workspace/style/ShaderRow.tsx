import { ContextMenu, Popout, PopoutButton } from "@graphty/compact-mantine";
import type { Channel } from "@graphty/graphty-element/schema";
import { ActionIcon, Button, Menu, Tooltip } from "@mantine/core";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { ControlLabel } from "./ControlLabel";
import type { RowContext } from "./PropertyRow";
import type { PasteInit } from "./ShaderEditorDialog";
import { ShaderParams } from "./ShaderParams";
import {
    bindingsOf,
    copyShaderText,
    fixedParams,
    namedCopy,
    paramsOf,
    placeOf,
    removeShader,
    type ShaderEntry,
    shadersChannel,
    takeFocusNext,
    unbindParam,
    writeParam,
} from "./shaderSlots";
import { focusSectionNext } from "./useFocusLine";
import { altArrowMove, useRowDrag } from "./useRowDrag";
import { effectOffWords, failureWords, placeWords, SHADER_MOVE_WORDS, shaderProblemWords } from "./words";

/** The width of a shader row's pop-outs: the settings, as every field's. */
const POPOUT_WIDTH = 240;

/**
 * A shader's still picture, or an empty box when it has none.
 * @param props - Component props
 * @param props.src - the picture's address, or undefined.
 * @returns The picture
 */
function ShaderThumb({ src }: Readonly<{ src: string | undefined }>): React.JSX.Element {
    return src === undefined ? (
        <span className="ws-shader-thumb" aria-hidden />
    ) : (
        <img className="ws-shader-thumb" src={src} alt="" />
    );
}

/** Posts a failed write's notice, given the verb of what failed. */
export type Fail = (verb: string) => (error: unknown) => void;

/** Props for ShaderRow. */
interface ShaderRowProps {
    readonly ctx: RowContext;
    readonly entry: ShaderEntry;
    /** How many rows the list has, for Alt+Down at the end. */
    readonly count: number;
    /** Moves a row from one index to another, one undo step. */
    readonly onMove: (from: number, to: number) => void;
    /** Opens the code dialog with what it starts from (Duplicate and edit). */
    readonly onCode?: (init: PasteInit) => void;
}

/**
 * Duplicate and edit: opens the code dialog on a copy of the row's shader, named apart from it
 * ("Pearl copy"), at the row's place, for every shader the row names. None for an unknown one,
 * or with no dialog to open.
 * @param ctx - the row
 * @param entry - the row's use
 * @param name - the row's name
 * @param onCode - opens the code dialog
 * @param fail - posts a failed write's notice
 * @returns the action, or undefined.
 */
function duplicateAction(
    ctx: RowContext,
    entry: ShaderEntry,
    name: string,
    onCode: ((init: PasteInit) => void) | undefined,
    fail: Fail,
): (() => void) | undefined {
    const { descriptor } = entry;
    if (onCode === undefined || descriptor === undefined) {
        return undefined;
    }
    return (): void => {
        ctx.session.shaders
            .source(entry.use.shader, { duplicate: true, params: fixedParams(entry), derived: "omit" })
            .then((text) => {
                onCode({ text: namedCopy(text, name), duplicateOf: entry.use.shader, place: placeOf(entry) });
            })
            .catch(fail("copied"));
    };
}

/**
 * A row's settings button and its pop-out: the parameters, with a calculated toggle on those
 * that vary, Minimum size when the shader declares it, and the cost line. Nothing for an unknown
 * shader or an entry that is off.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.entry - the row's use
 * @param props.name - the shader's name
 * @param props.fail - posts a failed write's notice
 * @param props.notes - where it draws and why it draws nothing, said in its tooltip
 * @returns The button and its pop-out, or null
 */
function SettingsPopout({
    ctx,
    entry,
    name,
    fail,
    notes,
}: Readonly<{
    ctx: RowContext;
    entry: ShaderEntry;
    name: string;
    fail: Fail;
    notes: readonly string[];
}>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(false);
    const { descriptor } = entry;
    if (descriptor === undefined || entry.use.off === true) {
        return null;
    }
    const copy = (): void => {
        copyShaderText(ctx.session, entry.use.shader, fixedParams(entry))
            .then(() => {
                store.set({ announcement: `${name} copied` });
            })
            .catch(fail("copied"));
    };
    return (
        <Popout opened={open} onOpenChange={setOpen}>
            <Popout.Trigger>
                <Tooltip
                    label={[`${name} settings`, ...notes].map((line) => (
                        <div key={line}>{line}</div>
                    ))}
                >
                    <PopoutButton
                        icon={<GLYPHS.settings size={14} aria-hidden />}
                        aria-label={`${name} settings`}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                    />
                </Tooltip>
            </Popout.Trigger>
            <Popout.Panel
                width={POPOUT_WIDTH}
                header={{ variant: "title", title: `${name} settings` }}
                closeLabel={`Close ${name} settings`}
            >
                <Popout.Content>
                    <ShaderParams
                        ctx={ctx}
                        descriptor={descriptor}
                        channel={shadersChannel(ctx.side)}
                        values={paramsOf(entry)}
                        bindings={bindingsOf(ctx, entry)}
                        onChange={(param, value) => {
                            writeParam(ctx, entry, param, value).catch(fail("changed"));
                        }}
                        onUnbind={(param) => {
                            unbindParam(ctx, entry, param).catch(fail("changed"));
                        }}
                    />
                    <Button size="compact-xs" variant="subtle" onClick={copy}>
                        Copy code
                    </Button>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * One row of a tab's Shaders section (decisions-v2, section 2.1): a drag handle, the picture, the
 * name, the place (its words and diagram, never a choice), the
 * settings button and a minus. Rows reorder by dragging the handle, or by Alt+Up and Alt+Down; the
 * order is the draw order inside one place; a move says where the row went. A right-click (or a long press) opens Copy code, Duplicate and edit, Move
 * up, Move down and Remove, so a pointer can reorder without dragging. Every write is one undo step.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.entry - the row's use
 * @param props.count - how many rows the list has
 * @param props.onMove - moves a row
 * @param props.onCode - opens the code dialog
 * @returns The row
 */
export function ShaderRow({ ctx, entry, count, onMove, onCode }: Readonly<ShaderRowProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const box = useRef<HTMLDivElement>(null);
    const handle = useRef<HTMLButtonElement>(null);
    const { descriptor, use } = entry;
    const base = descriptor?.plainName ?? use.shader;
    const name = use.off === true ? effectOffWords(base) : base;
    const why = useNotDrawn(ctx, entry);
    const { dragging, handlers } = useRowDrag(box, entry.index, onMove, (row) => [
        ...(row.closest("[data-section]")?.querySelectorAll<HTMLElement>("[data-shader-row]") ?? []),
    ]);
    const fail: Fail = (verb) => (error) => {
        store.set({ notice: { message: failureWords(name, verb, error), error: true } });
    };
    // A row just moved keeps focus on its handle, wherever it went.
    useLayoutEffect(() => {
        if (takeFocusNext(entry.key)) {
            handle.current?.focus();
        }
    });
    const remove = (): void => {
        if (box.current?.contains(document.activeElement) === true) {
            focusSectionNext(ctx.session, box.current, entry.key as Channel);
        }
        store.set({ announcement: `${name} removed` });
        removeShader(ctx, entry).catch(fail("removed"));
    };
    const copy = (): void => {
        copyShaderText(ctx.session, use.shader, fixedParams(entry))
            .then(() => {
                store.set({ announcement: `${name} copied` });
            })
            .catch(fail("copied"));
    };
    const duplicate = duplicateAction(ctx, entry, name, onCode, fail);
    // Moves the row by one, and says where it went, or that it is already at the end.
    const move = (to: number): void => {
        if (to < 0 || to >= count) {
            store.set({ announcement: SHADER_MOVE_WORDS.end(name, to < 0) });
            return;
        }
        store.set({ announcement: SHADER_MOVE_WORDS.moved(name, to + 1, count) });
        onMove(entry.index, to);
    };
    const removeName = `Remove ${name.toLowerCase()}`;
    // Where it draws and why it draws nothing: in the settings button's tooltip, or Remove's when the
    // row has no settings (an unknown or switched-off shader), never a line in the sidebar (#8739).
    const notes = [use.off === true ? "" : placeWords(placeOf(entry), ctx.side), why ?? ""].filter((w) => w !== "");
    const settingsShown = descriptor !== undefined && use.off !== true;
    const row = (
        <div // eslint-disable-line jsx-a11y/no-static-element-interactions -- catches Alt+Up and Alt+Down bubbling from the row's own controls to reorder it
            ref={box}
            className="ws-row ws-shader-row"
            data-line={entry.key}
            data-set=""
            data-shader={use.shader}
            data-shader-row=""
            data-dragging={dragging ? "" : undefined}
            onKeyDown={altArrowMove(box, (by) => {
                move(entry.index + by);
            })}
        >
            <div className="ws-field" data-shader-use="">
                <Tooltip label={`Move ${name.toLowerCase()}`} position="top">
                    <ActionIcon
                        ref={handle}
                        variant="subtle"
                        size="sm"
                        className="ws-drag-handle"
                        aria-label={`Move ${name.toLowerCase()}`}
                        aria-description={`${SHADER_MOVE_WORDS.position(entry.index + 1, count)}. Drag, or Alt+Up and Alt+Down`}
                        {...handlers}
                    >
                        <GLYPHS.drag size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
                <span className="ws-shader-name">
                    <ShaderThumb src={descriptor?.thumbnail} />
                    <ControlLabel size="xs" truncate title={name}>
                        {name}
                    </ControlLabel>
                </span>
                {/* The field column: a new row's focus goes to the control here (useFocusLine). */}
                <span className="ws-shader-place ws-field-control" />
                <span className="ws-slot">
                    <SettingsPopout ctx={ctx} entry={entry} name={name} fail={fail} notes={notes} />
                </span>
                <span className="ws-slot">
                    <Tooltip
                        label={(settingsShown ? [removeName] : [removeName, ...notes]).map((line) => (
                            <div key={line}>{line}</div>
                        ))}
                        position="top"
                    >
                        <ActionIcon variant="subtle" size="sm" aria-label={removeName} onClick={remove}>
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </span>
            </div>
        </div>
    );
    return (
        <ContextMenu target={row}>
            {descriptor !== undefined && <Menu.Item onClick={copy}>Copy code</Menu.Item>}
            {duplicate !== undefined && <Menu.Item onClick={duplicate}>Duplicate and edit</Menu.Item>}
            {count > 1 && (
                <Menu.Item
                    disabled={entry.index === 0}
                    onClick={() => {
                        move(entry.index - 1);
                    }}
                >
                    {SHADER_MOVE_WORDS.up}
                </Menu.Item>
            )}
            {count > 1 && (
                <Menu.Item
                    disabled={entry.index === count - 1}
                    onClick={() => {
                        move(entry.index + 1);
                    }}
                >
                    {SHADER_MOVE_WORDS.down}
                </Menu.Item>
            )}
            <Menu.Item onClick={remove}>Remove</Menu.Item>
        </ContextMenu>
    );
}

/**
 * Why the row's shader draws nothing now (the frame guard turned it off, it is held, it failed),
 * kept current from the element's `shader:status`; undefined while it draws.
 * @param ctx - the row's context.
 * @param entry - the row.
 * @returns the words, or undefined.
 */
function useNotDrawn(ctx: RowContext, entry: ShaderEntry): string | undefined {
    const { session } = ctx;
    const id = entry.use.shader;
    const known = entry.descriptor !== undefined && entry.use.off !== true;
    const [why, setWhy] = useState(() => notDrawnWords(session, id, known));
    useEffect(() => {
        const update = (): void => {
            setWhy(notDrawnWords(session, id, known));
        };
        update();
        const offs = [
            session.on("shader:status", (status) => {
                if (status.id === id) {
                    update();
                }
            }),
            session.on("render:quality", update),
        ];
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session, id, known]);
    return why;
}

/**
 * The words for a shader that draws nothing now.
 * @param session - the element's session.
 * @param id - the shader.
 * @param known - whether the row names a shader the catalog lists.
 * @returns why it draws nothing now, or undefined.
 */
function notDrawnWords(session: RowContext["session"], id: string, known: boolean): string | undefined {
    if (!known) {
        return undefined;
    }
    const status = session.shaders.status(id);
    const off = status.state === "off" || status.state === "held" || status.state === "failed";
    return off && status.problem !== undefined ? shaderProblemWords(status.problem) : undefined;
}
