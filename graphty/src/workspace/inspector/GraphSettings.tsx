import { CompactColorInput, ControlSection, SegmentedControl } from "@graphty/compact-mantine";
import { type Lighting, LIGHTING_VALUES } from "@graphty/graphty-element/schema";
import { Select, Stack, Switch, Text, TextInput } from "@mantine/core";
import React, { useState } from "react";

import { useSizeBound } from "../frame/useSizeBound";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

const LIGHTING_WORDS: Readonly<Record<Lighting, string>> = {
    studio: "Studio",
    headlight: "Headlight",
    matte: "Matte",
    flat: "Flat",
};

/**
 * Graph settings, the right panel with no row selected (tier 3 design section 2.5): Background
 * (color or image), View, Lighting, Highlight color, Same size at any depth, and the label rules.
 * The background and the view are the project's and go through the session; the rest are the
 * reader's view preferences, kept in the chrome store and handed to the element on its tag
 * (`frame/ElementHost.tsx`), so none records an undo step.
 * @returns The sections
 */
export function GraphSettings(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const allLabelsShown = useWorkspaceState((state) => state.allLabelsShown);
    const labelsAvoid = useWorkspaceState((state) => state.labelsAvoid);
    const sizeBound = useSizeBound(session);
    const sameSize = useWorkspaceState((state) => state.sameSizeAtAnyDepth) ?? sizeBound;
    const lighting = useWorkspaceState((state) => state.lighting);
    const highlightColor = useWorkspaceState((state) => state.highlightColor);
    // Image is chosen before its address is typed: an empty skybox is refused, so the choice
    // waits here until the address is written.
    const [imagePicked, setImagePicked] = useState(false);
    if (session === null) {
        return null;
    }
    const { background } = session.config;
    const { dimension } = session.layout;
    const showsImage = background.backgroundType === "skybox" || imagePicked;

    return (
        <>
            <ControlSection label="Canvas" defaultOpened>
                <Stack gap={6}>
                    <Stack gap={2}>
                        <Text size="xs" id="graph-settings-background">
                            Background
                        </Text>
                        <SegmentedControl
                            aria-labelledby="graph-settings-background"
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
                                        background: { backgroundType: "color", color: "#ffffff" },
                                    });
                                }
                            }}
                        />
                    </Stack>
                    {showsImage ? (
                        <BackgroundImage
                            value={background.backgroundType === "skybox" ? background.data : ""}
                            onCommit={(data) => {
                                void session.config.set({ background: { backgroundType: "skybox", data } });
                            }}
                        />
                    ) : (
                        <CompactColorInput
                            label="Background color"
                            color={background.backgroundType === "color" ? background.color : undefined}
                            defaultColor="#ffffff"
                            showOpacity={false}
                            onChangeEnd={(next) => {
                                if (next !== undefined) {
                                    // Once per gesture, so a drag is one step.
                                    void session.config.set({ background: { backgroundType: "color", color: next } });
                                }
                            }}
                        />
                    )}
                    <Stack gap={2}>
                        <Text size="xs" id="graph-settings-view">
                            View
                        </Text>
                        <SegmentedControl
                            aria-labelledby="graph-settings-view"
                            fullWidth
                            value={dimension}
                            data={[
                                { value: "3d", label: "3D" },
                                { value: "2d", label: "2D" },
                            ]}
                            onChange={(picked) => {
                                void session.layout.setDimension(picked === "2d" ? "2d" : "3d");
                            }}
                        />
                    </Stack>
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
                    <Switch
                        size="xs"
                        label="Same size at any depth"
                        checked={sameSize}
                        onChange={(event) => {
                            store.set({ sameSizeAtAnyDepth: event.currentTarget.checked });
                        }}
                    />
                    <CompactColorInput
                        label="Highlight color"
                        color={highlightColor}
                        defaultColor={highlightColor}
                        showOpacity={false}
                        onChangeEnd={(next) => {
                            if (next !== undefined) {
                                store.set({ highlightColor: next });
                            }
                        }}
                    />
                </Stack>
            </ControlSection>
            <ControlSection label="Labels" defaultOpened>
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
 * The background image's address, written when the field is left or Enter is pressed.
 * @param props - Component props
 * @param props.value - the address in effect
 * @param props.onCommit - writes a new address
 * @returns The field
 */
function BackgroundImage({
    value,
    onCommit,
}: Readonly<{ value: string; onCommit: (data: string) => void }>): React.JSX.Element {
    const commit = (event: React.SyntheticEvent<HTMLInputElement>): void => {
        const next = event.currentTarget.value.trim();
        if (next !== "" && next !== value) {
            onCommit(next);
        }
    };
    return (
        <TextInput
            key={value}
            size="xs"
            label="Image address"
            defaultValue={value}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    commit(event);
                }
            }}
        />
    );
}
