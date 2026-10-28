import {
    colorWord,
    CompactColorInput,
    ControlSection,
    FieldRow,
    FileSource,
    PanelField,
    PanelLabelsProvider,
    ResetButton,
} from "@graphty/compact-mantine";
import {
    DEFAULT_BACKGROUND_COLOR,
    type GraphBackgroundConfig,
    type Lighting,
    LIGHTING_VALUES,
} from "@graphty/graphty-element/schema";
import type { GraphSession, GraphSettingKey } from "@graphty/graphty-element/session";
import { ActionIcon, Menu, Select, Stack, Switch, Text, Tooltip } from "@mantine/core";
import React, { useLayoutEffect, useRef, useState } from "react";

import { useSizeBound } from "../frame/useSizeBound";
import { GLYPHS } from "../glyphs";
import { BackgroundShader, ShaderSection } from "../settings/ShaderSettings";
import { readDataUrl } from "../start/open";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { BACKGROUND_SECTION_WORDS, BACKGROUND_WORDS } from "../style/words";
import { settingsNotInEffect, SHOWN_SETTINGS } from "./settingsInEffect";

const LIGHTING_WORDS: Readonly<Record<Lighting, string>> = {
    studio: "Studio",
    headlight: "Headlight",
    matte: "Matte",
    flat: "Flat",
};

/**
 * Keeps focus in the panel when the row holding it is hidden because its setting stopped
 * changing the drawing (the view changed): focus moves to the next row still shown, and the
 * change is said once.
 * @param hidden - the hidden settings' keys.
 * @param store - the chrome store, which says the change.
 * @returns a ref for the rows' container and a focus handler that remembers the focused row.
 */
function useFocusPastHidden(
    hidden: readonly GraphSettingKey[],
    store: WorkspaceStore,
): { ref: React.RefObject<HTMLDivElement | null>; onFocus: (event: React.FocusEvent) => void } {
    const ref = useRef<HTMLDivElement | null>(null);
    const focused = useRef<{ key: GraphSettingKey; next: string | null } | null>(null);
    const key = hidden.join(",");
    useLayoutEffect(() => {
        const was = focused.current;
        if (was === null || !key.split(",").includes(was.key)) {
            return;
        }
        focused.current = null;
        const rows = [...(ref.current?.querySelectorAll<HTMLElement>("[data-setting]") ?? [])];
        const target = rows.find((row) => row.dataset.setting === was.next) ?? rows.at(-1);
        target?.querySelector<HTMLElement>("input, button, [tabindex='0']")?.focus();
        store.set({ announcement: `${SHOWN_SETTINGS[was.key] ?? was.key} applies only in another view` });
    }, [key, store]);
    const onFocus = (event: React.FocusEvent): void => {
        const row = (event.target as HTMLElement).closest<HTMLElement>("[data-setting]");
        const setting = row?.dataset.setting as GraphSettingKey | undefined;
        if (row === null || setting === undefined) {
            return;
        }
        const after = [...(ref.current?.querySelectorAll<HTMLElement>("[data-setting]") ?? [])];
        const next = after[after.indexOf(row) + 1]?.dataset.setting ?? null;
        focused.current = { key: setting, next };
    };
    return { ref, onFocus };
}

/**
 * Graph settings, the right panel with no row selected (tier 3 design section 2.5): Background
 * (a color, an image and a shader, stacked), Lighting, Same size at any depth, Outline width, the
 * Map while the layout draws one, and the label rules. The view (2D or 3D) and the layout live only
 * in the toolbar. A setting is shown only while the element
 * says it changes the drawing in this view. The background is the project's and goes through the
 * session; the rest are the reader's view preferences, kept in the chrome store and handed to the
 * element on its tag (`frame/ElementHost.tsx`), so none records an undo step.
 * @returns The sections
 */
