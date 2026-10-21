import { FileDrop, PanelField, Popout, useRovingFocus } from "@graphty/compact-mantine";
import type { AssetSource, CodedFact, GraphSession } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Stack, Text, TextInput, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { fileStem, pictureName } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { ModelChip } from "./ModelChip";
import { modelChip, modelWords } from "./modelWords";

/** The files the chooser offers; a drop is not filtered, and the element says what arrived. */
const ACCEPT = ".png,.jpg,.jpeg,.webp";

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
        if (record?.kind !== "image" || record.state !== "accepted") {
            setUrl(undefined);
            return undefined;
        }
        const [bytes] = session === null ? [] : [...session.assets.files(record.id).values()];
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
 * The Picture row's field (node-models design 13.7): drawn as every property field, the picture's
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
 * The Picture pop-over (node-models design 13.7), opened by the Picture row: the pictures this
 * project holds, a field for a picture's address, and a drop zone with Choose picture. What
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
    const grid = useRovingFocus<HTMLDivElement>("horizontal", "pressed", false);
    // A model that arrived here and waits for parts is the reader's only once taken as the model:
    // left, it is let go, so it never waits in the session for files dropped later.
    const stray = useRef<string | null>(null);
    const letGo = (): void => {
        if (stray.current !== null) {
            session?.assets.remove(stray.current);
            stray.current = null;
        }
    };
    useEffect(() => {
        if (!opened && stray.current !== null) {
            session?.assets.remove(stray.current);
            stray.current = null;
            setModel(null);
        }
    }, [opened, session]);
    // Also when the row goes with the pop-over (a line just added and taken back on Escape).
    useEffect(
        () => () => {
            if (stray.current !== null) {
                session?.assets.remove(stray.current);
                stray.current = null;
            }
        },
        [session],
    );
    if (session === null) {
        return null;
    }
    const refuse = (fact: CodedFact): void => {
        setProblem(fact);
        store.set({ announcement: modelWords(fact) });
    };
    const add = (source: AssetSource): void => {
        setBusy(true);
        setProblem(null);
        setModel(null);
        letGo();
        let given = "";
        if (typeof source === "string") {
            given = source;
        } else if ("name" in source && typeof source.name === "string") {
            given = source.name;
        }
        const run = async (): Promise<void> => {
            const record = await session.assets.add(source);
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
        run()
            .catch((error: unknown) => {
                refuse({ code: "E_MODEL_PARSE", params: { message: String(error) } });
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
            >
                <Popout.Content>
                    <Stack gap={8}>
                        {own.length === 0 ? null : (
                            <>
                                <Text component="h3" size="xs" fw={600} m={0}>
                                    In this project
                                </Text>
                                <Group
                                    ref={grid.ref}
                                    gap={4}
                                    role="group"
                                    aria-label="In this project"
                                    onKeyDown={grid.onKeyDown}
                                    onFocus={grid.onFocus}
                                >
                                    {own.map((record, index) => {
                                        const name = pictureName(session, record.id);
                                        return (
                                            <Tooltip key={record.id} label={name}>
                                                <UnstyledButton
                                                    aria-label={name}
                                                    aria-pressed={record.id === chosen}
                                                    data-autofocus={index === 0 ? true : undefined}
                                                    className="ws-model-tile"
                                                    onClick={() => {
                                                        onPick(record.id);
                                                    }}
                                                >
                                                    <Group gap={4} wrap="nowrap">
                                                        <Thumb pictureRef={record.id} />
                                                        <Text size="xs">{name}</Text>
                                                    </Group>
                                                </UnstyledButton>
                                            </Tooltip>
                                        );
                                    })}
                                </Group>
                            </>
                        )}
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (pasted !== "" && !busy) {
                                    add(pasted);
                                }
                            }}
                        >
                            <Group gap={4} wrap="nowrap">
                                {/* No tooltip: one opened on focus would take the dialog's first Escape. */}
                                <TextInput
                                    size="xs"
                                    flex={1}
                                    variant="outlined"
                                    aria-label="Picture address"
                                    placeholder="Paste URL"
                                    value={url}
                                    onChange={(event) => {
                                        setUrl(event.currentTarget.value);
                                    }}
                                    onKeyDown={(event) => {
                                        // Escape takes the typing back and says so (decided.md,
                                        // 2026-10-19); an empty field lets it close the pop-over.
                                        if (event.key === "Escape" && url !== "") {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            setUrl("");
                                            store.set({ announcement: "Address discarded" });
                                        }
                                    }}
                                />
                                <Tooltip label="Add picture address">
                                    <ActionIcon
                                        type="submit"
                                        variant="subtle"
                                        size="sm"
                                        aria-label="Add picture address"
                                        // Busy keeps it focusable: a disabled button drops focus to the page.
                                        aria-disabled={pasted === "" || busy || undefined}
                                        data-loading={busy || undefined}
                                    >
                                        <GLYPHS.go size={14} aria-hidden />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                        </form>
                        <FileDrop
                            label="Picture files"
                            chooseLabel="Choose picture"
                            accept={ACCEPT}
                            multiple={false}
                            busy={busy}
                            onFiles={(files) => {
                                add(files.length === 1 ? files[0] : files);
                            }}
                        />
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
