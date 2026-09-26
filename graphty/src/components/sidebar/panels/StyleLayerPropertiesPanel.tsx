/**
 * The style-layer inspector's body: which elements a layer paints, and one row per channel.
 *
 * ONE ROW PER CHANNEL, AND THE MODE OF A ROW IS WHAT ITS FIELD CONTAINS (build spec 04 section
 * 4.2 step 6, spec:3428 with spec:2487). A channel the layer sets at a fixed value draws an
 * ordinary control holding that value. A channel the layer works out from the data draws the
 * same control, BOUND and disabled, with the attribute it reads named beside it and one verb
 * that turns the rule into the value it currently produces so a reader can then edit it. A
 * channel the layer says nothing about draws the control with no value at all, which compact
 * controls render as the element's own default in italic chrome ink -- "this layer chooses
 * nothing here" rather than a lie about what it chose.
 *
 * WHY A BOUND CHANNEL IS NOT EDITABLE, and why that is now the element's sentence rather than
 * this panel's. A rule and a fixed value on the same channel of the same layer are not two
 * settings that merge: the rule is evaluated per element and wins. A control offered there
 * would take a value, write it, and be painted over on the same repaint. The panel used to
 * reconstruct that fact from outside, in `shell/inspector/calculatedChannels.ts` -- 311 lines
 * prefix-matching the element's dotted style paths back to five channel names, with its own
 * header recording that an unrecognised path had to be reported rather than swallowed because
 * dropping it silently was the very defect it was written to close. `styles.explain()` answers
 * it per channel with a reason, and `styles.resolveToStatic()` is the paired verb that makes a
 * rule editable, so neither the table nor the reconstruction has anything left to do.
 *
 * WHAT LEFT WITH THE 1.x STYLE SYSTEM. The gradient editor, the colour-mode picker and the
 * 503-line rich-text editor are gone, because the channel vocabulary has no spelling for any of
 * them: `node.color` is a colour, and a label's appearance is the nine fields of `LabelStyle`.
 * That is a real narrowing of what a hand-authored layer can say, and it is the element's
 * narrowing rather than a simplification made here -- see `graphty-element/src/Styles.ts`, whose
 * own header names the gap and says closing it is an API decision.
 */

import {
    ActionRow,
    CompactColorInput,
    ControlGroup,
    ControlSection,
    ControlSubGroup,
    FieldRow,
    PanelField,
    StyleNumberInput,
    StyleSelect,
    ToggleRow,
} from "@graphty/compact-mantine";
import type { ChannelValue, LabelStyle } from "@graphty/graphty-element/schema";
import type { Channel, LayerSpec, Selector } from "@graphty/graphty-element/session";
import { Stack } from "@mantine/core";
import React, { useCallback, useEffect, useState } from "react";

import {
    CHANNEL_CONTROLS,
    type ChannelControl,
    type ChannelGroup,
    channelsIn,
    EDGE_GROUPS,
    NODE_GROUPS,
} from "../../../utils/channelControls";
import { INSPECTOR_SECTION_IDS } from "../../shell/inspector/inspectorConstants";
import { useInspectorSection } from "../../shell/inspector/sections";
import type { LayerItem } from "../../shell/panel/StyleLayerList";

/** What the panel needs of its caller. */
interface StyleLayerPropertiesPanelProps {
    /** The layer being edited, exactly as the element holds it. */
    readonly layer: LayerItem;
    /** Applies a patch to the layer, by id. One key deep, as `styles.update` merges it. */
    readonly onUpdate?: (layerId: string, patch: Partial<LayerSpec>) => void;
    /** Turns one channel's rule into the fixed value it currently produces. */
    readonly onResolveToStatic?: (layerId: string, channel: Channel) => void;
}

/** The words the selector field shows when the layer paints every element of its kind. */
const EVERYTHING_PLACEHOLDER = "every element";

/** What a bound row says instead of a value. */
const BOUND_PREFIX = "from ";

/** The verb that makes a bound channel editable. */
const RESOLVE_LABEL = "Convert to a fixed value";

