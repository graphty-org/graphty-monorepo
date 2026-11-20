/**
 * Graph settings in Style panel v2 (design/ui/style-panel-v2/design.md, section 4.3): the
 * Background as one row whose Switch to picks Color or Sky (graphty-element's `graph.background`
 * family), with a shader added from its "+"; Canvas in three groups -- View (lighting, rotation,
 * highlight color), Framing (extent, padding) and Marks (same size at any depth, smallest mark);
 * Labels; and Shaders as today. Every line is a control, empty while the graph does not set it.
 */

import {
    ComboInput,
    CompactColorInput,
    ControlGroup,
    ControlSection,
    LabelsProvider,
    PanelField,
    Popout,
} from "@graphty/compact-mantine";
import { styleFamily } from "@graphty/graphty-element/catalog";
import {
    DEFAULT_BACKGROUND_COLOR,
    DEFAULT_FRAMING_EXTENT,
    FRAMING_EXTENT_VALUES,
    type FramingExtent,
    type GraphBackgroundConfig,
    LIGHTING_VALUES,
} from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Checkbox, Group } from "@mantine/core";
import React, { useEffect, useReducer, useRef, useState } from "react";

import { APP_HIGHLIGHT_COLOR } from "../../constants/highlight";
import { useSizeBound } from "../frame/useSizeBound";
import { BackgroundShader, ShaderSection } from "../settings/ShaderSettings";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { PickerNamesOnly } from "../style/pickerNames";
import { AddButton } from "../style/Section";
import { V2_LABELS } from "../style/v2/rubric";
import { LineFrame, SegmentsLine } from "../style/v2/RubricLine";
import { RowSettings } from "../style/v2/ThingLine";
import { failureWords } from "../style/words";
import { LIGHTING_WORDS, useNotInEffect } from "./graphSettingReads";
import { BackgroundImage } from "./GraphSettings";

/** The graph's background family, from graphty-element. */
const BACKGROUND = styleFamily("graph.background");

/** Framing's extent words, by the element's value. */
const EXTENT_WORDS: Readonly<Record<FramingExtent, string>> = { drawn: "Drawn", centers: "Centers" };

/** Framing's extents, in the element's order. */
const EXTENT_OPTIONS = FRAMING_EXTENT_VALUES.map((value) => ({ value, name: EXTENT_WORDS[value] }));

/** What an unnamed line's minus removes. */
const REMOVE_WORDS: Readonly<Record<string, string>> = {
    "framing.extent": "Framing",
    highlightColor: "Highlight color",
    minMarkSize: "Smallest mark",
};

/**
 * A painted color as text, or "" when it is none.
 * @param value - what the element paints.
 * @returns the text.
 */
function colorText(value: unknown): string {
    return typeof value === "string" ? value : "";
}

/**
 * Re-renders on every project change (a config write, an undo).
 * @param session - the element's session.
 */
function useProjectVersion(session: GraphSession | null): void {
    const [, bump] = useReducer((n: number) => n + 1, 0);
    useEffect(() => session?.on("project:changed", bump), [session]);
    // The highlight color is a view setting, not a project change: it has its own event.
    useEffect(() => session?.on("style:highlight-color-changed", bump), [session]);
}

/**
 * A number field (R5): no caret, empty when unset; clearing it unsets.
 * @param props - Component props
 * @param props.label - its name
 * @param props.value - the value, if set
 * @param props.min - its least value
 * @param props.onWrite - writes a number, or undefined to unset
 * @returns The field
 */
function NumberField({
    label,
    value,
    min,
    onWrite,
}: Readonly<{
    label: string;
    value: number | undefined;
    min?: number;
    onWrite: (value: number | undefined) => void;
}>): React.JSX.Element {
    return (
        <ComboInput
            label={label}
            width="100%"
            numeric
            options={[]}
            value={value ?? ""}
            min={min}
            onChange={(next) => {
                if (typeof next === "number") {
                    onWrite(next);
                } else if (next === "") {
                    onWrite(undefined);
                }
            }}
        />
    );
}

/**
 * The Background section: see the file header. One row (design 4.3): its color, or its Sky
 * picture, with a settings button whose pop-over starts with Switch to Color / Sky, as every
 * family's does (design 5), and a "-" that takes the background back to the element's own. A
 * shader added from the header's "+" is a line under it.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns The section
 */
