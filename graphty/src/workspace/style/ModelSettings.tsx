import { ComboInput, PanelField, Slider } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue } from "@graphty/graphty-element/schema";
import type { CodedFact, GraphSession, ModelSummary } from "@graphty/graphty-element/session";
import { ActionIcon, Group, Stack, Text, Tooltip } from "@mantine/core";
import React from "react";

import { useModelStates } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { ModelChip } from "./ModelChip";
import type { RowContext } from "./PropertyRow";
import { lineIn, removeLine, writeIn } from "./row";
import { ANIMATION_CHANNELS, CUSTOM_MODEL, failureWords, MODEL_SETTING_CHIPS, MODEL_SETTING_ROWS } from "./words";

/** A model's clip, as graphty-element's summary lists it. */
type ModelClip = ModelSummary["animations"][number];

/** The Animation menu's key for drawing the model still (`node.modelAnimation` ""), which a menu cannot key. */
const STILL = "still:";

/**
 * A choice's value as a layer holds it: "true" and "false" as yes-or-no (Color, Sides, Light),
 * Animation's Still as "", anything else as its words.
 * @param value - the chosen value's key.
 * @returns the value to write.
 */
function parsed(value: string): ChannelValue {
    if (value === "true" || value === "false") {
        return value === "true";
    }
    return value === STILL ? "" : value;
}

/**
 * A model's clips, from graphty-element's summary of it.
 * @param session - the element's session.
 * @param ref - what a layer names.
 * @returns the clips; none for a sample or a model not in yet.
 */
function clipsOf(session: GraphSession, ref: string): readonly ModelClip[] {
    const record = session.assets.find(ref);
    return record?.state === "accepted" && record.kind === "model" ? session.assets.inspect(record.id).animations : [];
}

/**
 * A row's choices, the Animation row's from the model's clips.
 * @param channel - the property.
 * @param choices - the row's own choices.
 * @param clips - the model's clips.
 * @returns each value's key and word.
 */
function choicesOf(
    channel: Channel,
    choices: readonly (readonly [string, string])[] | undefined,
    clips: readonly ModelClip[],
): readonly (readonly [string, string])[] | undefined {
    if (channel !== "node.modelAnimation") {
        return choices;
    }
    return [[STILL, CUSTOM_MODEL.still], ...clips.map((clip) => [clip.name, CUSTOM_MODEL.clip(clip)] as const)];
}

/** One Model settings row's control. */
interface SettingControlProps {
    readonly descriptor: ChannelDescriptor | undefined;
    readonly word: string;
    readonly choices: readonly (readonly [string, string])[] | undefined;
    /** A number's unit and arrow-key step. */
    readonly unit: string | undefined;
    readonly step: number | undefined;
    readonly value: unknown;
    /** The model's own value (`AssetRecord.defaults`), shown in place of graphty-element's default. */
    readonly inherited?: ChannelValue;
    readonly write: (next: ChannelValue) => void;
}

/**
 * A Model settings row's field: a number in its unit (Turn's degrees), or a choice. An unset one shows
 * graphty-element's default as its placeholder, and is named by it. An arrow key on an empty Turn
 * steps from its minimum, not the placeholder, until compact-mantine's number field takes an
 * origin (issue #6233).
 * @param props - Component props
 * @param props.descriptor - the property
 * @param props.word - the row's word
 * @param props.choices - each value's key and word, for a choice
 * @param props.unit - a number's unit
 * @param props.step - a number's arrow-key step
 * @param props.value - the value set here
 * @param props.inherited - the model's own value, if it has one
 * @param props.write - writes a value
 * @returns The field
 */