/**
 * The expression a selector is edited as, or "" when the layer paints everything.
 *
 * Only `{match:"expression"}` has text a reader can type. A `has`, an `ids` and a `top`
 * selector have no text form a reader could edit without losing what it means, so they are
 * drawn read-only.
 * @param selector - the layer's selector.
 * @returns the expression, or "" when there is none.
 */
function selectorText(selector: Selector): string {
    return selector.match === "expression" ? selector.where : "";
}

/**
 * How a selector is described when it has no text form.
 * @param selector - the layer's selector.
 * @returns the description, or undefined when the selector is editable text.
 */
function selectorSummary(selector: Selector): string | undefined {
    switch (selector.match) {
        case "everything":
            return undefined;
        case "expression":
            return undefined;
        case "has":
            return `the elements carrying ${selector.path}`;
        case "top":
            return `the top ${String(selector.n)} by ${selector.path}, whole ties only`;
        default:
            return `${String((selector.nodes?.length ?? 0) + (selector.edges?.length ?? 0))} named elements`;
    }
}

/**
 * A channel value as a colour swatch opens on it.
 * @param value - what the layer sets, if anything.
 * @returns the hex, or undefined when the layer sets no colour.
 */
function colorOf(value: ChannelValue | undefined): string | undefined {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "object" && "r" in value) {
        const hex = (component: number): string => Math.round(component).toString(16).padStart(2, "0");

        return `#${hex(value.r)}${hex(value.g)}${hex(value.b)}`.toUpperCase();
    }

    return undefined;
}

/**
 * The label style a layer writes, or undefined when it writes none.
 * @param value - what the layer sets, if anything.
 * @returns the label style.
 */
function labelStyleOf(value: ChannelValue | undefined): LabelStyle | undefined {
    return typeof value === "object" && !("r" in value) ? value : undefined;
}

/**
 * The body of the style-layer inspector: the selector, and one row per channel of the layer's
 * own target.
 * @param props - the layer, the patch writer and the rule-to-value verb.
 * @returns the two sections.
 */
