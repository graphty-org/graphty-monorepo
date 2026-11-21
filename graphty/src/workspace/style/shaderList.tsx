/**
 * A tab's shaders as a section draws them (decisions-v2, section 2.1): the shared gallery, one row per
 * use and the code dialog, for the Shaders section and Style panel v2's Effects section.
 */

import { Popout } from "@graphty/compact-mantine";
import type { Channel } from "@graphty/graphty-element/schema";
import React, { useEffect, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import type { RowContext } from "./PropertyRow";
import { type PasteInit, ShaderEditorDialog } from "./ShaderEditorDialog";
import { type OptionTile, ShaderGallery } from "./ShaderGallery";
import { ShaderRow } from "./ShaderRow";
import { addShader, moveShader, pickedShader, placeOf, shaderEntries, type ShaderEntry } from "./shaderSlots";
import { headerBottom } from "./useFocusLine";
import { channelWord, failureWords, LISTED_PLACES, type SectionSpec } from "./words";

/**
 * The tab's own style options a gallery search also finds (decisions-v2, section 2.2): Glow and
 * Wireframe on the Node tab, Band on the Edge tab, each by the property its "+" adds.
 */
const OPTION_CHANNELS: Readonly<Record<"node" | "edge", readonly Channel[]>> = {
    node: ["node.glow", "node.wireframe"],
    edge: ["edge.bandColor"],
};

/** The sections listening for an option a gallery picked, each answering for its own properties. */
const optionAdds = new Set<(side: "node" | "edge", channel: Channel) => boolean>();

/**
 * Listens for an option a gallery picked: the listener answers true for a property its section adds.
 * @param listener - the section's answer.
 * @returns stops listening.
 */
export function listenForOptions(listener: (side: "node" | "edge", channel: Channel) => boolean): () => void {
    optionAdds.add(listener);
    return () => {
        optionAdds.delete(listener);
    };
}

/** What {@link useShaderList} gives the section that holds a tab's shaders. */
export interface ShaderList {
    /** The uses listed, in the layer's order. */
    readonly entries: readonly ShaderEntry[];
    /** One row per use. */
    readonly rows: React.ReactNode;
    /** Whether the gallery is open. */
    readonly galleryOpen: boolean;
    /** Opens the gallery. */
    readonly openGallery: () => void;
    /** The gallery pop-out and the code dialog, drawn inside the section. */
    readonly overlays: React.ReactNode;
    /** Opens the code dialog on Control+V from the section's own controls. */
    readonly onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * A tab's shaders (decisions-v2, section 2.1): the shared gallery, one row per use on the layer's
 * list in its order, and the code dialog. A pick adds the shader at its own place, to every
 * selected layer in one undo step. A search hit on one of the tab's own style options adds that
 * option's row in its section instead. "New shader..." opens the code dialog, which asks the place.
 * Used by the Shaders section and by Style panel v2's Effects section, whose Shader item opens the gallery.
 * @param ctx - the row and kind.
 * @param spec - the section holding them.
 * @param sectionBox - the section's box: the gallery is placed beside it and focus returns to its "+".
 * @param active - false for a section that holds no shaders: it lists none and takes no focus.
 * @returns the list.
 */
export function useShaderList(
    ctx: RowContext,
    spec: SectionSpec,
    sectionBox: React.RefObject<HTMLDivElement | null>,
    active = true,
): ShaderList {
    const { store } = useWorkspace();
    const [gallery, setGallery] = useState(false);
    const [code, setCode] = useState<PasteInit | null>(null);
    const tab = ctx.side;
    const all = active ? shaderEntries(ctx) : [];
    const entries = all.filter(
        (entry) => (spec.shapeOwnsReplace !== true || placeOf(entry) !== "replace") && (spec.listed?.(entry) ?? true),
    );
    // v2 lists its styles in their own sections' "+" (Glow beside Shader in Effects), and no v2 section answers a
    // picked option tile, so its gallery offers shaders only (E668).
    const options: OptionTile[] = (spec.shapeOwnsReplace === true ? [] : OPTION_CHANNELS[tab]).map((channel) => ({
        key: channel,
        label: channelWord(channel),
    }));
    const fail = (verb: string) => (error: unknown) => {
        store.set({ notice: { message: failureWords(spec.title, verb, error), error: true } });
    };
    // Show in Style on a notice asks for this side's "+": it takes focus once the section is drawn.
    const shaderNext = useWorkspaceState((state) => state.shaderNext);
    useEffect(() => {
        if (active && shaderNext === tab) {
            store.set({ shaderNext: null });
            sectionBox.current?.querySelector<HTMLElement>("[data-plus]")?.focus();
        }
    }, [active, shaderNext, tab, store, sectionBox]);
    const pick = async (id: string): Promise<void> => {
        const name = ctx.session.shaders.describe(id)?.plainName ?? id;
        await addShader(ctx, await pickedShader(ctx.session, id));
        store.set({ announcement: `${name} added` });
    };
    const rows = entries.map((entry) =>
        spec.renderRow === undefined ? (
            <ShaderRow
                key={entry.key}
                ctx={ctx}
                entry={entry}
                count={entries.length}
                onMove={(from, to) => {
                    moveShader(ctx, from, to).catch(fail("changed"));
                }}
                onCode={setCode}
            />
        ) : (
            <React.Fragment key={entry.key}>{spec.renderRow(entry)}</React.Fragment>
        ),
    );
    const overlays = (
        <>
            <Popout
                opened={gallery}
                onOpenChange={(open) => {
                    setGallery(open);
                    // Closed with nothing picked: focus goes back to the section's "+".
                    if (!open && (document.activeElement ?? document.body) === document.body) {
                        sectionBox.current?.querySelector<HTMLElement>("[data-plus]")?.focus();
                    }
                }}
            >
                <Popout.Panel
                    width={280}
                    placement="left"
                    alignment="start"
                    anchorY={sectionBox}
                    boundaryTop={gallery ? headerBottom() : 0}
                    header={{ variant: "title", title: spec.title }}
                    closeLabel={`Close ${spec.title}`}
                >
                    <Popout.Content>
                        <ShaderGallery
                            session={ctx.session}
                            tab={tab}
                            options={options}
                            marked={entries.map((entry) => entry.use.shader)}
                            exclude={spec.shapeOwnsReplace === true ? "replace" : undefined}
                            bare={spec.shapeOwnsReplace === true}
                            places={spec.shapeOwnsReplace === true ? LISTED_PLACES[tab] : undefined}
                            onNew={() => {
                                setGallery(false);
                                setCode({});
                            }}
                            onPick={(id) => {
                                setGallery(false);
                                pick(id).catch(fail("added"));
                            }}
                            onOption={(channel) => {
                                setGallery(false);
                                for (const answer of optionAdds) {
                                    if (answer(tab, channel as Channel)) {
                                        break;
                                    }
                                }
                            }}
                            onDelete={(id) => {
                                const name = ctx.session.shaders.describe(id)?.plainName ?? id;
                                ctx.session.shaders
                                    .remove(id)
                                    .then(() => {
                                        store.set({ announcement: `${name} deleted` });
                                    })
                                    .catch(fail("deleted"));
                            }}
                        />
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
            {code !== null && (
                <ShaderEditorDialog
                    session={ctx.session}
                    tab={tab}
                    put={(scope, id, params) => addShader(ctx, id, params, scope)}
                    init={code}
                    onClose={() => {
                        setCode(null);
                    }}
                />
            )}
        </>
    );
    return {
        entries,
        rows,
        galleryOpen: gallery,
        openGallery: () => {
            setGallery(true);
        },
        overlays,
        onKeyDown: (event) => {
            pasteKey(event, setCode);
        },
    };
}

/**
 * Control+V (Command+V) with focus on a control of the Shaders section, not in a text field: opens
 * the code dialog with the clipboard's text, or with the unsent draft when the browser will not
 * read the clipboard.
 * @param event - the key.
 * @param open - opens the dialog.
 */
function pasteKey(event: React.KeyboardEvent, open: (init: PasteInit) => void): void {
    const target = event.target as HTMLElement;
    const typing = target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA";
    if (typing || !(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "v") {
        return;
    }
    event.preventDefault();
    const read = navigator.clipboard?.readText?.();
    if (read === undefined) {
        open({});
        return;
    }
    read.then(
        (text) => {
            open(text.trim() === "" ? {} : { text });
        },
        () => {
            open({});
        },
    );
}