function SettingControl({
    descriptor,
    word,
    choices,
    unit,
    step,
    value,
    inherited,
    write,
}: Readonly<SettingControlProps>): React.JSX.Element {
    const fallback = inherited ?? descriptor?.default;
    if (choices === undefined) {
        const shown = typeof fallback === "number" ? String(fallback) : "";
        return (
            <ComboInput
                label={typeof value === "number" ? word : `${word}, default ${shown} ${unit ?? ""}`.trimEnd()}
                width="100%"
                numeric
                options={[]}
                value={typeof value === "number" ? value : ""}
                placeholder={shown === "" ? undefined : shown}
                suffix={unit}
                min={descriptor?.min}
                max={descriptor?.max}
                step={step ?? 1}
                onChange={(next) => {
                    if (typeof next === "number") {
                        write(next);
                    }
                }}
            />
        );
    }
    const keyOf = (v: unknown): string | undefined => {
        if (v === "" && descriptor?.channel === "node.modelAnimation") {
            return STILL;
        }
        return typeof v === "string" || typeof v === "boolean" ? String(v) : undefined;
    };
    const chosen = keyOf(value);
    // An unset Animation draws the model still, as "" does; the catalog gives a text channel no default.
    const unsetKey = inherited === undefined && descriptor?.channel === "node.modelAnimation" ? STILL : keyOf(fallback);
    const unsetWord = choices.find(([key]) => key === unsetKey)?.[1];
    const shownWord = choices.find(([key]) => key === chosen)?.[1] ?? `default ${unsetWord ?? ""}`;
    return (
        <PanelField
            label={`${word}, ${shownWord}`}
            kind="select"
            width="fill"
            data={choices.map(([key, label]) => ({ value: key, label }))}
            value={chosen ?? null}
            placeholder={chosen === undefined ? unsetWord : undefined}
            onChange={(next) => {
                write(parsed(String(next)));
            }}
        />
    );
}

/**
 * The Pose slider, under Animation while a clip is chosen: the moment of the clip the model holds.
 * Moving it writes Start and stops the clip there (Speed 0).
 * @param props - Component props
 * @param props.seconds - the clip's length
 * @param props.value - Start, in seconds
 * @param props.write - writes Start
 * @returns The row
 */
function PoseRow({
    seconds,
    value,
    write,
}: Readonly<{ seconds: number; value: number; write: (next: number) => void }>): React.JSX.Element {
    return (
        <div className="ws-row" data-line="pose">
            <div className="ws-field" data-named="">
                <span className="ws-field-label">
                    <span className="ws-field-name" aria-hidden>
                        {CUSTOM_MODEL.pose}
                    </span>
                </span>
                <div className="ws-field-control">
                    <Group gap={6} wrap="nowrap">
                        <Slider
                            size="xs"
                            style={{ flex: 1 }}
                            min={0}
                            max={Math.max(seconds, 0.01)}
                            step={0.01}
                            value={Math.min(value, seconds)}
                            // The time is written beside the slider: a label over the thumb covered the Animation row.
                            label={null}
                            thumbLabel={CUSTOM_MODEL.pose}
                            thumbProps={{ "aria-valuetext": `${Math.min(value, seconds).toFixed(2)} s` }}
                            onChange={write}
                        />
                        <Text size="xs" c="dimmed" aria-hidden>
                            {`${Math.min(value, seconds).toFixed(2)} s`}
                        </Text>
                    </Group>
                </div>
                <span className="ws-slot" />
            </div>
        </div>
    );
}

/** Props for SettingRows. */
interface SettingRowsProps {
    /** The rows drawn, in Model settings' order. */
    readonly channels: readonly Channel[];
    /** Each row's value as it is set here; an unset row shows graphty-element's default. */
    readonly values: Readonly<Partial<Record<Channel, unknown>>>;
    /** What graphty-element says about the model, for the Up and Color chips. */
    readonly problems: readonly CodedFact[];
    readonly write: (channel: Channel, value: ChannelValue) => void;
    /** Takes a set row back to its default; a set row shows its minus. */
    readonly remove: (channel: Channel) => void;
    /** The model's clips: the Animation menu's choices. Without any, the animation rows are left out. */
    readonly clips?: readonly ModelClip[];
    /** The model's own values (`AssetRecord.defaults.style`): an unset row shows them as its default. */
    readonly inherited?: Readonly<Partial<Record<Channel, ChannelValue>>>;
}

/**
 * Model settings' rows (node-models design 13.3): one compact property row each, an unset one
 * showing graphty-element's default as its placeholder, a set one with its minus. The element's
 * `W_MODEL_UP_GUESSED` and `W_MODEL_COLOR_IGNORED` mark Up and Color with a chip. Shared by the
 * Model settings pop-over and the Load custom model dialog, which writes a draft. While a clip is
 * chosen, a Pose slider under Animation picks the moment of it the model holds.
 * @param props - Component props
 * @param props.channels - the rows
 * @param props.values - each row's value
 * @param props.problems - the model's problems
 * @param props.write - writes a value
 * @param props.remove - takes a value back
 * @param props.clips - the model's clips
 * @param props.inherited - the model's own values
 * @returns The rows
 */
