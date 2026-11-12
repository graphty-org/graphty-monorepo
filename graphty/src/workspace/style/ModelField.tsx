/**
 * The node-models experiment's part of a property line (issue #3396): the Shape field holding a
 * model in place of a built-in shape, with its Models, Model settings and Parts pop-overs, and
 * Fill's Picture line with its Picture pop-over. `Field` asks `useAssetLine` and draws what it
 * returns in place of its own; with the experiment off it returns nothing and `Field` is today's.
 */

import { Popout, PopoutButton } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue } from "@graphty/graphty-element/schema";
import { Tooltip } from "@mantine/core";
import React, { useCallback, useState } from "react";

import { modelName, pictureName } from "../canvas/models";
import { nodeModelsOn } from "../features";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { CustomModelDialog, type ModelDraft } from "./CustomModelDialog";
import { ModelSettings } from "./ModelSettings";
import { ModelsPopover } from "./ModelsPopover";
import { ModelProblems } from "./PartsPopover";
import { PictureField, PicturePopover } from "./PicturePopover";
import type { RowContext } from "./PropertyRow";
import { layerWord, lineIn, removeLine, without, writeIn } from "./row";
import { focusSectionNext } from "./useFocusLine";
import { ModelValueField, ValueField } from "./ValueField";
import { fieldName, MODEL_CHANNELS, MODEL_PICK, MODEL_TILE, PICTURE_WORD, valueWords } from "./words";

/** The Model settings pop-over's width, as every Style panel pop-over. */
const POPOUT_WIDTH = 240;

/** What the experiment draws in a property line, in place of the line's own. */
export interface AssetLine {
    /** The field's accessible name, when not the property's own ("Node picture"). */
    readonly name?: string;
    /** The label column's word, when not the property's own ("Picture"). */
    readonly label?: string;
    /** What the Shape line's own layer names as its model, if anything. */
    readonly model?: string;
    /** The Shape list's Model... entry. */
    readonly extraChoices?: React.ComponentProps<typeof ValueField>["extraChoices"];
    /**
     * Takes a picked choice first: Model... opens the Models pop-over, and a built-in shape picked
     * while a model is set takes the model off. False leaves the write to the line.
     */
    readonly pick: (value: ChannelValue) => boolean;
    /** The value control, in place of the line's own. */
    readonly control?: React.ReactNode;
    /** Whether the vary column is the experiment's (Model settings, or empty for Picture). */
    readonly ownsVary: boolean;
    /** The vary column's contents, when `ownsVary`. */
    readonly varySlot?: React.ReactNode;
    /** The minus, in place of the line's own. */
    readonly remove?: () => void;
    /** What it draws under the line: the model's chips and the pop-overs. */
    readonly extras: React.ReactNode;
}

/** What `useAssetLine` needs of its line. */
interface AssetLineArgs {
    readonly ctx: RowContext;
    readonly descriptor: ChannelDescriptor;
    readonly pending: boolean;
    readonly box: React.RefObject<HTMLDivElement | null>;
    readonly onCancel: (() => void) | undefined;
    /** Says a refused write. */
    readonly fail: (error: unknown) => void;
}

/** The line, with the workspace store its words go to. */
interface LineHelpers extends AssetLineArgs {
    readonly store: ReturnType<typeof useWorkspace>["store"];
}

/**
 * The values a row's model is drawn with: its color and its model settings, where the row sets
 * them to a value (a binding varies by node, so no one picture shows it).
 * @param ctx - the row.
 * @returns the values, by channel.
 */
function modelStyleOf(ctx: RowContext): ModelDraft {
    const channels: readonly Channel[] = ["node.color", ...MODEL_CHANNELS.filter((c) => c !== "node.model")];
    return Object.fromEntries(
        channels.flatMap((channel) => {
            const value = lineIn(ctx, channel)?.value;
            return value === undefined ? [] : [[channel, value]];
        }),
    );
}

/**
 * The model a Shape line's own layer names, if any.
 * @param ctx - the row.
 * @param channel - the line's property.
 * @param on - whether the experiment is on.
 * @returns the line naming it and what it names, or nothing.
 */
