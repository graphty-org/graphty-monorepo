import { PanelField, Popout } from "@graphty/compact-mantine";
import { assetFileExtensions } from "@graphty/graphty-element/catalog";
import type { AssetSource, CodedFact, GraphSession } from "@graphty/graphty-element/session";
import { Button, Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { fileStem, pictureName } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { ModelChip } from "./ModelChip";
import { AddressForm, FileInput, SectionHeading } from "./ModelsPopover";
import { chipLine, modelChip } from "./modelWords";
import { roveTiles, tileStop } from "./tileRoving";
import { useStillOpen } from "./useStillOpen";
import { logUnexpected } from "./words";

/** The files the chooser offers; a drop is not filtered, and the element says what arrived. */
const ACCEPT = assetFileExtensions("image").join(",");

/** The pop-over's width, as every Style panel pop-over. */
const WIDTH = 240;

/**
 * The picture itself, for a thumbnail: an object URL of the asset's one file, while it is shown.
 * A picture kept by URL shows the picture glyph: drawing it would fetch it past the element's
 * web-address question (node-models design 2.6).
 * @param session - the element's session.
 * @param ref - what `node.texture` names.
 * @returns the object URL, or undefined.
 */
function useThumbnail(session: GraphSession | null, ref: string): string | undefined {
    const [url, setUrl] = useState<string | undefined>(undefined);
    useEffect(() => {
        const record = session?.assets.find(ref);
        if (session === null || record?.kind !== "image" || record.state !== "accepted") {
            setUrl(undefined);
            return undefined;
        }
        const [bytes] = [...session.assets.files(record.id).values()];
        if (bytes === undefined) {
            setUrl(undefined);
            return undefined;
        }
        const made = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>]));
        setUrl(made);
        return () => {
            URL.revokeObjectURL(made);
        };
    }, [session, ref]);
    return url;
}

/**
 * A picture in a 16 px slot: the picture itself, else the picture glyph.
 * @param props - Component props
 * @param props.pictureRef - what `node.texture` names
 * @returns The thumbnail
 */
function Thumb({ pictureRef }: Readonly<{ pictureRef: string }>): React.JSX.Element {
    const { session } = useWorkspace();
    const src = useThumbnail(session, pictureRef);
    return src === undefined ? (
        <GLYPHS.picture size={14} aria-hidden />
    ) : (
        <img src={src} alt="" width={16} height={16} aria-hidden style={{ objectFit: "cover" }} />
    );
}

/**
 * The Picture line's field (node-models design 13.7): drawn as every property field, the picture's
 * thumbnail in its glyph slot and its name as its value, opening the Picture pop-over. Before a
 * picture is chosen it reads "Choose".
 * @param props - Component props
 * @param props.label - the property's name, "Node picture"
 * @param props.pictureRef - what the layer's `node.texture` names, or undefined
 * @param props.expanded - whether the pop-over is open
 * @param props.onOpen - opens the pop-over
 * @returns The field
 */
export function PictureField({
    label,
    pictureRef,
    expanded,
    onOpen,
}: Readonly<{
    label: string;
    pictureRef: string | undefined;
    expanded: boolean;
    onOpen: () => void;
}>): React.JSX.Element {
    const { session } = useWorkspace();
    const name = pictureRef === undefined || session === null ? undefined : pictureName(session, pictureRef);
    return (
        <PanelField
            kind="select"
            width="fill"
            label={`${label}, ${name ?? "Choose"}`}
            value={name ?? ""}
            placeholder={name === undefined ? "Choose" : undefined}
            aria-haspopup="dialog"
            aria-expanded={expanded}
            glyph={
                pictureRef === undefined ? <GLYPHS.picture size={14} aria-hidden /> : <Thumb pictureRef={pictureRef} />
            }
            onClick={onOpen}
        />
    );
}

/** Props for PicturePopover. */
interface PicturePopoverProps {
    /** Whether it is open. */
    readonly opened: boolean;
    /** The row it opens beside. */
    readonly anchor: React.RefObject<HTMLElement | null>;
    /** What the layer's `node.texture` names now, so its picture reads as chosen. */
    readonly current?: string;
    /** Called with what the layer's `node.texture` should name: an asset id or a pasted URL. */
    readonly onPick: (ref: string) => void;
    /** Called with a model's asset id when the reader takes a model that arrived here as the layer's model. */
    readonly onModel: (ref: string) => void;
    /** Closed, by Escape or its close button. */
    readonly onClose: () => void;
}

