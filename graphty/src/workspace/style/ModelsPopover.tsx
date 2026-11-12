import { Popout } from "@graphty/compact-mantine";
import { ActionIcon, Button, Group, Stack, Text, TextInput, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useState } from "react";

import { modelName, useModelPicture } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { roveTiles, tileStop } from "./tileRoving";
import { CUSTOM_MODEL } from "./words";

/** The pop-over's width: the Shape list's, which it replaces. */
const WIDTH = 240;

/** The tile grids' columns (`.ws-gallery-grid`). */
const COLUMNS = 2;

/** A tile picture's width in CSS pixels: half the pop-over. */
const TILE_PX = 104;

/** Props for ModelsPopover. */
interface ModelsPopoverProps {
    /** Whether it is open. */
    readonly opened: boolean;
    /** The row it opens beside. */
    readonly anchor: React.RefObject<HTMLElement | null>;
    /** What the layer's `node.model` names now, so its sample or project model reads as chosen. */
    readonly current?: string;
    /** Called with what the layer's `node.model` should name: an asset id or a sample's id. */
    readonly onPick: (ref: string) => void;
    /** Custom model...: the Load custom model dialog opens in the pop-over's place. */
    readonly onCustom: () => void;
    /** Back to the Shape list. */
    readonly onBack: () => void;
    /** Closed, by Escape or its close button. */
    readonly onClose: () => void;
}

/** What a tile carries for the grid's keyboard walk. */
type TileProps = ReturnType<typeof tileProps>;

/**
 * A tile's roving and pressed state.
 * @param id - the tile's id.
 * @param stop - the grid's one Tab stop.
 * @param chosen - what the layer names.
 * @param autofocus - the tile focus goes to on open.
 * @param setFocused - notes the focused tile.
 * @returns the props.
 */
function tileProps(
    id: string,
    stop: string | undefined,
    chosen: string | undefined,
    autofocus: string | undefined,
    setFocused: (id: string) => void,
): {
    "data-tile": string;
    "aria-pressed": boolean;
    "data-autofocus": true | undefined;
    tabIndex: number;
    onFocus: () => void;
} {
    return {
        "data-tile": "",
        "aria-pressed": id === chosen,
        "data-autofocus": id === autofocus ? true : undefined,
        tabIndex: id === stop ? 0 : -1,
        onFocus: () => {
            setFocused(id);
        },
    };
}

/**
 * A model of the project as a tile: its picture drawn by graphty-element, else the cube, and its name.
 * @param props - Component props
 * @param props.id - the asset id
 * @param props.name - its name
 * @param props.tile - its roving props
 * @param props.onPick - picks it
 * @returns The tile
 */
function ProjectTile({
    id,
    name,
    tile,
    onPick,
}: Readonly<{ id: string; name: string; tile: TileProps; onPick: () => void }>): React.JSX.Element {
    const picture = useModelPicture(id, TILE_PX);
    return (
        <UnstyledButton className="ws-gallery-tile" aria-label={name} {...tile} onClick={onPick}>
            {picture === undefined ? (
                <span className="ws-gallery-picture ws-gallery-empty">
                    <GLYPHS.model size={24} aria-hidden />
                </span>
            ) : (
                <img className="ws-gallery-picture" src={picture} alt="" />
            )}
            <Text size="xs" truncate>
                {name}
            </Text>
        </UnstyledButton>
    );
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
 * The Models pop-over (node-models design 13.2, 14.1), opened by the Shape list's Model... entry in
 * the list's place: graphty-element's samples and the models this project holds, each a picture
 * tile, then Custom model..., which opens the Load custom model dialog. Each grid is one Tab stop,
 * walked with the arrows.
 * @param props - Component props
 * @param props.opened - whether it is open
 * @param props.anchor - the row it opens beside
 * @param props.current - what `node.model` names now
 * @param props.onPick - called with what `node.model` should name
 * @param props.onCustom - opens the Load custom model dialog
 * @param props.onBack - back to the Shape list
 * @param props.onClose - closed
 * @returns The pop-over
 */
export function ModelsPopover({
    opened,
    anchor,
    current,
    onPick,
    onCustom,
    onBack,
    onClose,
}: Readonly<ModelsPopoverProps>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const [focused, setFocused] = useState<string | undefined>(undefined);
    if (session === null) {
        return null;
    }
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
    const tile = (id: string, stop: string | undefined): TileProps =>
        tileProps(id, stop, chosen, autofocus, setFocused);

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
                                        onPick(sample.id);
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
                                <div // NOSONAR(S6819): an ARIA group naming a grid of tile buttons; a fieldset would draw its own border and legend
                                    className="ws-gallery-grid"
                                    role="group"
                                    aria-label="In this project"
                                    onKeyDown={(event) => {
                                        roveTiles(event, COLUMNS);
                                    }}
                                >
                                    {own.map((record) => (
                                        <ProjectTile
                                            key={record.id}
                                            id={record.id}
                                            name={modelName(session, record.id)}
                                            tile={tile(record.id, ownStop)}
                                            onPick={() => {
                                                onPick(record.id);
                                            }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                        <Button
                            size="compact-xs"
                            variant="default"
                            fullWidth
                            leftSection={<GLYPHS.upload size={12} aria-hidden />}
                            aria-haspopup="dialog"
                            onClick={onCustom}
                        >
                            {CUSTOM_MODEL.button}
                        </Button>
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
    /** The field's placeholder. Default "Paste URL". */
    readonly placeholder?: string;
    /** Why the address was refused, shown under the field and tied to it. */
    readonly error?: string;
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
 * @param props.placeholder - the field's placeholder
 * @param props.error - why the address was refused
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
    placeholder = "Paste URL",
    error,
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
            <Group gap={4} wrap="nowrap" align="flex-start">
                {/* No tooltip: one opened on focus would take the dialog's first Escape. */}
                <TextInput
                    size="xs"
                    flex={1}
                    aria-label={name}
                    placeholder={placeholder}
                    error={error}
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