export function GraphSettings(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const allLabelsShown = useWorkspaceState((state) => state.allLabelsShown);
    const labelsAvoid = useWorkspaceState((state) => state.labelsAvoid);
    const sizeBound = useSizeBound(session);
    const sameSizeChosen = useWorkspaceState((state) => state.sameSizeAtAnyDepth);
    const sameSize = sameSizeChosen ?? sizeBound;
    const lighting = useWorkspaceState((state) => state.lighting);
    const outlineWidth = useWorkspaceState((state) => state.outlineWidth);
    const hidden = session === null ? [] : settingsNotInEffect(session);
    const { ref, onFocus } = useFocusPastHidden(hidden, store);
    if (session === null) {
        return null;
    }
    const shows = (key: GraphSettingKey): boolean => !hidden.includes(key);

    return (
        <>
            <BackgroundSection session={session} />
            <ControlSection label="Canvas" collapsible={false} headingLevel={3}>
                <Stack gap={6} ref={ref} onFocus={onFocus}>
                    {shows("lighting") && (
                        <div data-setting="lighting">
                            <Select
                                label="Lighting"
                                size="xs"
                                allowDeselect={false}
                                value={lighting}
                                data={LIGHTING_VALUES.map((value) => ({ value, label: LIGHTING_WORDS[value] }))}
                                onChange={(picked) => {
                                    const next = LIGHTING_VALUES.find((value) => value === picked);
                                    if (next !== undefined) {
                                        store.set({ lighting: next });
                                    }
                                }}
                            />
                        </div>
                    )}
                    {shows("node.depthIndependentSize") && (
                        <div data-setting="node.depthIndependentSize">
                            <Switch
                                size="xs"
                                label="Same size at any depth"
                                // Until the reader sets it, it follows the size binding: say why it
                                // turned on, so the change is never a surprise.
                                description={
                                    sameSizeChosen === null && sizeBound ? "On while node size follows data" : undefined
                                }
                                checked={sameSize}
                                onChange={(event) => {
                                    store.set({ sameSizeAtAnyDepth: event.currentTarget.checked });
                                }}
                            />
                        </div>
                    )}
                    {shows("node.outlineWidth") && (
                        <div data-setting="node.outlineWidth">
                            <PanelLabelsProvider showLabels>
                                <FieldRow
                                    trailing={
                                        outlineWidth !== null &&
                                        outlineWidth !== undefined && (
                                            <ResetButton
                                                label="Outline width"
                                                onClick={() => {
                                                    store.set({ outlineWidth: null });
                                                }}
                                            />
                                        )
                                    }
                                >
                                    <PanelField
                                        label="Outline width"
                                        kind="number"
                                        value={outlineWidth ?? 1}
                                        min={0.1}
                                        max={10}
                                        step={0.1}
                                        decimalScale={1}
                                        onChange={(next) => {
                                            store.set({ outlineWidth: Number(next) });
                                        }}
                                    />
                                </FieldRow>
                            </PanelLabelsProvider>
                            <Text size="xs" c="dimmed">
                                Every outline is drawn at this width. For a ring whose width a layer sets, use Halo.
                            </Text>
                        </div>
                    )}
                </Stack>
            </ControlSection>
            <ControlSection label="Labels" collapsible={false} headingLevel={3}>
                <Stack gap={6}>
                    <Switch
                        size="xs"
                        label="Hide overlapping labels"
                        checked={!allLabelsShown}
                        onChange={(event) => {
                            store.set({ allLabelsShown: !event.currentTarget.checked });
                        }}
                    />
                    <Switch
                        size="xs"
                        label="Move labels off nodes and edges"
                        checked={labelsAvoid}
                        onChange={(event) => {
                            store.set({ labelsAvoid: event.currentTarget.checked });
                        }}
                    />
                </Stack>
            </ControlSection>
            <ShaderSection />
        </>
    );
}

/** A Background row's kind, in the order they are drawn, bottom to top. */
type BackgroundKind = "color" | "image" | "shader";
const BACKGROUND_KINDS: readonly BackgroundKind[] = ["color", "image", "shader"];

/** What the Background section's rows hold; undefined is a row that is not there. */
interface BackgroundParts {
    readonly color: string | undefined;
    readonly image: string | undefined;
    readonly shader: GraphBackgroundConfig["shader"];
}

/**
 * The background a set of rows writes: a skybox when there is an image, else a color, each
 * carrying only the color and the shader its rows hold.
 * @param parts - the rows
 * @param parts.color - the Color row's color
 * @param parts.image - the Image row's address
 * @param parts.shader - the Shader row's shader
 * @returns the background
 */
function backgroundOf({ color, image, shader }: BackgroundParts): GraphBackgroundConfig {
    const rest = { ...(color === undefined ? {} : { color }), ...(shader === undefined ? {} : { shader }) };
    return image === undefined
        ? { backgroundType: "color", ...rest }
        : { backgroundType: "skybox", data: image, ...rest };
}

/**
 * The Background section (shader studio decisions 5.7): its "+" adds a Color, an Image and a
 * Shader, one of each, a kind already there shown disabled with its reason. The rows read top to
 * bottom as the layers are stacked, Shader over Image over Color, each with a minus. Removing
 * Color leaves the element to draw its default color, which the section then names in a caption.
 * An Image waits for its address, and a Shader for its pick, before anything is written.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns The section
 */
