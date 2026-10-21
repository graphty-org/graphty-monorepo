import { ContextMenu, Popout, PopoutButton } from "@graphty/compact-mantine";
import { formatShaderText, parseShaderText } from "@graphty/graphty-element/catalog";
import type { Channel } from "@graphty/graphty-element/schema";
import { ActionIcon, Badge, Button, Menu, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import type { PasteInit } from "./PasteShaderDialog";
import type { RowContext } from "./PropertyRow";
import { type GalleryChoice, ShaderGallery } from "./ShaderGallery";
import { ShaderParams } from "./ShaderParams";
import {
    bindingsOf,
    canPaste,
    copyShader,
    copyShaderText,
    paramsOf,
    pickShader,
    removeShader,
    shaderEntries,
    type ShaderEntry,
    type ShaderSlot,
    slotAdd,
    takeSettingsNext,
    unbindParam,
    writeParam,
    writeShown,
} from "./shaderSlots";
import { focusSectionNext, headerBottom } from "./useFocusLine";
import { copyNameWords, effectOffWords, failureWords, MATERIAL_WORDS, TRIGGER_TIPS, triggerWord } from "./words";

/** The width of a shader row's pop-outs: the gallery and the settings, as every field's. */
const POPOUT_WIDTH = 240;

/**
 * The Material row's choices that are not shaders, before the surfaces.
 */
const MATERIAL_CHOICES: readonly GalleryChoice[] = [
    { value: "plain", label: MATERIAL_WORDS.plain },
    { value: "wireframe", label: MATERIAL_WORDS.wireframe },
];

/**
 * The gallery a slot opens, in a pop-out beside the panel: its search box takes focus. Paste
 * shader is its last item; a pasted shader's tile has Delete from project in its context menu.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.slot - the slot
 * @param props.title - the pop-out's title
 * @param props.onPick - picks one
 * @param props.onPaste - opens Paste shader
 * @returns The gallery
 */
export function SlotGallery({
    ctx,
    slot,
    title,
    onPick,
    onPaste,
}: Readonly<{
    ctx: RowContext;
    slot: ShaderSlot;
    title: string;
    onPick: (id: string) => void;
    onPaste?: () => void;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    return (
        <ShaderGallery
            session={ctx.session}
            kinds={slot.kinds}
            label={`Find ${title.toLowerCase()}`}
            choices={slot.role === "material" ? MATERIAL_CHOICES : undefined}
            marked={shaderEntries(ctx, slot).map((entry) => entry.id)}
            onPick={onPick}
            onPaste={onPaste}
            onDelete={(id) => {
                const name = ctx.session.catalog.shaders().find((each) => each.id === id)?.plainName ?? id;
                ctx.session.shaders
                    .remove(id)
                    .then(() => {
                        store.set({ announcement: `${name} deleted` });
                    })
                    .catch((error: unknown) => {
                        store.set({ notice: { message: failureWords(name, "deleted", error), error: true } });
                    });
            }}
        />
    );
}

/** Props for ShaderRow. */
interface ShaderRowProps {
    readonly ctx: RowContext;
    readonly slot: ShaderSlot;
    readonly entry: ShaderEntry;
    /** Opens Paste shader with what it starts from. */
    readonly onPaste?: (init: PasteInit) => void;
}

/**
 * One shader row (shader-styles design, section 6.1, after Figma's effect row): the slot's word,
 * then the shader's still picture and name (a click opens the gallery to swap it), the trigger
 * chip for a shader that plays on enter or change, the settings button (its parameters), on an
 * effect the eye, and the minus. A right-click opens Copy, Paste, Hide and Remove. Every write is
 * one undo step.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.slot - the slot
 * @param props.entry - the row's shader
 * @param props.onPaste - opens Paste shader (the gallery's Paste shader, Duplicate and edit)
 * @returns The row
 */
export function ShaderRow({ ctx, slot, entry, onPaste }: Readonly<ShaderRowProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const box = useRef<HTMLDivElement>(null);
    const [swapping, setSwapping] = useState(false);
    const [settings, setSettings] = useState(() => takeSettingsNext(entry.key));
    const { descriptor } = entry;
    const name = rowName(entry);
    const fail = (verb: string) => (error: unknown) => {
        store.set({ notice: { message: failureWords(name, verb, error), error: true } });
    };
    const remove = (): void => {
        if (box.current?.contains(document.activeElement) === true) {
            focusSectionNext(box.current, entry.key as Channel);
        }
        store.set({ announcement: `${name} removed` });
        removeShader(ctx, slot, entry).catch(fail("removed"));
    };
    const shown = !entry.hidden;
    const toggleShown = (): void => {
        writeShown(ctx, slot, entry.id, !shown).catch(fail("changed"));
    };
    const copyText = (): void => {
        copyShaderText(ctx.session, entry.id, paramsOf(ctx, slot, entry.id))
            .then(() => {
                store.set({ announcement: `${name} copied` });
            })
            .catch(fail("copied"));
    };
    const duplicate =
        onPaste === undefined || descriptor === undefined || descriptor.origin === "pasted"
            ? undefined
            : (): void => {
                  ctx.session.shaders
                      .source(entry.id, { duplicate: true, params: paramsOf(ctx, slot, entry.id) })
                      .then((text) => {
                          // The copy is named apart from what it copies: "Pearl copy".
                          const read = parseShaderText(text);
                          const named = read.ok
                              ? formatShaderText({
                                    ...read.registration,
                                    descriptor: { ...read.registration.descriptor, plainName: copyNameWords(name) },
                                })
                              : text;
                          onPaste({ text: named, duplicateOf: entry.id });
                      })
                      .catch(fail("copied"));
              };
    const trigger = descriptor === undefined ? undefined : triggerWord(descriptor);
    const effect = slot.role === "effect";
    const swap = (
        <Popout opened={swapping} onOpenChange={setSwapping}>
            <Popout.Trigger>
                <UnstyledButton
                    className="ws-shader-pick"
                    aria-label={trigger === undefined ? `${slot.word}: ${name}` : `${slot.word}: ${name}, ${trigger}`}
                    aria-haspopup="dialog"
                    aria-expanded={swapping}
                >
                    {descriptor?.thumbnail === undefined ? (
                        <span className="ws-shader-thumb" aria-hidden />
                    ) : (
                        <img className="ws-shader-thumb" src={descriptor.thumbnail} alt="" />
                    )}
                    <Text size="xs" truncate>
                        {name}
                    </Text>
                </UnstyledButton>
            </Popout.Trigger>
            <Popout.Panel
                width={POPOUT_WIDTH}
                placement="left"
                alignment="start"
                boundaryTop={swapping ? headerBottom() : 0}
                header={{ variant: "title", title: slot.word }}
            >
                <Popout.Content>
                    <SlotGallery
                        ctx={ctx}
                        slot={slot}
                        title={slot.word}
                        onPaste={
                            onPaste === undefined
                                ? undefined
                                : () => {
                                      setSwapping(false);
                                      onPaste({});
                                  }
                        }
                        onPick={(id) => {
                            setSwapping(false);
                            if (id !== entry.id) {
                                pickShader(ctx, slot, id, entry.id).catch(fail("changed"));
                            }
                        }}
                    />
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
    const settingsButton =
        descriptor === undefined || descriptor.params.length === 0 || entry.off === true ? null : (
            <Popout opened={settings} onOpenChange={setSettings}>
                <Popout.Trigger>
                    <Tooltip label={`${name} settings`}>
                        <PopoutButton
                            icon={<GLYPHS.settings size={14} aria-hidden />}
                            aria-label={`${name} settings`}
                            aria-haspopup="dialog"
                            aria-expanded={settings}
                        />
                    </Tooltip>
                </Popout.Trigger>
                <Popout.Panel
                    width={POPOUT_WIDTH}
                    placement="left"
                    alignment="start"
                    header={{ variant: "title", title: `${name} settings` }}
                >
                    <Popout.Content>
                        <ShaderParams
                            ctx={ctx}
                            descriptor={descriptor}
                            channel={slot.params}
                            values={paramsOf(ctx, slot, entry.id)}
                            bindings={bindingsOf(ctx, slot, entry.id)}
                            onChange={(param, value) => {
                                writeParam(ctx, slot, entry.id, param, value).catch(fail("changed"));
                            }}
                            onUnbind={(param) => {
                                unbindParam(ctx, slot, entry.id, param).catch(fail("changed"));
                            }}
                        />
                        <Button size="compact-xs" variant="subtle" onClick={copyText}>
                            Copy code
                        </Button>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        );
    const removeName = `Remove ${name.toLowerCase()}`;
    const hideName = `Hide ${name.toLowerCase()}`;
    const row = (
        <div
            ref={box}
            className="ws-row ws-shader-row"
            data-line={entry.key}
            data-set=""
            data-shader={entry.id}
            data-hidden={entry.hidden === true ? "" : undefined}
            onKeyDownCapture={(event) => {
                // Only the row's own pick button removes the row, as a property row's closed
                // select does. A key from its pop-outs (a color chip, a tile) reaches here through
                // React's portal and is not the row's: the DOM's own containment tells them apart.
                const target = event.target as HTMLElement;
                const own = box.current?.contains(target) === true && target.classList.contains("ws-shader-pick");
                if ((event.key === "Delete" || event.key === "Backspace") && own) {
                    event.preventDefault();
                    event.stopPropagation();
                    remove();
                }
            }}
        >
            {/* An effect row is one of a list the section names, so the kind is not repeated on each. */}
            <div className="ws-field" data-named={effect ? undefined : ""} data-effect={effect ? "" : undefined}>
                {!effect && (
                    <span className="ws-field-label">
                        <span className="ws-field-name" title={slot.word} aria-hidden>
                            {slot.word}
                        </span>
                    </span>
                )}
                <div className="ws-field-control ws-shader-control">
                    {entry.off === true ? (
                        <Text size="xs" truncate>
                            {name}
                        </Text>
                    ) : (
                        swap
                    )}
                    {trigger === undefined ? null : (
                        <Tooltip label={TRIGGER_TIPS[trigger]}>
                            <Badge size="xs" variant="light" radius="sm" className="ws-shader-trigger" aria-hidden>
                                {trigger}
                            </Badge>
                        </Tooltip>
                    )}
                </div>
                <span className="ws-slot">{settingsButton}</span>
                {effect && (
                    <span className="ws-slot">
                        {entry.off !== true && (
                            <Tooltip label={hideName}>
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    // A toggle: one name, its state in aria-pressed (pressed: hidden).
                                    aria-label={hideName}
                                    aria-pressed={!shown}
                                    onClick={toggleShown}
                                >
                                    {shown ? (
                                        <GLYPHS.show size={14} aria-hidden />
                                    ) : (
                                        <GLYPHS.hide size={14} aria-hidden />
                                    )}
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </span>
                )}
                <span className="ws-slot">
                    <Tooltip label={removeName} position="top">
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
            <Menu.Item
                disabled={descriptor === undefined}
                onClick={() => {
                    copyShader(ctx, slot, entry.id);
                    store.set({ announcement: `${name} copied` });
                }}
            >
                {`Copy ${slot.word.toLowerCase()}`}
            </Menu.Item>
            {descriptor !== undefined && <Menu.Item onClick={copyText}>Copy code</Menu.Item>}
            {duplicate !== undefined && <Menu.Item onClick={duplicate}>Duplicate and edit</Menu.Item>}
            {canPaste(slot) && (
                <Menu.Item
                    onClick={() => {
                        slotAdd(ctx, slot, "shader:paste").catch(fail("pasted"));
                    }}
                >
                    Paste
                </Menu.Item>
            )}
            {effect && entry.off !== true && <Menu.Item onClick={toggleShown}>{shown ? "Hide" : "Show"}</Menu.Item>}
            <Menu.Item onClick={remove}>Remove</Menu.Item>
        </ContextMenu>
    );
}

/**
 * A row's name: the shader's catalog name, Plain, Wireframe, or "Aura off".
 * @param entry - the row.
 * @returns the words.
 */
function rowName(entry: ShaderEntry): string {
    if (entry.id === "plain" || entry.id === "wireframe") {
        return MATERIAL_WORDS[entry.id];
    }
    const name = entry.descriptor?.plainName ?? entry.id;
    return entry.off === true ? effectOffWords(name) : name;
}
