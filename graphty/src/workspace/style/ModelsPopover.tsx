import { FileDrop, Popout, useRovingFocus } from "@graphty/compact-mantine";
import type { AssetSource, CodedFact } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Image, Stack, Text, TextInput, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useState } from "react";

import { filesOf, fileStem, modelName, offerFirst, readDrop } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { ModelChip } from "./ModelChip";
import { modelChip, modelWords } from "./modelWords";
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
    /** What the layer's `node.model` names now, so its sample or project model reads as chosen. */
    readonly current?: string;
    /**
     * Called with what the layer's `node.model` should name: an asset id, a sample's id, or a
     * pasted URL (kept by URL in the project). Also called for a model waiting for parts, with
     * `waiting` true, so its Parts pop-over opens in this one's place.
     */
    readonly onPick: (ref: string, waiting: boolean) => void;
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
 * A pop-over's section label: a heading under the pop-over's own title.
 * @param props - Component props
 * @param props.children - its words
 * @returns The heading
 */
function SectionHeading({ children }: Readonly<{ children: string }>): React.JSX.Element {
    return (
        <Text component="h3" size="xs" fw={600} m={0}>
            {children}
        </Text>
    );
}

/**
 * The Models pop-over (node-models design 13.2), opened by the Shape grid's Model... tile in the
 * grid's place: graphty-element's samples, the models this project holds, a field for a model's
 * address, and a drop zone with Choose files and Folder. What arrives goes first to the models
 * waiting for parts (`session.assets.offer`); a model is picked as it is accepted, or as it waits
 * for parts; a lone picture offers Use as picture; any other refusal is a chip. Samples and the
 * project's models are one Tab stop each, walked with the arrows.
 * @param props - Component props
 * @param props.opened - whether it is open
 * @param props.anchor - the row it opens beside
 * @param props.current - what `node.model` names now
 * @param props.onPick - called with what `node.model` should name
 * @param props.onPicture - called with a picture's id for `node.texture`
 * @param props.onBack - back to the Shape grid
 * @param props.onClose - closed
 * @returns The pop-over
 */
export function ModelsPopover({
    opened,
    anchor,
    current,
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
    // The address last added, for Retry on "Not reached".
    const [tried, setTried] = useState<string | null>(null);
    // Arrows stop at the edges of a grid (decided.md); each grid is entered at its chosen tile.
    const samplesGrid = useRovingFocus<HTMLDivElement>("horizontal", "pressed", false);
    const ownGrid = useRovingFocus<HTMLDivElement>("horizontal", "pressed", false);
    if (session === null) {
        return null;
    }
    const refuse = (fact: CodedFact): void => {
        setProblem(fact);
        store.set({ announcement: modelWords(fact) });
    };
    const add = (source: AssetSource, files: readonly File[]): void => {
        setBusy(true);
        setProblem(null);
        setPicture(null);
        setTried(typeof source === "string" ? source : null);
        const run = async (): Promise<void> => {
            const { supplied, rest } = await offerFirst(session, source, files);
            if (rest === null) {
                store.set({ announcement: supplied.map((s) => `${s.fileName} added`).join(", ") });
                return;
            }
            const record = await session.assets.add(rest);
            if (record.state === "accepted" && record.kind === "image") {
                const name = fileStem(record.path ?? files[0]?.name ?? "") || "picture";
                setPicture({ id: record.id, name });
                store.set({ announcement: `Not a model: ${name} is a picture` });
                return;
            }
            const waits = session.assets.waiting().some((w) => w.id === record.id);
            if (record.state === "accepted" || waits) {
                // A URL is named by its address, accepted or waiting: the element reports it under that ref.
                onPick(typeof rest === "string" ? rest : record.id, waits);
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
    const samples = session.catalog.models();
    // Newest first.
    const own = session.assets
        .list()
        .filter((r) => r.kind === "model" && r.state === "accepted")
        .reverse();
    const chosen = current === undefined ? undefined : (session.assets.find(current)?.id ?? current);
    const pasted = url.trim();
    const suggested = problem?.code === "E_MODEL_WEB_PAGE" ? problem.params.suggested : undefined;

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
                        placement: "start",
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
                        <SectionHeading>Samples</SectionHeading>
                        <Group
                            ref={samplesGrid.ref}
                            gap={4}
                            role="group"
                            aria-label="Samples"
                            onKeyDown={samplesGrid.onKeyDown}
                            onFocus={samplesGrid.onFocus}
                        >
                            {samples.map((sample, index) => (
                                <Tooltip key={sample.id} label={sample.plainName}>
                                    <UnstyledButton
                                        aria-label={sample.plainName}
                                        aria-pressed={sample.id === chosen}
                                        data-autofocus={index === 0 ? true : undefined}
                                        className="ws-model-tile"
                                        onClick={() => {
                                            onPick(sample.id, false);
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
                                <SectionHeading>In this project</SectionHeading>
                                <Group
                                    ref={ownGrid.ref}
                                    gap={4}
                                    role="group"
                                    aria-label="In this project"
                                    onKeyDown={ownGrid.onKeyDown}
                                    onFocus={ownGrid.onFocus}
                                >
                                    {own.map((record) => {
                                        const name = modelName(session, record.id);
                                        return (
                                            <Tooltip key={record.id} label={name}>
                                                <Button
                                                    size="compact-xs"
                                                    variant="subtle"
                                                    color="dark"
                                                    aria-label={name}
                                                    aria-pressed={record.id === chosen}
                                                    leftSection={
                                                        record.id === chosen ? (
                                                            <GLYPHS.check size={14} aria-hidden />
                                                        ) : (
                                                            <ModelGlyph />
                                                        )
                                                    }
                                                    onClick={() => {
                                                        onPick(record.id, false);
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
                                if (pasted !== "" && !busy) {
                                    add(pasted, []);
                                }
                            }}
                        >
                            <Group gap={4} wrap="nowrap">
                                {/* No tooltip: one opened on focus would take the dialog's first Escape. */}
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
                                <Tooltip label="Add model address">
                                    <ActionIcon
                                        type="submit"
                                        variant="subtle"
                                        size="sm"
                                        aria-label="Add model address"
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
                            label="Model files"
                            chooseLabel="Choose files"
                            chooseName="Choose files, model"
                            folderLabel="Folder"
                            folderName="Folder, model"
                            accept={ACCEPT}
                            busy={busy}
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
                                <ModelChip chip={modelChip(problem)} />
                                {problem.code === "E_MODEL_FETCH" && tried !== null ? (
                                    <Button
                                        size="compact-xs"
                                        variant="default"
                                        onClick={() => {
                                            add(tried, []);
                                        }}
                                    >
                                        Retry
                                    </Button>
                                ) : null}
                                {typeof suggested === "string" ? (
                                    <Button
                                        size="compact-xs"
                                        variant="default"
                                        onClick={() => {
                                            setUrl(suggested);
                                            setProblem(null);
                                        }}
                                    >
                                        Use file address
                                    </Button>
                                ) : null}
                            </Group>
                        )}
                        {picture === null ? null : (
                            <Group gap={4} wrap="nowrap">
                                <ModelChip
                                    chip={{ word: "Not a model", tip: "this file is a picture" }}
                                    tone="warning"
                                />
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