function modelOf(ctx: RowContext, channel: Channel, on: boolean): { line: ReturnType<typeof lineIn>; ref?: string } {
    const line = on && channel === "node.shape" ? lineIn(ctx, "node.model") : undefined;
    const ref = line !== undefined && !line.layer.locked && typeof line.value === "string" ? line.value : undefined;
    return { line, ref };
}

/**
 * The node-models experiment's part of a property line: see the file's comment. Called on every
 * line, before it decides whether it draws; it returns nothing for a line that is not Shape or
 * Picture, or with the experiment off.
 * @param args - the line.
 * @returns what the line draws in place of its own, or undefined.
 */
export function useAssetLine(args: AssetLineArgs): AssetLine | undefined {
    const { ctx, descriptor, pending, box } = args;
    const { store } = useWorkspace();
    const line: LineHelpers = { ...args, store };
    const { session } = ctx;
    const { channel } = descriptor;
    const on = nodeModelsOn(session);
    const { ref: model } = modelOf(ctx, channel, on);
    const [modelsOpen, setModelsOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    // The Load custom model dialog, opened by the Models pop-over's Custom model....
    const [customOpen, setCustomOpen] = useState(false);
    // Fill's Picture line, added with "+": its pop-over opens at once.
    const [pictureOpen, setPictureOpen] = useState(() => on && channel === "node.texture" && pending);
    // Focus back on the field, once the pop-over that took its place has gone.
    const focusField = useCallback(() => {
        requestAnimationFrame(() => {
            box.current?.querySelector<HTMLElement>(".ws-field-control input")?.focus();
        });
    }, [box]);
    if (on && channel === "node.shape") {
        return shapeLine(line, {
            model,
            modelsOpen,
            setModelsOpen,
            settingsOpen,
            setSettingsOpen,
            customOpen,
            setCustomOpen,
            focusField,
        });
    }
    if (on && channel === "node.texture") {
        return pictureLine(line, { pictureOpen, setPictureOpen, focusField });
    }
    return undefined;
}

/** The Shape line's state, held by `useAssetLine`. */
interface ShapeState {
    readonly model: string | undefined;
    readonly modelsOpen: boolean;
    readonly setModelsOpen: (open: boolean) => void;
    readonly settingsOpen: boolean;
    readonly setSettingsOpen: (open: boolean) => void;
    readonly customOpen: boolean;
    readonly setCustomOpen: (open: boolean) => void;
    readonly focusField: () => void;
}

/**
 * Says a write once it is made, or its refusal.
 * @param line - the line.
 * @param done - the write.
 * @param words - what it said.
 */
function said(line: LineHelpers, done: Promise<unknown>, words: () => string): void {
    done.then(() => {
        line.store.set({ announcement: words() });
    }).catch(line.fail);
}

/**
 * The Shape line with the experiment on: its list ends in Model..., and while its layer names a
 * model the field shows the model, Model settings takes the vary column, the model's chips sit
 * under it, and the minus takes the model off.
 * @param args - the line.
 * @param state - its state.
 * @returns what it draws.
 */
function shapeLine(args: LineHelpers, state: ShapeState): AssetLine {
    const { ctx, descriptor, box, onCancel } = args;
    const { session } = ctx;
    const { channel } = descriptor;
    const { model, setModelsOpen, focusField } = state;
    const { line: modelLine } = modelOf(ctx, channel, true);
    const name = fieldName(channel);
    // Model... is one more row of the list, not a trailing action under a rule line, until
    // compact-mantine's select has one (issue #6233).
    const extraChoices = [{ value: MODEL_PICK, label: MODEL_TILE, glyph: <GLYPHS.model size={14} aria-hidden /> }];
    const own = lineIn(ctx, channel);
    // A built-in shape picked while the field holds a model: the model and its settings go, in one undo step.
    const shapeOverModel = (value: ChannelValue): void => {
        const { many } = ctx;
        const words = (): string => `${name} now ${valueWords(descriptor, value)}`;
        if (many !== undefined) {
            // ponytail: several rows take it as two steps (the shape, then the model off).
            said(
                args,
                many.write(channel, { value }).then(() => Promise.all(MODEL_CHANNELS.map((c) => many.clear(c)))),
                words,
            );
            return;
        }
        const holder = modelLine?.layer;
        const done = session.transaction(`changing ${name.toLowerCase()}`, async (tx) => {
            const target = tx.styles.get((own !== undefined && !own.layer.locked ? own : modelLine)?.layer.id ?? "");
            if (target !== undefined) {
                await tx.styles.update(target.id, {
                    set: { ...target.set, [channel]: value },
                    encode: without(target.encode, channel),
                });
            }
            const after = holder === undefined ? undefined : tx.styles.get(holder.id);
            if (after !== undefined) {
                await removeLine(tx, after, ...MODEL_CHANNELS);
            }
        });
        said(args, done, words);
    };
    const pickModel = (
        ref: string,
        into: Channel,
        settings?: Readonly<Partial<Record<Channel, ChannelValue>>>,
    ): void => {
        setModelsOpen(false);
        state.setCustomOpen(false);
        focusField();
        // The model and the dialog's settings, in one undo step.
        said(args, writeIn(ctx, into, { value: ref }, settings), () =>
            into === "node.model"
                ? `${name} now ${modelName(session, ref)}`
                : `Node picture now ${pictureName(session, ref)}`,
        );
    };
    // A picture named as the model (an old project, code): moved to node.texture, one undo step.
    const modelToPicture = (): void => {
        if (modelLine === undefined || model === undefined) {
            return;
        }
        const holder = modelLine.layer;
        const done = session.transaction(`using ${pictureName(session, model)} as picture`, async (tx) => {
            const layer = tx.styles.get(holder.id);
            if (layer !== undefined) {
                await tx.styles.update(layer.id, { set: { ...layer.set, "node.texture": model } });
                await removeLine(tx, tx.styles.get(layer.id) ?? layer, "node.model");
            }
        });
        said(args, done, () => `Node picture now ${pictureName(session, model)}`);
    };
    // The minus on a model line: the model, its settings and any shape the layer kept under it, in one step.
    const removeModel = (): void => {
        if (box.current?.contains(document.activeElement) === true) {
            focusSectionNext(session, box.current, channel);
        }
        onCancel?.();
        const { many } = ctx;
        const removed = (): string => `${name} removed`;
        if (many !== undefined) {
            said(args, Promise.all([...MODEL_CHANNELS, channel].map((c) => many.clear(c))), removed);
            return;
        }
        const holder = modelLine?.layer;
        const shaped = own !== undefined && !own.layer.locked ? own.layer : undefined;
        const done = session.transaction(
            `removing the model from ${holder === undefined ? "the default" : (layerWord(session, holder.id) ?? "the default")}`,
            async (tx) => {
                const layer = holder === undefined ? undefined : tx.styles.get(holder.id);
                if (layer !== undefined) {
                    await removeLine(tx, layer, ...MODEL_CHANNELS);
                }
                const kept = shaped === undefined ? undefined : tx.styles.get(shaped.id);
                if (kept !== undefined) {
                    await removeLine(tx, kept, channel);
                }
            },
        );
        said(args, done, removed);
    };
    const pick = (value: ChannelValue): boolean => {
        if (value === MODEL_PICK) {
            setModelsOpen(true);
            return true;
        }
        if (model !== undefined) {
            shapeOverModel(value);
            return true;
        }
        return false;
    };
    const popover = (
        <ModelsPopover
            opened={state.modelsOpen}
            anchor={box}
            current={model}
            onPick={(ref) => {
                pickModel(ref, "node.model");
            }}
            onCustom={() => {
                setModelsOpen(false);
                state.setCustomOpen(true);
            }}
            onBack={() => {
                setModelsOpen(false);
                // The list again, in the pop-over's place, as the field opens it.
                requestAnimationFrame(() => {
                    box.current?.querySelector<HTMLElement>(".ws-field-control input")?.click();
                });
            }}
            onClose={() => {
                setModelsOpen(false);
                focusField();
            }}
        />
    );
    const dialogs = (
        <>
            {popover}
            {state.customOpen ? (
                <CustomModelDialog
                    forLayer
                    baseStyle={modelStyleOf(ctx)}
                    onAdd={(ref, settings) => {
                        pickModel(ref, "node.model", settings);
                    }}
                    onPicture={(ref) => {
                        pickModel(ref, "node.texture");
                    }}
                    onClose={() => {
                        state.setCustomOpen(false);
                        focusField();
                    }}
                />
            ) : null}
        </>
    );
    if (model === undefined) {
        return { extraChoices, pick, ownsVary: false, extras: dialogs };
    }
    return {
        model,
        extraChoices,
        pick,
        ownsVary: true,
        control: (
            <ModelValueField
                descriptor={descriptor}
                label={name}
                model={model}
                style={modelStyleOf(ctx)}
                name={modelName(session, model)}
                extraChoices={extraChoices}
                onChange={(value) => {
                    pick(value);
                }}
            />
        ),
        // A model does not vary by a value here yet (as for Picture, design 13.7): its settings
        // button takes the vary column, so the label column stays where every other field's is.
        varySlot: (
            <Popout opened={state.settingsOpen} onOpenChange={state.setSettingsOpen}>
                <Popout.Trigger>
                    <Tooltip label="Model settings">
                        <PopoutButton
                            icon={<GLYPHS.settings size={14} aria-hidden />}
                            aria-label="Model settings"
                            aria-haspopup="dialog"
                            aria-expanded={state.settingsOpen}
                        />
                    </Tooltip>
                </Popout.Trigger>
                <Popout.Panel
                    width={POPOUT_WIDTH}
                    placement="left"
                    alignment="start"
                    header={{ variant: "title", title: "Model settings" }}
                    closeLabel="Close Model settings"
                >
                    <Popout.Content>
                        <ModelSettings ctx={ctx} model={model} />
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        ),
        remove: removeModel,
        extras: (
            <>
                <ModelProblems modelRef={model} anchor={box} onDone={focusField} onUseAsPicture={modelToPicture} />
                {dialogs}
            </>
        ),
    };
}

/** The Picture line's state, held by `useAssetLine`. */
interface PictureState {
    readonly pictureOpen: boolean;
    readonly setPictureOpen: (open: boolean) => void;
    readonly focusField: () => void;
}

/**
 * Fill's Picture line (node-models design 13.7): its field opens the Picture pop-over, which opens
 * at once when "+" adds the line; closed on a line that holds nothing yet, the line is taken back.
 * A picture does not vary by a value yet, so its vary column is empty. Delete on its closed field
 * removes it, as on every select.
 * @param args - the line.
 * @param state - its state.
 * @returns what it draws.
 */
function pictureLine(args: LineHelpers, state: PictureState): AssetLine {
    const { ctx, box, pending, onCancel } = args;
    const { session } = ctx;
    const { pictureOpen, setPictureOpen, focusField } = state;
    const name = `Node ${PICTURE_WORD.toLowerCase()}`;
    const own = lineIn(ctx, "node.texture");
    const ref = own !== undefined && !own.layer.locked && typeof own.value === "string" ? own.value : undefined;
    const write = (value: string, into: Channel): void => {
        setPictureOpen(false);
        focusField();
        said(args, writeIn(ctx, into, { value }), () =>
            into === "node.texture"
                ? `${name} now ${pictureName(session, value)}`
                : `Node shape now ${modelName(session, value)}`,
        );
    };
    return {
        name,
        label: PICTURE_WORD,
        pick: () => false,
        ownsVary: true,
        varySlot: null,
        control: (
            <PictureField
                label={name}
                pictureRef={ref}
                expanded={pictureOpen}
                onOpen={() => {
                    setPictureOpen(true);
                }}
            />
        ),
        extras: (
            <PicturePopover
                opened={pictureOpen}
                anchor={box}
                current={ref}
                onPick={(value) => {
                    write(value, "node.texture");
                }}
                onModel={(value) => {
                    write(value, "node.model");
                }}
                onClose={() => {
                    setPictureOpen(false);
                    if (pending && ref === undefined) {
                        // Just added with "+" and holding nothing: taken back, focus on the "+".
                        args.store.set({ announcement: `${name} not added` });
                        if (box.current !== null) {
                            focusSectionNext(session, box.current, "node.texture");
                        }
                        onCancel?.();
                        return;
                    }
                    focusField();
                }}
            />
        ),
    };
}