function BackgroundSection({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element {
    const [waiting, setWaiting] = useState<readonly BackgroundKind[]>([]);
    const { background, backgroundColor } = session.config;
    const parts: BackgroundParts = {
        color: background.color,
        image: background.backgroundType === "skybox" ? background.data : undefined,
        shader: background.shader,
    };
    const present = (kind: BackgroundKind): boolean => parts[kind] !== undefined || waiting.includes(kind);
    const settle = (kind: BackgroundKind): void => {
        setWaiting((now) => now.filter((each) => each !== kind));
    };
    const write = (next: Partial<BackgroundParts>, scope: GraphSession = session): Promise<void> =>
        scope.config.set({ background: backgroundOf({ ...parts, ...next }) });
    const add = (kind: BackgroundKind): void => {
        if (kind === "color") {
            void write({ color: backgroundColor });
        } else {
            setWaiting((now) => [...now, kind]);
        }
    };
    const remove = (kind: BackgroundKind): void => {
        settle(kind);
        if (parts[kind] !== undefined) {
            void write({ [kind]: undefined });
        }
    };
    const minus = (kind: BackgroundKind): React.JSX.Element => {
        const name = BACKGROUND_SECTION_WORDS.remove(BACKGROUND_WORDS[kind]);
        return (
            <Tooltip label={name} position="top">
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={name}
                    onClick={() => {
                        remove(kind);
                    }}
                >
                    <GLYPHS.remove size={14} aria-hidden />
                </ActionIcon>
            </Tooltip>
        );
    };
    const rows: Record<BackgroundKind, () => React.JSX.Element> = {
        color: () => (
            <FieldRow trailing={minus("color")}>
                <CompactColorInput
                    label="Background color"
                    valueText={colorWord(backgroundColor)}
                    color={parts.color}
                    defaultColor={DEFAULT_BACKGROUND_COLOR}
                    showOpacity={false}
                    onChangeEnd={(next) => {
                        // Once per gesture, so a drag is one step. The reset reports undefined:
                        // alone, the background returns to the element's default; under an image
                        // or a shader, the color does.
                        if (next === undefined && parts.image === undefined && parts.shader === undefined) {
                            void session.config.set({ background: undefined });
                        } else {
                            void write({ color: next ?? DEFAULT_BACKGROUND_COLOR });
                        }
                    }}
                />
            </FieldRow>
        ),
        image: () => (
            <FieldRow trailing={minus("image")}>
                <BackgroundImage
                    address={parts.image !== undefined && !parts.image.startsWith("data:") ? parts.image : ""}
                    onCommit={(data) => {
                        settle("image");
                        void write({ image: data });
                    }}
                />
            </FieldRow>
        ),
        shader: () => (
            <FieldRow trailing={minus("shader")}>
                <BackgroundShader
                    session={session}
                    shader={parts.shader?.id}
                    params={parts.shader?.params ?? {}}
                    startOpen={parts.shader === undefined}
                    onWrite={(id, params, scope = session) => {
                        settle("shader");
                        return write({ shader: { id, params } }, scope);
                    }}
                />
            </FieldRow>
        ),
    };
    const addButton = (
        <Menu position="bottom-end">
            <Menu.Target>
                <Tooltip label={BACKGROUND_SECTION_WORDS.add}>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        className="cm-section-add"
                        aria-label={BACKGROUND_SECTION_WORDS.add}
                        data-plus
                    >
                        <GLYPHS.add size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
                {BACKGROUND_KINDS.map((kind) => {
                    const there = present(kind);
                    const reason = BACKGROUND_SECTION_WORDS.present(BACKGROUND_WORDS[kind]);
                    return (
                        <Menu.Item
                            key={kind}
                            disabled={there}
                            aria-description={there ? reason : undefined}
                            onClick={() => {
                                add(kind);
                            }}
                        >
                            {BACKGROUND_WORDS[kind]}
                            {there && (
                                <Text size="xs" c="dimmed" aria-hidden>
                                    {reason}
                                </Text>
                            )}
                        </Menu.Item>
                    );
                })}
            </Menu.Dropdown>
        </Menu>
    );
    return (
        <ControlSection label={BACKGROUND_SECTION_WORDS.title} collapsible={false} headingLevel={3} actions={addButton}>
            <Stack gap={6}>
                {parts.color === undefined && (
                    <Text size="xs" c="dimmed" data-background-caption="">
                        {BACKGROUND_SECTION_WORDS.drawnIn(colorWord(backgroundColor), backgroundColor)}
                    </Text>
                )}
                {[...BACKGROUND_KINDS]
                    .reverse()
                    .filter(present)
                    .map((kind) => (
                        <React.Fragment key={kind}>{rows[kind]()}</React.Fragment>
                    ))}
            </Stack>
        </ControlSection>
    );
}

/**
 * The background image: an address typed in (Enter), or an image from this computer, chosen or
 * dropped on the row, kept in the project as a `data:` address.
 * @param props - Component props
 * @param props.address - the image address in effect, or "" for none or an uploaded image
 * @param props.onCommit - writes a new address
 * @returns The field
 */
function BackgroundImage({
    address,
    onCommit,
}: Readonly<{ address: string; onCommit: (data: string) => void }>): React.JSX.Element {
    return (
        <FileSource
            variant="row"
            defaultValue={address}
            url
            accept="image/*"
            placeholder="Image address"
            label="Upload image"
            onUrl={onCommit}
            onFiles={([file]) => {
                void readDataUrl(file).then(onCommit);
            }}
        />
    );
}