function BackgroundRow({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element {
    const { store } = useWorkspace();
    const { background } = session.config;
    const sky = background.backgroundType === "skybox";
    // Sky picked and waiting for its picture; and the picture left by a switch to Color, for a switch back.
    const [waiting, setWaiting] = useState(false);
    const [settings, setSettings] = useState(false);
    const leftSky = useRef<string | undefined>(undefined);
    const [shaderAdded, setShaderAdded] = useState(false);
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords("Background", "changed", error), error: true } });
    };
    const write = (next: GraphBackgroundConfig): void => {
        session.config.set({ background: next }).catch(fail);
    };
    const rest = {
        ...(background.color === undefined ? {} : { color: background.color }),
        ...(background.shader === undefined ? {} : { shader: background.shader }),
    };
    // The strip shows what the element draws: Sky only once a picture is picked for it.
    const member = sky ? "sky" : "color";
    const anchor = useRef<HTMLDivElement>(null);
    const switchTo = (to: string): void => {
        if (to === member) {
            return;
        }
        if (to === "color") {
            setWaiting(false);
            if (sky) {
                leftSky.current = background.data;
                write({ backgroundType: "color", ...rest });
            }
            return;
        }
        if (leftSky.current === undefined) {
            setWaiting(true);
        } else {
            write({ backgroundType: "skybox", data: leftSky.current, ...rest });
        }
    };
    const options = (BACKGROUND?.members ?? []).map((each) => ({ value: each.id, name: each.plainName }));
    const shaderShown = background.shader !== undefined || shaderAdded;
    const set = sky || background.color !== undefined;
    const pickSky = (data: string): void => {
        setWaiting(false);
        write({ backgroundType: "skybox", data, ...rest });
    };
    const control =
        member === "color" ? (
            <CompactColorInput
                label="Background color"
                hideLabel
                color={background.color}
                defaultColor={DEFAULT_BACKGROUND_COLOR}
                showOpacity={false}
                showReset={false}
                onChangeEnd={(next) => {
                    write({ backgroundType: "color", ...rest, color: next ?? undefined });
                }}
            />
        ) : (
            <BackgroundImage
                address={sky && !background.data.startsWith("data:") ? background.data : ""}
                onCommit={pickSky}
            />
        );
    return (
        <ControlSection
            label="Background"
            collapsible={false}
            headingLevel={3}
            actions={
                // One shader at most: its "+" leaves once it is there.
                shaderShown ? undefined : (
                    <AddButton
                        kind="background"
                        title="Background"
                        options={[{ key: "shader", label: "Shader" }]}
                        onAdd={() => {
                            setShaderAdded(true);
                        }}
                    />
                )
            }
        >
            <div ref={anchor}>
                <LineFrame
                    line="background"
                    name={null}
                    set={set}
                    rule={member === "color" ? "R1" : "R16"}
                    control={control}
                    modifier={
                        <RowSettings
                            label="Background settings"
                            title="Background"
                            opened={settings}
                            onOpenChange={setSettings}
                        >
                            <LineFrame
                                line="switch:graph.background"
                                name={null}
                                set={false}
                                rule="R8f"
                                control={
                                    <SegmentsLine
                                        label="Switch to"
                                        options={options}
                                        value={member}
                                        onPick={switchTo}
                                    />
                                }
                                modifier={null}
                                removeName={undefined}
                                onRemove={() => undefined}
                            />
                        </RowSettings>
                    }
                    removeName={set ? "Remove background" : undefined}
                    onRemove={() => {
                        const { color: _color, ...others } = rest;
                        write({ backgroundType: "color", ...others });
                    }}
                />
            </div>
            <Popout
                opened={waiting}
                onOpenChange={(next) => {
                    if (!next) {
                        setWaiting(false);
                    }
                }}
            >
                <Popout.Panel
                    width={240}
                    placement="left"
                    alignment="start"
                    anchorY={anchor}
                    header={{ variant: "title", title: "Sky" }}
                    closeLabel="Close Sky"
                >
                    <Popout.Content>
                        <BackgroundImage address="" onCommit={pickSky} />
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
            {shaderShown && (
                <LineFrame
                    line="background.shader"
                    name="Shader"
                    set={background.shader !== undefined}
                    rule="R16"
                    control={
                        <BackgroundShader
                            session={session}
                            shader={background.shader?.id}
                            params={background.shader?.params ?? {}}
                            startOpen={background.shader === undefined}
                            bare
                            onCancel={() => {
                                // The gallery closed with nothing picked: the line "+" added goes again.
                                setShaderAdded(false);
                            }}
                            onWrite={async (id, params, scope = session) => {
                                await scope.config.set({ background: { ...background, shader: { id, params } } });
                                setShaderAdded(false);
                            }}
                        />
                    }
                    modifier={null}
                    removeName="Remove background shader"
                    onRemove={() => {
                        setShaderAdded(false);
                        const { shader: _shader, ...others } = background;
                        write(others);
                    }}
                />
            )}
        </ControlSection>
    );
}

