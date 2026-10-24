import {
    colorWord,
    CompactColorInput,
    ControlSection,
    FieldRow,
    FileSource,
    PanelField,
    PanelLabelsProvider,
    ResetButton,
    SegmentedControl,
} from "@graphty/compact-mantine";
import { DEFAULT_BACKGROUND_COLOR, type Lighting, LIGHTING_VALUES } from "@graphty/graphty-element/schema";
import type { GraphSettingKey } from "@graphty/graphty-element/session";
import { Input, Select, Stack, Switch, Text } from "@mantine/core";
import React, { useLayoutEffect, useRef, useState } from "react";

import { useSizeBound } from "../frame/useSizeBound";
import { readDataUrl } from "../start/open";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
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
 * (color or image), Lighting, Same size at any depth, Outline width, the Map while the layout
 * draws one, and the label rules. The view
 * (2D or 3D) and the layout live only in the toolbar. A setting is shown only while the element
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
    // Image is chosen before its address is typed: an empty skybox is refused, so the choice
    // waits here until the address is written.
    const [imagePicked, setImagePicked] = useState(false);
    const hidden = session === null ? [] : settingsNotInEffect(session);
    const { ref, onFocus } = useFocusPastHidden(hidden, store);
    if (session === null) {
        return null;
    }
    const { background } = session.config;
    const showsImage = background.backgroundType === "skybox" || imagePicked;
    const shows = (key: GraphSettingKey): boolean => !hidden.includes(key);

    return (
        <>
            <ControlSection label="Canvas" collapsible={false} headingLevel={3}>
                <Stack gap={6} ref={ref} onFocus={onFocus}>
                    {/* A field label, as Lighting's and the colors' are: one caption size in the panel. */}
                    <Input.Wrapper size="xs" label="Background">
                        <SegmentedControl
                            fullWidth
                            value={showsImage ? "image" : "color"}
                            data={[
                                { value: "color", label: "Color" },
                                { value: "image", label: "Image" },
                            ]}
                            onChange={(picked) => {
                                setImagePicked(picked === "image");
                                if (picked === "color" && background.backgroundType !== "color") {
                                    void session.config.set({
                                        background: { backgroundType: "color", color: DEFAULT_BACKGROUND_COLOR },
                                    });
                                }
                            }}
                        />
                    </Input.Wrapper>
                    {showsImage ? (
                        <BackgroundImage
                            address={
                                background.backgroundType === "skybox" && !background.data.startsWith("data:")
                                    ? background.data
                                    : ""
                            }
                            onCommit={(data) => {
                                void session.config.set({ background: { backgroundType: "skybox", data } });
                            }}
                        />
                    ) : (
                        <CompactColorInput
                            label="Background color"
                            valueText={colorWord(
                                (background.backgroundType === "color" ? background.color : undefined) ??
                                    DEFAULT_BACKGROUND_COLOR,
                            )}
                            color={background.backgroundType === "color" ? background.color : undefined}
                            defaultColor={DEFAULT_BACKGROUND_COLOR}
                            showOpacity={false}
                            onChangeEnd={(next) => {
                                // Once per gesture, so a drag is one step. The reset reports
                                // undefined, which returns the background to the element's default.
                                void session.config.set({
                                    background:
                                        next === undefined ? undefined : { backgroundType: "color", color: next },
                                });
                            }}
                        />
                    )}
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
        </>
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
