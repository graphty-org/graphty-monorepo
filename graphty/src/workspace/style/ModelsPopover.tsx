import { FileDrop, Popout } from "@graphty/compact-mantine";
import type { AssetSource, CodedFact } from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Badge,
    Button,
    Group,
    Image,
    Stack,
    Text,
    TextInput,
    Tooltip,
    UnstyledButton,
} from "@mantine/core";
import React, { useState } from "react";

import { filesOf, modelName, offerFirst, readDrop } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { modelChipWord, modelWords } from "./modelWords";
import { ModelGlyph } from "./ValueField";

/** The files the chooser offers; the element decides what they are. */
const ACCEPT = ".glb,.gltf,.bin,.obj,.mtl,.stl,.ply,.zip,.png,.jpg,.jpeg,.webp";

/** The pop-over's width: the Shape grid's, which it replaces. */
const WIDTH = 240;

/** Props for ModelsPopover. */
interface ModelsPopoverProps {
    /** Whether it is open. */
    readonly opened: boolean;
    /** The row it opens beside. */
    readonly anchor: React.RefObject<HTMLElement | null>;
    /**
     * Called with what the layer's `node.model` should name: an asset id, a sample's id, or a
     * pasted URL (kept by URL in the project). Also called for a model waiting for parts.
     */
    readonly onPick: (ref: string) => void;
    /** Called with a picture's asset id when the reader takes a lone picture as the layer's picture. */
    readonly onPicture: (ref: string) => void;
    /** Back to the Shape grid. */
    readonly onBack: () => void;
    /** Closed, by Escape or its close button. */
    readonly onClose: () => void;
}

/** A picture that arrived where a model was expected: its asset id and its name. */
interface Picture {
    readonly id: string;
    readonly name: string;
}

/**
 * A file's name without its extension.
 * @param name - the file name.
 * @returns the name.
 */
function stem(name: string): string {
    return name.replace(/\.[^.]*$/, "");
}

/**
 * The files a chooser gave, by folder path when a folder was chosen, as `session.assets.add` takes them.
 * @param files - the chosen files.
 * @returns the source.
 */
function chosenSource(files: readonly File[]): AssetSource {
    return files.some((f) => f.webkitRelativePath !== "")
        ? { files: new Map(files.map((f) => [f.webkitRelativePath || f.name, f])) }
        : [...files];
}

/**
 * The Models pop-over (node-models design 13.2), opened by the Shape grid's Model... tile in the
 * grid's place: graphty-element's samples, the models this project holds, a field for a model's
 * address, and a drop zone with Choose files and Folder. What arrives goes first to the models
 * waiting for parts (`session.assets.offer`); a model is picked as it is accepted, or as it waits
 * for parts; a lone picture offers Use as picture; any other refusal is a chip.
 * @param props - Component props
 * @param props.opened - whether it is open
 * @param props.anchor - the row it opens beside
 * @param props.onPick - called with what `node.model` should name
 * @param props.onPicture - called with a picture's id for `node.texture`
 * @param props.onBack - back to the Shape grid
 * @param props.onClose - closed
 * @returns The pop-over
 */