export function StyleLayerPropertiesPanel(props: StyleLayerPropertiesPanelProps): React.JSX.Element {
    const { layer, onUpdate, onResolveToStatic } = props;
    const selectorSection = useInspectorSection(INSPECTOR_SECTION_IDS.layerSelector, true);
    const channelSection = useInspectorSection(INSPECTOR_SECTION_IDS.layerEncoding, true);
    const [expression, setExpression] = useState(() => selectorText(layer.selector));

    /* The field follows the layer, because the same surface is reused for the next layer a
       reader picks: without this, picking a second layer left the first one's expression in
       the box and the next blur would have written it onto the wrong layer. */
    useEffect(() => {
        setExpression(selectorText(layer.selector));
    }, [layer.id, layer.selector]);

    /**
     * Writes one channel's fixed value, or clears it when the reader resets the control.
     *
     * The whole `set` is rebuilt and handed over, because `styles.update` merges a patch ONE
     * KEY DEEP: a partial `set` would replace the layer's literals rather than adding to them.
     * A cleared last channel is written as `set: undefined`, which is how an update drops a
     * key rather than leaving what was there.
     */
    const writeChannel = useCallback(
        (channel: Channel, value: ChannelValue | undefined) => {
            const next: Record<string, ChannelValue> = {};

            for (const [name, held] of Object.entries(layer.set ?? {})) {
                if (name !== channel && held !== undefined) {
                    next[name] = held;
                }
            }

            if (value !== undefined) {
                next[channel] = value;
            }

            onUpdate?.(layer.id, { set: Object.keys(next).length === 0 ? undefined : next });
        },
        [layer.id, layer.set, onUpdate],
    );

    const commitSelector = useCallback(() => {
        const trimmed = expression.trim();
        const current = selectorText(layer.selector);

        if (trimmed === current) {
            return;
        }

        onUpdate?.(layer.id, trimmed === "" ? { selector: { match: "everything" } } : { selector: { match: "expression", where: trimmed } });
    }, [expression, layer.id, layer.selector, onUpdate]);

    /**
     * One channel's row: the control, or the bound form of it with its conversion verb.
     * @param channel - the channel the row draws.
     * @returns the row, or null when the panel draws no control for that channel.
     */
    const renderChannel = (channel: Channel): React.JSX.Element | null => {
        const control: ChannelControl = CHANNEL_CONTROLS[channel];
        const binding = layer.encode?.[channel];
        const value = layer.set?.[channel];
        const boundTo = binding !== undefined && "by" in binding ? binding.by : undefined;
        const disabledReason =
            control.unavailable ??
            (binding === undefined
                ? undefined
                : `This layer works ${control.label.toLowerCase()} out from the data, so it cannot be typed into.`);
        const disabled = disabledReason !== undefined;

        if (control.kind === "none") {
            return <ActionRow key={channel} state={`${control.label}: ${String(control.unavailable)}`} />;
        }

        const rows: React.JSX.Element[] = [];

        if (control.kind === "color") {
            rows.push(
                <CompactColorInput
                    key={channel}
                    label={control.label}
                    showOpacity={false}
                    color={colorOf(value)}
                    defaultColor={typeof control.fallback === "string" ? control.fallback : "#FFFFFF"}
                    disabled={disabled}
                    {...(disabledReason === undefined ? {} : { disabledReason })}
                    onChange={(next) => {
                        writeChannel(channel, next);
                    }}
                />,
            );
        } else if (control.kind === "number") {
            rows.push(
                <StyleNumberInput
                    key={channel}
                    label={control.label}
                    value={typeof value === "number" ? value : undefined}
                    defaultValue={typeof control.fallback === "number" ? control.fallback : 0}
                    {...(control.min === undefined ? {} : { min: control.min })}
                    {...(control.max === undefined ? {} : { max: control.max })}
                    {...(control.step === undefined ? {} : { step: control.step })}
                    disabled={disabled}
                    {...(disabledReason === undefined ? {} : { disabledReason })}
                    onChange={(next) => {
                        writeChannel(channel, next);
                    }}
                />,
            );
        } else if (control.kind === "enum") {
            rows.push(
                <StyleSelect
                    key={channel}
                    label={control.label}
                    value={typeof value === "string" ? value : undefined}
                    defaultValue={typeof control.fallback === "string" ? control.fallback : ""}
                    options={[...(control.options ?? [])]}
                    disabled={disabled}
                    {...(disabledReason === undefined ? {} : { disabledReason })}
                    onChange={(next) => {
                        writeChannel(channel, next);
                    }}
                />,
            );
        } else if (control.kind === "boolean") {
            rows.push(
                <ToggleRow
                    key={channel}
                    label={control.label}
                    checked={value === true}
                    disabled={disabled}
                    {...(disabledReason === undefined ? {} : { disabledReason })}
                    onChange={(checked) => {
                        writeChannel(channel, checked);
                    }}
                />,
            );
        } else if (control.kind === "text") {
            rows.push(
                <FieldRow key={channel}>
                    <PanelField
                        label={control.label}
                        aria-label={control.label}
                        kind="text"
                        glyph="attribute"
                        width="fill"
                        value={typeof value === "string" ? value : ""}
                        placeholder={boundTo ?? "nothing"}
                        disabled={disabled}
                        onChange={(next) => {
                            const text = String(next);
                            writeChannel(channel, text === "" ? undefined : text);
                        }}
                    />
                </FieldRow>,
            );
        } else {
            rows.push(<LabelStyleRows key={channel} channel={channel} style={labelStyleOf(value)} disabled={disabled} onWrite={writeChannel} />);
        }

        if (boundTo !== undefined) {
            rows.push(
                <ActionRow
                    key={`${channel}-bound`}
                    state={`${control.label} ${BOUND_PREFIX}${boundTo}. ${RESOLVE_LABEL}`}
                    onClick={() => {
                        onResolveToStatic?.(layer.id, channel);
                    }}
                />,
            );
        }

        return <React.Fragment key={`${channel}-row`}>{rows}</React.Fragment>;
    };

    /**
     * One group of channels, drawn only when it holds at least one row.
     * @param group - the group being drawn.
     * @returns the group, or null when the layer's target has no channel in it.
     */
    const renderGroup = (group: ChannelGroup): React.JSX.Element | null => {
        const channels = channelsIn(layer.target, group);

        if (channels.length === 0) {
            return null;
        }

        return (
            <ControlGroup key={group} label={group}>
                {channels.map((channel) => renderChannel(channel))}
            </ControlGroup>
        );
    };

    const summary = selectorSummary(layer.selector);
    const groups = layer.target === "node" ? NODE_GROUPS : EDGE_GROUPS;

    return (
        <Stack gap={0}>
            <ControlSection
                label={layer.target === "node" ? "Which nodes" : "Which edges"}
                opened={selectorSection.opened}
                onOpenChange={selectorSection.onOpenChange}
                hasConfiguredValues={layer.selector.match !== "everything"}
                info="A JMESPath expression over the element's own columns. An empty selector paints every element of this layer's kind."
            >
                {summary === undefined ? (
                    <FieldRow>
                        <PanelField
                            label="Selector"
                            aria-label={layer.target === "node" ? "Node Selector" : "Edge Selector"}
                            kind="text"
                            glyph="attribute"
                            width="fill"
                            value={expression}
                            placeholder={EVERYTHING_PLACEHOLDER}
                            disabled={layer.locked}
                            onChange={(next) => {
                                setExpression(String(next));
                            }}
                            onBlur={commitSelector}
                        />
                    </FieldRow>
                ) : (
                    <ActionRow state={summary} />
                )}
            </ControlSection>

            <ControlSection
                label={layer.target === "node" ? "Node" : "Edge"}
                opened={channelSection.opened}
                onOpenChange={channelSection.onOpenChange}
            >
                {groups.map((group) => renderGroup(group))}
            </ControlSection>
        </Stack>
    );
}

