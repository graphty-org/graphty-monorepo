import { FileDrop, Popout } from "@graphty/compact-mantine";
import type { AssetSource, CodedFact, GraphSession } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Stack, Text, TextInput, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { modelName, pictureName } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { ModelChip } from "./ModelChip";
import { modelChip } from "./modelWords";

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
        const record = session?.assets.list().find((r) => r.id === ref && r.kind === "image");
        const [bytes] = record === undefined || session === null ? [] : [...session.assets.files(record.id).values()];
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
 * The Picture row's field (node-models design 13.7): the picture's thumbnail and name, opening the
 * Picture pop-over. Before a picture is chosen it reads "Choose".
 * @param props - Component props
 * @param props.pictureRef - what the layer's `node.texture` names, or undefined
 * @param props.expanded - whether the pop-over is open
 * @param props.onOpen - opens the pop-over
 * @returns The field
 */
export function PictureField({
    pictureRef,
    expanded,
    onOpen,
}: Readonly<{ pictureRef: string | undefined; expanded: boolean; onOpen: () => void }>): React.JSX.Element {
    const { session } = useWorkspace();
    const name = pictureRef === undefined || session === null ? undefined : pictureName(session, pictureRef);
    return (
        <Button
            size="compact-xs"
            variant="default"
            fullWidth
            justify="space-between"
            className="ws-picture-field"
            aria-label={name === undefined ? "Node picture" : `Node picture, ${name}`}
            aria-haspopup="dialog"
            aria-expanded={expanded}
            leftSection={
                pictureRef === undefined ? <GLYPHS.picture size={14} aria-hidden /> : <Thumb pictureRef={pictureRef} />
            }
            rightSection={<GLYPHS.expand size={12} aria-hidden />}
            onClick={onOpen}
        >
            {name ?? "Choose"}
        </Button>
    );
}

/** Props for PicturePopover. */
interface PicturePopoverProps {
    /** Whether it is open. */
    readonly opened: boolean;
    /** The row it opens beside. */
    readonly anchor: React.RefObject<HTMLElement | null>;
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
 * @param props.onPick - called with what `node.texture` should name
 * @param props.onModel - called with a model's id for `node.model`
 * @param props.onClose - closed
 * @returns The pop-over
 */
export function PicturePopover({
    opened,
    anchor,
    onPick,
    onModel,
    onClose,
}: Readonly<PicturePopoverProps>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<CodedFact | null>(null);
    const [model, setModel] = useState<ArrivedModel | null>(null);
    const [url, setUrl] = useState("");
    if (session === null) {
        return null;
    }
    const add = (source: AssetSource): void => {
        setBusy(true);
        setProblem(null);
        setModel(null);
        const run = async (): Promise<void> => {
            const record = await session.assets.add(source);
            if (record.kind === "model") {
                // graphty-element read a model, accepted or waiting for its parts: the Shape field's.
                const waits = session.assets.waiting().some((w) => w.id === record.id);
                if (record.state === "accepted" || waits) {
                    setModel({ id: record.id, name: modelName(session, record.id) });
                    return;
                }
            } else if (record.state === "accepted") {
                // A URL is named by its address: the element reports it under that ref.
                onPick(typeof source === "string" ? source : record.id);
                return;
            }
            setProblem(record.problems[0] ?? { code: "E_MODEL_PARSE", params: {} });
        };
        run()
            .catch((error: unknown) => {
                setProblem({ code: "E_MODEL_PARSE", params: { message: String(error) } });
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
                                <Text size="xs" fw={600}>
                                    In this project
                                </Text>
                                <Group gap={4} role="group" aria-label="In this project">
                                    {own.map((record, index) => {
                                        const name = pictureName(session, record.id);
                                        return (
                                            <Tooltip key={record.id} label={name}>
                                                <UnstyledButton
                                                    aria-label={name}
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
                                if (pasted !== "") {
                                    add(pasted);
                                }
                            }}
                        >
                            <Group gap={4} wrap="nowrap">
                                <Tooltip label="Picture address">
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
                                            // Escape takes the typing back (decided.md, 2026-10-19); an
                                            // empty field lets it close the pop-over.
                                            if (event.key === "Escape" && url !== "") {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                setUrl("");
                                            }
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip label="Add picture address">
                                    <ActionIcon
                                        type="submit"
                                        variant="subtle"
                                        size="sm"
                                        aria-label="Add picture address"
                                        disabled={pasted === ""}
                                        loading={busy}
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
                            disabled={busy}
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
                                <ModelChip chip={{ word: "Model", tip: "this file is a 3D model" }} tone="warning" />
                                <Tooltip label={`Use ${model.name} as model`}>
                                    <Button
                                        size="compact-xs"
                                        variant="default"
                                        aria-label={`Use ${model.name} as model`}
                                        onClick={() => {
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
