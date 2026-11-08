import { Popout } from "@graphty/compact-mantine";
import { assetFileExtensions } from "@graphty/graphty-element/catalog";
import type { AssetSource, CodedFact } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Stack, Text, TextInput, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useRef, useState } from "react";

import { filesOf, fileStem, modelName, offerFirst, readDrop } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { ModelChip } from "./ModelChip";
import { chipLine, modelChip } from "./modelWords";
import { roveTiles, tileStop } from "./tileRoving";
import { useStillOpen } from "./useStillOpen";

/** The files the chooser offers, as graphty-element reads them; the element decides what they are. */
const MODEL_ACCEPT = assetFileExtensions("model").join(",");

/** The pop-over's width: the Shape list's, which it replaces. */
const WIDTH = 240;

/** The samples grid's columns (`.ws-gallery-grid`). */
const COLUMNS = 2;

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
     * pasted URL. Also called for a model waiting for parts, with `waiting` true, so its Parts
     * pop-over opens in this one's place.
     */
    readonly onPick: (ref: string, waiting: boolean) => void;
    /** Called with a picture's asset id when the reader takes a lone picture as the layer's picture. */
    readonly onPicture: (ref: string) => void;
    /** Back to the Shape list. */
    readonly onBack: () => void;
    /** Closed, by Escape or its close button. */
    readonly onClose: () => void;
}