/** What the label-style rows need of the panel around them. */
interface LabelStyleRowsProps {
    /** The channel being edited. */
    readonly channel: Channel;
    /** The style the layer writes, if any. */
    readonly style: LabelStyle | undefined;
    /** Whether the layer works the style out from the data. */
    readonly disabled: boolean;
    /** Writes the whole style back. */
    readonly onWrite: (channel: Channel, value: ChannelValue | undefined) => void;
}

/**
 * The fields of a `LabelStyle`, which is the whole vocabulary a layer has for how a label looks.
 *
 * `maxWidth` and `wrap` are not drawn: the renderer sizes a label to its text, which is what
 * those two channels' own caveat says, so offering them would be offering settings the picture
 * does not take.
 * @param props - the channel, the style, and the writer.
 * @returns the rows.
 */
function LabelStyleRows(props: LabelStyleRowsProps): React.JSX.Element {
    const { channel, style, disabled, onWrite } = props;

    const write = (patch: Partial<LabelStyle>): void => {
        const next: LabelStyle = { ...style, ...patch };
        const kept = Object.entries(next).filter(([, value]) => value !== undefined);

        onWrite(channel, kept.length === 0 ? undefined : (Object.fromEntries(kept) as LabelStyle));
    };

    return (
        <ControlSubGroup label="Label style">
            <StyleNumberInput
                label="Text size"
                value={style?.sizePx}
                defaultValue={48}
                min={1}
                disabled={disabled}
                onChange={(next) => {
                    write({ sizePx: next });
                }}
            />
            <CompactColorInput
                label="Text color"
                showOpacity={false}
                color={style?.color}
                defaultColor="#000000"
                disabled={disabled}
                onChange={(next) => {
                    write({ color: next });
                }}
            />
            <CompactColorInput
                label="Background"
                showOpacity={false}
                color={style?.background}
                defaultColor="#FFFFFF"
                disabled={disabled}
                onChange={(next) => {
                    write({ background: next });
                }}
            />
            <CompactColorInput
                label="Outline"
                showOpacity={false}
                color={style?.outline}
                defaultColor="#FFFFFF"
                disabled={disabled}
                onChange={(next) => {
                    write({ outline: next });
                }}
            />
            <StyleNumberInput
                label="Padding"
                value={style?.padding}
                defaultValue={0}
                min={0}
                disabled={disabled}
                onChange={(next) => {
                    write({ padding: next });
                }}
            />
        </ControlSubGroup>
    );
}