/**
 * Graph settings v2: see the file header.
 * @returns The sections, or nothing before the element has come up
 */
export function GraphSettingsV2(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    useProjectVersion(session);
    const allLabelsShown = useWorkspaceState((state) => state.allLabelsShown);
    const labelsAvoid = useWorkspaceState((state) => state.labelsAvoid);
    const lighting = useWorkspaceState((state) => state.lighting);
    const sizeBound = useSizeBound(session);
    const sameSizeChosen = useWorkspaceState((state) => state.sameSizeAtAnyDepth);
    const hidden = useNotInEffect(session);
    if (session === null) {
        return null;
    }
    const fail = (what: string) => (error: unknown) => {
        store.set({ notice: { message: failureWords(what, "changed", error), error: true } });
    };
    const { framing, minMarkSize, viewRotation } = session.config;
    const highlightNow = colorText(session.styles.highlightStyle("node")["node.color"]);
    // The reader's choice: set when it is not the color the app gives every session (ElementHost's,
    // a consumer's choice, not the element's), which "-" goes back to. Unset, the field is empty.
    const highlightSet = highlightNow !== "" && highlightNow.toLowerCase() !== APP_HIGHLIGHT_COLOR.toLowerCase();
    const writeHighlight = (next: string | undefined): void => {
        try {
            session.styles.setHighlightColor(next);
        } catch (error) {
            fail("Highlight color")(error);
        }
    };
    const line = (
        key: string,
        name: string | null,
        rule: string,
        control: React.ReactNode,
        set: boolean,
        onRemove?: () => void,
    ): React.JSX.Element => (
        <LineFrame
            key={key}
            line={key}
            name={name}
            set={set}
            rule={rule}
            control={control}
            modifier={null}
            removeName={
                set && onRemove !== undefined ? `Remove ${(REMOVE_WORDS[key] ?? name ?? key).toLowerCase()}` : undefined
            }
            onRemove={onRemove ?? (() => undefined)}
        />
    );
    const setFraming = (next: { extent?: FramingExtent; padding?: number }): void => {
        const extent = next.extent ?? framing?.extent ?? DEFAULT_FRAMING_EXTENT;
        const padding = "padding" in next ? next.padding : framing?.padding;
        session.config
            .set({ framing: { extent, ...(padding === undefined ? {} : { padding }) } })
            .catch(fail("Framing"));
    };
    const setMinMark = (which: "node" | "edge", value: number | undefined): void => {
        const next = { ...minMarkSize, [which]: value };
        const empty = next.node === undefined && next.edge === undefined;
        session.config.set({ minMarkSize: empty ? undefined : next }).catch(fail("Smallest mark"));
    };
    return (
        <LabelsProvider labels={V2_LABELS}>
            <PickerNamesOnly.Provider value>
                <div data-graph-settings-v2="">
                    <BackgroundRow session={session} />
                    <ControlSection label="Canvas" collapsible={false} headingLevel={3}>
                        <ControlGroup label="View">
                            {!hidden.includes("lighting") &&
                                line(
                                    "lighting",
                                    "Lighting",
                                    "R9",
                                    <PanelField
                                        label="Lighting"
                                        kind="select"
                                        width="fill"
                                        data={LIGHTING_VALUES.map((value) => ({ value, label: LIGHTING_WORDS[value] }))}
                                        value={lighting}
                                        onChange={(picked) => {
                                            const next = LIGHTING_VALUES.find((value) => value === picked);
                                            if (next !== undefined) {
                                                store.set({ lighting: next });
                                            }
                                        }}
                                    />,
                                    false,
                                )}
                            {line(
                                "viewRotation",
                                "Rotation",
                                "R5",
                                <NumberField
                                    label="Rotation"
                                    value={viewRotation}
                                    onWrite={(value) => {
                                        session.config.set({ viewRotation: value }).catch(fail("Rotation"));
                                    }}
                                />,
                                viewRotation !== undefined,
                                () => {
                                    session.config.set({ viewRotation: undefined }).catch(fail("Rotation"));
                                },
                            )}
                            {line(
                                "highlightColor",
                                "Highlight",
                                "R1",
                                <CompactColorInput
                                    label="Highlight color"
                                    hideLabel
                                    color={highlightSet ? highlightNow : undefined}
                                    defaultColor={APP_HIGHLIGHT_COLOR}
                                    showOpacity={false}
                                    showReset={false}
                                    onChangeEnd={(next) => {
                                        writeHighlight(next ?? APP_HIGHLIGHT_COLOR);
                                    }}
                                />,
                                highlightSet,
                                () => {
                                    writeHighlight(APP_HIGHLIGHT_COLOR);
                                },
                            )}
                        </ControlGroup>
                        <ControlGroup label="Framing">
                            {line(
                                "framing.extent",
                                null,
                                "R8",
                                <SegmentsLine
                                    label="Framing extent"
                                    options={EXTENT_OPTIONS}
                                    value={framing?.extent ?? ""}
                                    onPick={(picked) => {
                                        const extent = FRAMING_EXTENT_VALUES.find((value) => value === picked);
                                        if (extent !== undefined) {
                                            setFraming({ extent });
                                        }
                                    }}
                                />,
                                framing !== undefined,
                                () => {
                                    session.config.set({ framing: undefined }).catch(fail("Framing"));
                                },
                            )}
                            {line(
                                "framing.padding",
                                "Padding",
                                "R5",
                                <NumberField
                                    label="Padding"
                                    value={framing?.padding}
                                    min={0}
                                    onWrite={(padding) => {
                                        setFraming({ padding });
                                    }}
                                />,
                                framing?.padding !== undefined,
                                () => {
                                    setFraming({ padding: undefined });
                                },
                            )}
                        </ControlGroup>
                        <ControlGroup label="Marks">
                            {!hidden.includes("node.sizeSpace") &&
                                line(
                                    "node.sizeSpace",
                                    null,
                                    "R7",
                                    <Checkbox
                                        size="xs"
                                        label="Same size at any depth"
                                        checked={sameSizeChosen ?? sizeBound}
                                        onChange={(event) => {
                                            store.set({ sameSizeAtAnyDepth: event.currentTarget.checked });
                                        }}
                                    />,
                                    false,
                                )}
                            {line(
                                "minMarkSize",
                                "Smallest",
                                "R5",
                                // One pair, node | edge (design 4.3).
                                <Group grow gap={4} wrap="nowrap">
                                    {(["node", "edge"] as const).map((which) => (
                                        <NumberField
                                            key={which}
                                            label={which === "node" ? "Smallest node" : "Smallest edge"}
                                            min={0}
                                            value={minMarkSize?.[which]}
                                            onWrite={(value) => {
                                                setMinMark(which, value);
                                            }}
                                        />
                                    ))}
                                </Group>,
                                minMarkSize !== undefined,
                                () => {
                                    session.config.set({ minMarkSize: undefined }).catch(fail("Smallest mark"));
                                },
                            )}
                        </ControlGroup>
                    </ControlSection>
                    <ControlSection label="Labels" collapsible={false} headingLevel={3}>
                        {line(
                            "labels.declutter",
                            null,
                            "R7",
                            <Checkbox
                                size="xs"
                                label="Hide overlaps"
                                checked={!allLabelsShown}
                                onChange={(event) => {
                                    store.set({ allLabelsShown: !event.currentTarget.checked });
                                }}
                            />,
                            false,
                        )}
                        {line(
                            "labels.avoidNodesAndEdges",
                            null,
                            "R7",
                            <Checkbox
                                size="xs"
                                label="Avoid nodes and edges"
                                checked={labelsAvoid}
                                onChange={(event) => {
                                    store.set({ labelsAvoid: event.currentTarget.checked });
                                }}
                            />,
                            false,
                        )}
                    </ControlSection>
                    <ShaderSection />
                </div>
            </PickerNamesOnly.Provider>
        </LabelsProvider>
    );
}
