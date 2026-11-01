import { ContextMenu, Popout, PopoutButton } from "@graphty/compact-mantine";
import { formatShaderText, parseShaderText } from "@graphty/graphty-element/catalog";
import type { Channel } from "@graphty/graphty-element/schema";
import { ActionIcon, Button, Menu, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import type { PasteInit } from "./PasteShaderDialog";
import type { RowContext } from "./PropertyRow";
import { type DataChoice, sourceName } from "./row";
import { PlaceDiagram } from "./ShaderGallery";
import { ShaderParams } from "./ShaderParams";
import {
    bindingsOf,
    copyShaderText,
    fixedParams,
    paramsOf,
    placeOf,
    removeShader,
    type ShaderEntry,
    shadersChannel,
    takeFocusNext,
    unbindParam,
    writeGroupBy,
    writeParam,
} from "./shaderSlots";
import { focusSectionNext } from "./useFocusLine";
import { ValuePicker } from "./ValuePicker";
import {
    copyNameWords,
    effectOffWords,
    failureWords,
    GROUP_BY_WORDS,
    placeWords,
    SHADER_MOVE_WORDS,
    shaderProblemWords,
} from "./words";

/** The width of a shader row's pop-outs: the settings, as every field's. */
const POPOUT_WIDTH = 240;

/**
 * A shader's still picture, or an empty box when it has none.
 * @param props - Component props
 * @param props.src - the picture's address, or undefined.
 * @returns The picture
 */
export function ShaderThumb({ src }: Readonly<{ src: string | undefined }>): React.JSX.Element {
    return src === undefined ? (
        <span className="ws-shader-thumb" aria-hidden />
    ) : (
        <img className="ws-shader-thumb" src={src} alt="" />
    );
}

/** Posts a failed write's notice, given the verb of what failed. */
type Fail = (verb: string) => (error: unknown) => void;

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
 * ("Pearl copy"), at the row's place. None for a project shader, an unknown one, or with no
 * dialog to open.
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
    if (onCode === undefined || descriptor === undefined || descriptor.origin === "pasted") {
        return undefined;
    }
    return (): void => {
        ctx.session.shaders
            .source(entry.use.shader, { duplicate: true, params: fixedParams(entry) })
            .then((text) => {
                const read = parseShaderText(text);
                const named = read.ok
                    ? formatShaderText({
                          ...read.registration,
                          descriptor: { ...read.registration.descriptor, plainName: copyNameWords(name) },
                      })
                    : text;
                onCode({ text: named, duplicateOf: entry.use.shader, place: placeOf(entry) });
            })
            .catch(fail("copied"));
    };
}

/**
 * The place of a row, as its words and diagram. Choosing a shader asks no place: a shader draws at
 * its own, which only its code (New shader, Edit code) sets.
 * @param props - Component props
 * @param props.tab - the row's tab
 * @param props.entry - the row's use
 * @returns The label
 */