export function SettingRows({
    channels,
    values,
    problems,
    write,
    remove,
    clips = [],
    inherited = {},
}: Readonly<SettingRowsProps>): React.JSX.Element {
    const shown = MODEL_SETTING_ROWS.filter(
        (row) => channels.includes(row.channel) && (clips.length > 0 || !ANIMATION_CHANNELS.has(row.channel)),
    );
    const clip = clips.find((c) => c.name === (values["node.modelAnimation"] ?? inherited["node.modelAnimation"]));
    const offset = values["node.modelAnimationOffset"];
    return (
        <Stack gap={4} className="ws-model-settings">
            {shown.map(({ channel, word, choices, unit, step }) => {
                const value = values[channel];
                const chip = MODEL_SETTING_CHIPS[channel];
                const flagged = chip !== undefined && problems.some((p) => p.code === chip.code);
                const removeName = `Remove model ${word.toLowerCase()}`;
                return (
                    <div key={channel} className="ws-row" data-line={channel}>
                        <div className="ws-field" data-named="">
                            <span className="ws-field-label">
                                <span className="ws-field-name" title={word} aria-hidden>
                                    {word}
                                </span>
                            </span>
                            <div className="ws-field-control">
                                <SettingControl
                                    descriptor={channelsFor("node").find((d) => d.channel === channel)}
                                    word={word}
                                    choices={choicesOf(channel, choices, clips)}
                                    unit={unit}
                                    step={step}
                                    value={value}
                                    inherited={inherited[channel]}
                                    write={(next) => {
                                        write(channel, next);
                                        // A clip chosen plays: over a pose held still (Speed 0, set here or
                                        // inherited from the model) it would stay frozen at the pose (L11).
                                        const speed =
                                            values["node.modelAnimationSpeed"] ?? inherited["node.modelAnimationSpeed"];
                                        if (channel === "node.modelAnimation" && next !== "" && speed === 0) {
                                            write("node.modelAnimationSpeed", 1);
                                            write("node.modelAnimationOffset", 0);
                                        }
                                    }}
                                />
                            </div>
                            <span className="ws-slot">
                                {value === undefined ? null : (
                                    <Tooltip label={removeName}>
                                        <ActionIcon
                                            variant="subtle"
                                            size="sm"
                                            aria-label={removeName}
                                            onClick={() => {
                                                remove(channel);
                                            }}
                                        >
                                            <GLYPHS.remove size={14} aria-hidden />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </span>
                        </div>
                        {flagged ? (
                            <div className="ws-model-chips">
                                <ModelChip chip={{ word: chip.word, tip: chip.tip }} tone="warning" />
                            </div>
                        ) : null}
                        {channel === "node.modelAnimation" && clip !== undefined ? (
                            <PoseRow
                                seconds={clip.seconds}
                                value={typeof offset === "number" ? offset : 0}
                                write={(next) => {
                                    write("node.modelAnimationOffset", next);
                                    if (values["node.modelAnimationSpeed"] !== 0) {
                                        write("node.modelAnimationSpeed", 0);
                                    }
                                }}
                            />
                        ) : null}
                    </div>
                );
            })}
        </Stack>
    );
}

/**
 * Model settings (node-models design 13.3): Up, Turn, Color, Fit, Center, the animation rows for a
 * model with clips, Sides and Light, opened by the Shape
 * line's Model settings button while the field holds a model, written to the line's layer.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.model - what the layer's `node.model` names
 * @returns The rows
 */
export function ModelSettings({ ctx, model }: Readonly<{ ctx: RowContext; model: string }>): React.JSX.Element {
    const { store } = useWorkspace();
    const { session } = ctx;
    const states = useModelStates(session);
    const problems: readonly CodedFact[] = [
        ...(states.find((change) => change.ref === model)?.problems ?? []),
        ...(session.assets.find(model)?.problems ?? []),
    ];
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords("Model setting", "changed", error), error: true } });
    };
    const owned = (channel: Channel): ReturnType<typeof lineIn> => {
        const line = lineIn(ctx, channel);
        return line?.layer.locked === true ? undefined : line;
    };
    return (
        <SettingRows
            channels={MODEL_SETTING_ROWS.map((row) => row.channel)}
            values={Object.fromEntries(MODEL_SETTING_ROWS.map((row) => [row.channel, owned(row.channel)?.value]))}
            problems={problems}
            write={(channel, next) => {
                writeIn(ctx, channel, { value: next }).catch(fail);
            }}
            remove={(channel) => {
                const own = owned(channel);
                if (own !== undefined) {
                    removeLine(session, own.layer, channel).catch(fail);
                }
            }}
            clips={clipsOf(session, model)}
            // eslint-disable-next-line unicorn/no-array-callback-reference -- the session's find, not Array.find
            inherited={session.assets.find(model)?.defaults?.style}
        />
    );
}