/** A model that arrived where a picture was expected: its asset id and its name. */
interface ArrivedModel {
    readonly id: string;
    readonly name: string;
}

/**
 * Lets go of a model that arrived in the Picture pop-over and waits for parts, once the pop-over
 * closes or its row goes: it is the reader's only once taken as the model, so it never waits in
 * the session for files dropped later.
 * @param session - the element's session.
 * @param opened - whether the pop-over is open.
 * @param onLetGo - told when it was let go, to clear what the pop-over shows.
 * @returns the held model's id, which `add` sets and Use as model clears.
 */
function useStray(session: GraphSession | null, opened: boolean, onLetGo: () => void): React.RefObject<string | null> {
    const stray = useRef<string | null>(null);
    useEffect(() => {
        if (!opened && stray.current !== null) {
            session?.assets.remove(stray.current);
            stray.current = null;
            onLetGo();
        }
    }, [opened, session, onLetGo]);
    useEffect(
        () => () => {
            if (stray.current !== null) {
                session?.assets.remove(stray.current);
                stray.current = null;
            }
        },
        [session],
    );
    return stray;
}

/**
 * The Picture pop-over (node-models design 13.7), opened by the Picture line: the pictures this
 * project holds, a field for a picture's address, Choose picture and a drop anywhere on it. What
 * arrives is added through `session.assets.add`; a picture is picked as it is accepted; a model
 * offers Use as model; any other refusal is a chip.
 * @param props - Component props
 * @param props.opened - whether it is open
 * @param props.anchor - the row it opens beside
 * @param props.current - what `node.texture` names now
 * @param props.onPick - called with what `node.texture` should name
 * @param props.onModel - called with a model's id for `node.model`
 * @param props.onClose - closed
 * @returns The pop-over
 */