export function ModelsPopover({
    opened,
    anchor,
    onPick,
    onPicture,
    onBack,
    onClose,
}: Readonly<ModelsPopoverProps>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<CodedFact | null>(null);
    const [picture, setPicture] = useState<Picture | null>(null);
    const [url, setUrl] = useState("");
    if (session === null) {
        return null;
    }
    const add = (source: AssetSource, files: readonly File[]): void => {
        setBusy(true);
        setProblem(null);
        setPicture(null);
        const run = async (): Promise<void> => {
            const { supplied, rest } = await offerFirst(session, source, files);
            if (rest === null) {
                store.set({ announcement: supplied.map((s) => `${s.fileName} added`).join(", ") });
                return;
            }
            const record = await session.assets.add(rest);
            if (record.state === "accepted" && record.kind === "image") {
                setPicture({ id: record.id, name: stem(record.path ?? files[0]?.name ?? "picture") });
                return;
            }
            const waits = session.assets.waiting().some((w) => w.id === record.id);
            if (record.state === "accepted" || waits) {
                // A URL is named by its address, accepted or waiting: the element reports it under that ref.
                onPick(typeof rest === "string" ? rest : record.id);
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
    const samples = session.catalog.models();
    // Newest first.
    const own = session.assets
        .list()
        .filter((r) => r.kind === "model" && r.state === "accepted")
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
                header={{ variant: "title", title: "Models" }}
                actions={[
                    {
                        id: "back",
                        icon: <GLYPHS.back size={14} aria-hidden />,
                        label: "Back to shapes",
                        onClick: onBack,
                    },
                ]}
            >
                <Popout.Content>
                    <Stack
                        gap={8}
                        onKeyDown={(event) => {
                            if (event.altKey && event.key === "ArrowLeft") {
                                event.preventDefault();
                                onBack();
                            }
                        }}
                    >
                        <Text size="xs" fw={600}>
                            Samples
                        </Text>
                        <Group gap={4} role="group" aria-label="Samples">
                            {samples.map((sample, index) => (
                                <Tooltip key={sample.id} label={sample.plainName}>
                                    <UnstyledButton
                                        aria-label={sample.plainName}
                                        data-autofocus={index === 0 ? true : undefined}
                                        className="ws-model-tile"
                                        onClick={() => {
                                            onPick(sample.id);
                                        }}
                                    >
                                        <Stack gap={0} align="center" w={52}>
                                            <Image src={sample.thumbnail} alt="" w={40} h={40} />
                                            <Text size="xs">{sample.plainName}</Text>
                                        </Stack>
                                    </UnstyledButton>
                                </Tooltip>
                            ))}
                        </Group>
                        {own.length === 0 ? null : (
                            <>
                                <Text size="xs" fw={600}>
                                    In this project
                                </Text>
                                <Group gap={4} role="group" aria-label="In this project">
                                    {own.map((record) => {
                                        const name = modelName(session, record.id);
                                        return (
                                            <Tooltip key={record.id} label={name}>
                                                <Button
                                                    size="compact-xs"
                                                    variant="subtle"
                                                    color="dark"
                                                    aria-label={name}
                                                    leftSection={<ModelGlyph />}
                                                    onClick={() => {
                                                        onPick(record.id);
                                                    }}
                                                >
                                                    {name}
                                                </Button>
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
                                    add(pasted, []);
                                }
                            }}
                        >
                            <Group gap={4} wrap="nowrap">
                                <Tooltip label="Model address">
                                    <TextInput
                                        size="xs"
                                        flex={1}
                                        variant="outlined"
                                        aria-label="Model address"
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
                                <Tooltip label="Add model address">
                                    <ActionIcon
                                        type="submit"
                                        variant="subtle"
                                        size="sm"
                                        aria-label="Add model address"
                                        disabled={pasted === ""}
                                        loading={busy}
                                    >
                                        <GLYPHS.go size={14} aria-hidden />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                        </form>
                        <FileDrop
                            label="Model files"
                            chooseLabel="Choose files"
                            chooseName="Choose model files"
                            folderLabel="Folder"
                            folderName="Choose model folder"
                            accept={ACCEPT}
                            disabled={busy}
                            onFiles={(files, transfer) => {
                                if (transfer === undefined) {
                                    add(chosenSource(files), files);
                                    return;
                                }
                                // Read during the drop: the browser empties the transfer after.
                                void readDrop(transfer).then((dropped) => {
                                    add(dropped.source, filesOf(dropped.source));
                                });
                            }}
                        />
                        {problem === null ? null : (
                            <Group gap={4}>
                                <Tooltip label={modelWords(problem)}>
                                    <Badge size="sm" color="red" variant="light" role="status">
                                        {modelChipWord(problem)}
                                    </Badge>
                                </Tooltip>
                            </Group>
                        )}
                        {picture === null ? null : (
                            <Group gap={4} wrap="nowrap">
                                <Tooltip label="this file is a picture">
                                    <Badge size="sm" color="yellow" variant="light" role="status">
                                        Not a model
                                    </Badge>
                                </Tooltip>
                                <Tooltip label={`Use ${picture.name} as picture`}>
                                    <Button
                                        size="compact-xs"
                                        variant="default"
                                        aria-label={`Use ${picture.name} as picture`}
                                        onClick={() => {
                                            onPicture(picture.id);
                                        }}
                                    >
                                        Use as picture
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