function PlaceLabel({ tab, entry }: Readonly<{ tab: RowContext["side"]; entry: ShaderEntry }>): React.JSX.Element {
    const place = placeOf(entry);
    return (
        <span className="ws-place-badge" data-place={place}>
            <PlaceDiagram place={place} tab={tab} />
            <Text size="xs" truncate>
                {placeWords(place, tab)}
            </Text>
        </span>
    );
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
 * @returns The button and its pop-out, or null
 */
function SettingsPopout({
    ctx,
    entry,
    name,
    fail,
}: Readonly<{ ctx: RowContext; entry: ShaderEntry; name: string; fail: Fail }>): React.JSX.Element | null {
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
                <Tooltip label={`${name} settings`}>
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
                placement="left"
                alignment="start"
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
 * The data path a picked value reads: a column's, or a run field's.
 * @param ctx - the row.
 * @param choice - the pick.
 * @returns the path, or undefined when the session no longer answers it.
 */
function pathOf(ctx: RowContext, choice: DataChoice): string | undefined {
    if (choice.kind === "result") {
        return ctx.session.results.path(choice.runId, choice.field);
    }
    return ctx.session.data
        .attributes()
        .find((attribute) => attribute.kind === choice.column.kind && attribute.name === choice.column.name)?.path;
}

/**
 * The Group by line under a group outline's row: one outline per value the members share, or one
 * around all of them.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.entry - the outline's use
 * @param props.fail - posts a failed write's notice
 * @returns The line
 */
function GroupByLine({
    ctx,
    entry,
    fail,
}: Readonly<{ ctx: RowContext; entry: ShaderEntry; fail: Fail }>): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const { groupBy } = entry.use;
    const word = groupBy === undefined ? GROUP_BY_WORDS.none : (sourceName(ctx.session, { by: groupBy }) ?? groupBy);
    const write = (path: string | undefined): void => {
        setOpen(false);
        writeGroupBy(ctx, entry, path).catch(fail("changed"));
    };
    return (
        <div className="ws-row" data-line={`${entry.key}.groupBy`} data-set="">
            <div className="ws-field ws-field-sub">
                <div className="ws-field-control">
                    <Popout opened={open} onOpenChange={setOpen}>
                        <Popout.Trigger>
                            <Button size="compact-xs" variant="default" fullWidth justify="flex-start">
                                {GROUP_BY_WORDS.line(word)}
                            </Button>
                        </Popout.Trigger>
                        <Popout.Panel
                            width={POPOUT_WIDTH}
                            placement="left"
                            alignment="start"
                            header={{ variant: "title", title: GROUP_BY_WORDS.title }}
                            closeLabel={`Close ${GROUP_BY_WORDS.title}`}
                        >
                            <ValuePicker
                                title={GROUP_BY_WORDS.title}
                                target="node"
                                inUse={groupBy === undefined ? [] : [groupBy]}
                                fixedLabel={GROUP_BY_WORDS.none}
                                fixedInForce={groupBy === undefined}
                                onFixed={() => {
                                    write(undefined);
                                }}
                                onPick={(choice) => {
                                    write(pathOf(ctx, choice));
                                }}
                                onClose={() => {
                                    setOpen(false);
                                }}
                            />
                        </Popout.Panel>
                    </Popout>
                </div>
                <span className="ws-slot" />
                <span className="ws-slot" />
            </div>
        </div>
    );
}

/**
 * Drags a row by its handle: the pointer is captured on press, and on release the row moves to
 * where the pointer is among the section's rows.
 * @param box - the row.
 * @param index - the row's index.
 * @param onMove - moves it.
 * @returns the handle's pointer handlers, and whether a drag is under way.
 */
function useRowDrag(
    box: React.RefObject<HTMLDivElement | null>,
    index: number,
    onMove: (from: number, to: number) => void,
): { dragging: boolean; handlers: React.HTMLAttributes<HTMLElement> } {
    const [dragging, setDragging] = useState(false);
    const handlers: React.HTMLAttributes<HTMLElement> = {
        onPointerDown: (event) => {
            if (event.button !== 0) {
                return;
            }
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
        },
        onPointerUp: (event) => {
            if (!dragging) {
                return;
            }
            setDragging(false);
            const rows = [
                ...(box.current?.closest("[data-section]")?.querySelectorAll<HTMLElement>("[data-shader-row]") ?? []),
            ];
            // The row goes where the pointer is: before the first row whose middle is below it.
            const below = rows.findIndex((row) => {
                const rect = row.getBoundingClientRect();
                return event.clientY < rect.top + rect.height / 2;
            });
            const slot = below < 0 ? rows.length : below;
            const to = slot > index ? slot - 1 : slot;
            if (to !== index) {
                onMove(index, to);
            }
        },
        onPointerCancel: () => {
            setDragging(false);
        },
    };
    return { dragging, handlers };
}

/**
 * One row of a tab's Shaders section (decisions-v2, section 2.1): a drag handle, the picture, the
 * name, the place (its words and diagram, never a choice), the
 * settings button and a minus. Rows reorder by dragging the handle, or by Alt+Up and Alt+Down; the
 * order is the draw order inside one place; a move says where the row went. A group outline also
 * has its Group by line. A right-click (or a long press) opens Copy code, Duplicate and edit, Move
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
    const { dragging, handlers } = useRowDrag(box, entry.index, onMove);
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
    const row = (
        <div // NOSONAR(S6848): catches Alt+Up and Alt+Down bubbling from the row's own controls to reorder it
            ref={box}
            className="ws-row ws-shader-row"
            data-line={entry.key}
            data-set=""
            data-shader={use.shader}
            data-shader-row=""
            data-dragging={dragging ? "" : undefined}
            onKeyDown={(event) => {
                if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) {
                    return;
                }
                // A key from the row's pop-outs reaches it through React's portal and is not the row's.
                if (!box.current?.contains(event.target as Node)) {
                    return;
                }
                event.preventDefault();
                move(entry.index + (event.key === "ArrowUp" ? -1 : 1));
            }}
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
                    <Text size="xs" truncate title={name}>
                        {name}
                    </Text>
                </span>
                {/* The field column: a new row's focus goes to the control here (useFocusLine). */}
                <span className="ws-shader-place ws-field-control">
                    {use.off === true ? null : <PlaceLabel tab={ctx.side} entry={entry} />}
                </span>
                <span className="ws-slot">
                    <SettingsPopout ctx={ctx} entry={entry} name={name} fail={fail} />
                </span>
                <span className="ws-slot">
                    <Tooltip label={removeName} position="top">
                        <ActionIcon variant="subtle" size="sm" aria-label={removeName} onClick={remove}>
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </span>
            </div>
            {why === undefined ? null : (
                <Text size="xs" c="var(--cm-text-secondary)" className="ws-field-covered" data-shader-problem>
                    {why}
                </Text>
            )}
        </div>
    );
    return (
        <>
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
            {placeOf(entry) === "group" && use.off !== true && <GroupByLine ctx={ctx} entry={entry} fail={fail} />}
        </>
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