/** A picture that arrived where a model was expected: its asset id and its name. */
interface Arrived {
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
export function SectionHeading({ children }: Readonly<{ children: string }>): React.JSX.Element {
    return (
        <Text component="h3" size="xs" fw={600} m={0}>
            {children}
        </Text>
    );
}

/**
 * A hidden file chooser that a Button clicks. It stays in the page, unlike compact-mantine's
 * `pickFiles`, so its files can be chosen by `userEvent.upload` in a test, and it chooses a folder
 * (`webkitdirectory`), which `pickFiles` does not offer. A folder's files carry
 * their paths in `webkitRelativePath`. A stand-in until compact-mantine offers a folder and a
 * testable chooser (issue #6233).
 * @param props - Component props
 * @param props.chooser - set to the input, which a button clicks
 * @param props.accept - the files offered, when not a folder
 * @param props.multiple - whether several files may be chosen
 * @param props.folder - chooses a folder
 * @param props.onFiles - called with the chosen files
 * @returns The input
 */
export function FileInput({
    chooser,
    accept,
    multiple = false,
    folder = false,
    onFiles,
}: Readonly<{
    chooser: React.RefObject<HTMLInputElement | null>;
    accept?: string;
    multiple?: boolean;
    folder?: boolean;
    onFiles: (files: File[]) => void;
}>): React.JSX.Element {
    return (
        <input
            ref={(node) => {
                if (folder) {
                    node?.setAttribute("webkitdirectory", "");
                }
                chooser.current = node;
            }}
            type="file"
            hidden
            tabIndex={-1}
            aria-hidden
            accept={folder ? undefined : accept}
            multiple={multiple || folder}
            data-folder={folder ? "" : undefined}
            onChange={(event) => {
                const files = [...(event.currentTarget.files ?? [])];
                event.currentTarget.value = "";
                if (files.length > 0) {
                    onFiles(files);
                }
            }}
        />
    );
}

/**
 * The Models pop-over (node-models design 13.2), opened by the Shape list's Model... entry in the
 * list's place: graphty-element's samples, the models this project holds, a field for a model's
 * address, Choose model files and Choose model folder, and a drop anywhere on it. What arrives goes
 * first to the models waiting for parts (`session.assets.offer`); a model is picked as it is
 * accepted, or as it waits for parts; a lone picture offers Use as picture; any other refusal is a
 * chip. Samples and the project's models are one Tab stop each, walked with the arrows.
 * @param props - Component props
 * @param props.opened - whether it is open
 * @param props.anchor - the row it opens beside
 * @param props.current - what `node.model` names now
 * @param props.onPick - called with what `node.model` should name
 * @param props.onPicture - called with a picture's id for `node.texture`
 * @param props.onBack - back to the Shape list
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
    const [picture, setPicture] = useState<Arrived | null>(null);
    const [url, setUrl] = useState("");
    // The address last added, for Retry on "Not reached".
    const [tried, setTried] = useState<string | null>(null);
    const [focused, setFocused] = useState<string | undefined>(undefined);
    const chooser = useRef<HTMLInputElement | null>(null);
    const folder = useRef<HTMLInputElement | null>(null);
    const start = useStillOpen(opened);
    if (session === null) {
        return null;
    }
    const refuse = (fact: CodedFact): void => {
        setProblem(fact);
        store.set({ announcement: chipLine(fact) });
    };
    const settle = async (source: AssetSource, files: readonly File[], live: () => boolean): Promise<void> => {
        const { supplied, rest } = await offerFirst(session, source, files);
        if (rest === null) {
            store.set({ announcement: supplied.map((s) => `${s.fileName} added`).join(", ") });
            return;
        }
        const record = await session.assets.add(rest);
        if (!live()) {
            // Closed while it loaded: the reader did not take it, so it never waits for parts.
            if (session.assets.waiting().some((w) => w.id === record.id)) {
                session.assets.remove(record.id);
            }
            return;
        }
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
    const add = (source: AssetSource, files: readonly File[]): void => {
        setBusy(true);
        setProblem(null);
        setPicture(null);
        setTried(typeof source === "string" ? source : null);
        const live = start();
        settle(source, files, live)
            .catch((error: unknown) => {
                if (live()) {
                    refuse({ code: "E_MODEL_PARSE", params: { message: String(error) } });
                }
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
    const sampleStop = tileStop(
        samples.map((s) => s.id),
        focused,
        chosen,
    );
    const ownStop = tileStop(
        own.map((r) => r.id),
        focused,
        chosen,
    );
    // Opening, focus goes to the chosen tile, else the first sample.
    const autofocus = own.some((r) => r.id === chosen) ? chosen : (sampleStop ?? samples[0]?.id);
    const pasted = url.trim();
    const suggested = problem?.code === "E_MODEL_WEB_PAGE" ? problem.params.suggested : undefined;
    const tile = (
        id: string,
        stop: string | undefined,
    ): {
        "data-tile": string;
        "aria-pressed": boolean;
        "data-autofocus": true | undefined;
        tabIndex: number;
        onFocus: () => void;
    } => ({
        "data-tile": "",
        "aria-pressed": id === chosen,
        "data-autofocus": id === autofocus ? true : undefined,
        tabIndex: id === stop ? 0 : -1,
        onFocus: () => {
            setFocused(id);
        },
    });

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
                closeLabel="Close Models"
                // The back action sits at the header's end: compact-mantine has no leading header
                // action yet (issue #6233).
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
                        data-testid="models-popover"
                        onKeyDown={(event) => {
                            if (event.altKey && event.key === "ArrowLeft") {
                                event.preventDefault();
                                onBack();
                            }
                        }}
                        onDragOver={(event) => {
                            if (event.dataTransfer.types.includes("Files")) {
                                event.preventDefault();
                            }
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            // Read during the drop: the browser empties the transfer after.
                            void readDrop(event.dataTransfer).then((dropped) => {
                                add(dropped.source, filesOf(dropped.source));
                            });
                        }}
                    >
                        <SectionHeading>Samples</SectionHeading>
                        <div // NOSONAR(S6819): an ARIA group naming a grid of tile buttons; a fieldset would draw its own border and legend
                            className="ws-gallery-grid"
                            role="group"
                            aria-label="Samples"
                            onKeyDown={(event) => {
                                roveTiles(event, COLUMNS);
                            }}
                        >
                            {samples.map((sample) => (
                                <UnstyledButton
                                    key={sample.id}
                                    className="ws-gallery-tile"
                                    aria-label={sample.plainName}
                                    {...tile(sample.id, sampleStop)}
                                    onClick={() => {
                                        onPick(sample.id, false);
                                    }}
                                >
                                    <img className="ws-gallery-picture" src={sample.thumbnail} alt="" />
                                    <Text size="xs" truncate>
                                        {sample.plainName}
                                    </Text>
                                </UnstyledButton>
                            ))}
                        </div>
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
                                        const name = modelName(session, record.id);
                                        return (
                                            <Button
                                                key={record.id}
                                                size="compact-xs"
                                                variant="subtle"
                                                color="dark"
                                                justify="start"
                                                aria-label={name}
                                                {...tile(record.id, ownStop)}
                                                leftSection={
                                                    record.id === chosen ? (
                                                        <GLYPHS.check size={14} aria-hidden />
                                                    ) : (
                                                        <GLYPHS.model size={14} aria-hidden />
                                                    )
                                                }
                                                onClick={() => {
                                                    onPick(record.id, false);
                                                }}
                                            >
                                                {name}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                        <AddressForm
                            name="Model address"
                            submitName="Add model address"
                            value={url}
                            busy={busy}
                            onChange={setUrl}
                            onDiscard={() => {
                                store.set({ announcement: "Address discarded" });
                            }}
                            onSubmit={() => {
                                if (pasted !== "" && !busy) {
                                    add(pasted, []);
                                }
                            }}
                        />
                        <Group gap={4}>
                            <Button
                                size="compact-xs"
                                variant="default"
                                leftSection={<GLYPHS.upload size={12} aria-hidden />}
                                aria-label="Choose model files"
                                aria-disabled={busy || undefined}
                                onClick={() => {
                                    if (!busy) {
                                        chooser.current?.click();
                                    }
                                }}
                            >
                                Choose files
                            </Button>
                            <Button
                                size="compact-xs"
                                variant="default"
                                leftSection={<GLYPHS.folder size={12} aria-hidden />}
                                aria-label="Choose model folder"
                                aria-disabled={busy || undefined}
                                onClick={() => {
                                    if (!busy) {
                                        folder.current?.click();
                                    }
                                }}
                            >
                                Folder
                            </Button>
                            <FileInput
                                chooser={chooser}
                                accept={MODEL_ACCEPT}
                                multiple
                                onFiles={(files) => {
                                    add(chosenSource(files), files);
                                }}
                            />
                            <FileInput
                                chooser={folder}
                                folder
                                onFiles={(files) => {
                                    add(chosenSource(files), files);
                                }}
                            />
                        </Group>
                        <Text size="xs" c="var(--cm-text-secondary)">
                            Or drop files here
                        </Text>
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

/** Props for AddressForm. */
interface AddressFormProps {
    /** The field's accessible name, "Model address". */
    readonly name: string;
    /** The submit button's accessible name, "Add model address". */
    readonly submitName: string;
    readonly value: string;
    readonly busy: boolean;
    readonly autofocus?: boolean;
    readonly onChange: (value: string) => void;
    /** Says that Escape took the typing back. */
    readonly onDiscard: () => void;
    readonly onSubmit: () => void;
}

/**
 * A pasted address and its go button. Escape with typed text takes it back and says so (decided.md,
 * 2026-10-19); in an empty field it closes the pop-over.
 * @param props - Component props
 * @param props.name - the field's name
 * @param props.submitName - the go button's name
 * @param props.value - the typed address
 * @param props.busy - an add is under way
 * @param props.autofocus - takes focus when its pop-over opens
 * @param props.onChange - the typing
 * @param props.onDiscard - says Escape took the typing back
 * @param props.onSubmit - Enter or the go button
 * @returns The form
 */
export function AddressForm({
    name,
    submitName,
    value,
    busy,
    autofocus = false,
    onChange,
    onDiscard,
    onSubmit,
}: Readonly<AddressFormProps>): React.JSX.Element {
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            <Group gap={4} wrap="nowrap">
                {/* No tooltip: one opened on focus would take the dialog's first Escape. */}
                <TextInput
                    size="xs"
                    flex={1}
                    aria-label={name}
                    placeholder="Paste URL"
                    data-autofocus={autofocus ? true : undefined}
                    value={value}
                    onChange={(event) => {
                        onChange(event.currentTarget.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape" && value !== "") {
                            event.preventDefault();
                            event.stopPropagation();
                            onChange("");
                            onDiscard();
                        }
                    }}
                />
                <Tooltip label={submitName}>
                    <ActionIcon
                        type="submit"
                        variant="subtle"
                        size="sm"
                        aria-label={submitName}
                        // Busy keeps it focusable: a disabled button drops focus to the page.
                        aria-disabled={value.trim() === "" || busy || undefined}
                        data-loading={busy || undefined}
                    >
                        <GLYPHS.go size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </form>
    );
}