export function PicturePopover({
    opened,
    anchor,
    current,
    onPick,
    onModel,
    onClose,
}: Readonly<PicturePopoverProps>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<CodedFact | null>(null);
    const [model, setModel] = useState<ArrivedModel | null>(null);
    const [url, setUrl] = useState("");
    const [focused, setFocused] = useState<string | undefined>(undefined);
    const chooser = useRef<HTMLInputElement | null>(null);
    const clearModel = useCallback(() => {
        setModel(null);
    }, []);
    const stray = useStray(session, opened, clearModel);
    const start = useStillOpen(opened);
    if (session === null) {
        return null;
    }
    const refuse = (fact: CodedFact): void => {
        setProblem(fact);
        store.set({ announcement: chipLine(fact) });
    };
    const settle = async (source: AssetSource, given: string, live: () => boolean): Promise<void> => {
        const record = await session.assets.add(source);
        if (!live()) {
            // Closed while it loaded: nothing is picked, and a model waiting for parts is let go,
            // so it never takes files dropped on the canvas later.
            if (session.assets.waiting().some((w) => w.id === record.id)) {
                session.assets.remove(record.id);
            }
            return;
        }
        if (record.kind === "model") {
            // graphty-element read a model, accepted or waiting for its parts: the Shape field's.
            const waits = session.assets.waiting().some((w) => w.id === record.id);
            if (record.state === "accepted" || waits) {
                if (waits) {
                    stray.current = record.id;
                }
                const name = fileStem(record.path ?? given) || "model";
                setModel({ id: record.id, name });
                store.set({ announcement: `Not a picture: ${name} is a 3D model` });
                return;
            }
        } else if (record.state === "accepted") {
            // A URL is named by its address: the element reports it under that ref.
            onPick(typeof source === "string" ? source : record.id);
            return;
        }
        refuse(record.problems[0] ?? { code: "E_MODEL_PARSE", params: {} });
    };
    const add = (source: AssetSource, given: string): void => {
        setBusy(true);
        setProblem(null);
        setModel(null);
        if (stray.current !== null) {
            session.assets.remove(stray.current);
            stray.current = null;
        }
        const live = start();
        settle(source, given, live)
            .catch((error: unknown) => {
                logUnexpected("assets.add", error, []);
                if (live()) {
                    refuse({ code: "E_MODEL_PARSE", params: { message: String(error) } });
                }
            })
            .finally(() => {
                setBusy(false);
            });
    };
    // Newest first.
    const own = session.assets
        .list()
        .filter((r) => r.kind === "image" && r.state === "accepted")
        .reverse();
    const pasted = url.trim();
    const chosen = current === undefined ? undefined : (session.assets.find(current)?.id ?? current);
    const stop = tileStop(
        own.map((r) => r.id),
        focused,
        chosen,
    );

    return (
        <Popout
            opened={opened}
            onOpenChange={(next) => {
                if (!next) {
                    onClose();
                }
            }}
        >
            <Popout.Panel
                width={WIDTH}
                placement="left"
                alignment="start"
                anchorY={anchor}
                header={{ variant: "title", title: "Picture" }}
                closeLabel="Close Picture"
            >
                <Popout.Content>
                    <Stack
                        gap={8}
                        data-testid="picture-popover"
                        onDragOver={(event) => {
                            if (event.dataTransfer.types.includes("Files")) {
                                event.preventDefault();
                            }
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            const [file] = [...event.dataTransfer.files];
                            if (file !== undefined) {
                                add(file, file.name);
                            }
                        }}
                    >
                        {own.length === 0 ? null : (
                            <>
                                <SectionHeading>In this project</SectionHeading>
                                <div // NOSONAR(S6819): an ARIA group naming a list of tile buttons; a fieldset would draw its own border and legend
                                    className="ws-model-list"
                                    role="group"
                                    aria-label="In this project"
                                    onKeyDown={(event) => {
                                        roveTiles(event);
                                    }}
                                >
                                    {own.map((record) => {
                                        const name = pictureName(session, record.id);
                                        return (
                                            <UnstyledButton
                                                key={record.id}
                                                className="ws-gallery-tile ws-picture-tile"
                                                aria-label={name}
                                                aria-pressed={record.id === chosen}
                                                data-tile=""
                                                data-autofocus={record.id === stop ? true : undefined}
                                                tabIndex={record.id === stop ? 0 : -1}
                                                onFocus={() => {
                                                    setFocused(record.id);
                                                }}
                                                onClick={() => {
                                                    onPick(record.id);
                                                }}
                                            >
                                                <Group gap={4} wrap="nowrap">
                                                    <Thumb pictureRef={record.id} />
                                                    <Text size="xs" truncate>
                                                        {name}
                                                    </Text>
                                                </Group>
                                            </UnstyledButton>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                        <AddressForm
                            name="Picture address"
                            submitName="Add picture address"
                            value={url}
                            busy={busy}
                            autofocus={own.length === 0}
                            onChange={setUrl}
                            onDiscard={() => {
                                store.set({ announcement: "Address discarded" });
                            }}
                            onSubmit={() => {
                                if (pasted !== "" && !busy) {
                                    add(pasted, pasted);
                                }
                            }}
                        />
                        <Group gap={4}>
                            <Button
                                size="compact-xs"
                                variant="default"
                                leftSection={<GLYPHS.upload size={12} aria-hidden />}
                                aria-label="Choose picture"
                                aria-disabled={busy || undefined}
                                onClick={() => {
                                    if (!busy) {
                                        chooser.current?.click();
                                    }
                                }}
                            >
                                Choose picture
                            </Button>
                            <FileInput
                                chooser={chooser}
                                accept={ACCEPT}
                                onFiles={([file]) => {
                                    add(file, file.name);
                                }}
                            />
                        </Group>
                        <Text size="xs" c="var(--cm-text-secondary)">
                            Or drop a picture here
                        </Text>
                        {problem === null ? null : (
                            <Group gap={4}>
                                <ModelChip chip={modelChip(problem)} />
                            </Group>
                        )}
                        {model === null ? null : (
                            <Group gap={4} wrap="nowrap">
                                <ModelChip
                                    chip={{ word: "Not a picture", tip: "this file is a 3D model" }}
                                    tone="warning"
                                />
                                <Tooltip label={`Use ${model.name} as model`}>
                                    <Button
                                        size="compact-xs"
                                        variant="default"
                                        aria-label={`Use ${model.name} as model`}
                                        onClick={() => {
                                            // Taken as the model: it is the reader's now, not let go.
                                            stray.current = null;
                                            onModel(model.id);
                                        }}
                                    >
                                        Use as model
                                    </Button>
                                </Tooltip>
                            </Group>
                        )}
                    </Stack>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}
