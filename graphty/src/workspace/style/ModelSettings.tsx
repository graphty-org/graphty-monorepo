import { ComboInput, PanelField } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue } from "@graphty/graphty-element/schema";
import type { CodedFact } from "@graphty/graphty-element/session";
import { ActionIcon, Stack, Tooltip } from "@mantine/core";
import React from "react";

import { useModelStates } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { ModelChip } from "./ModelChip";
import type { RowContext } from "./PropertyRow";
import { lineIn, removeLine, writeIn } from "./row";
import { failureWords, MODEL_SETTING_CHIPS, MODEL_SETTING_ROWS } from "./words";

/**
 * A choice's value as a layer holds it: Color takes true and false as yes-or-no, "replace" as words.
 * @param channel - the property.
 * @param value - the chosen value's key.
 * @returns the value to write.
 */
function parsed(channel: Channel, value: string): ChannelValue {
    if (channel === "node.modelTint" && (value === "true" || value === "false")) {
        return value === "true";
    }
    return value;
}

/** One Model settings row's control. */
interface SettingControlProps {
    readonly descriptor: ChannelDescriptor | undefined;
    readonly word: string;
    readonly choices: readonly (readonly [string, string])[] | undefined;
    readonly value: unknown;
    readonly write: (next: ChannelValue) => void;
}

/**
 * A Model settings row's field: Turn's number in degrees, or a choice. An unset one shows
 * graphty-element's default as its placeholder, and is named by it. An arrow key on an empty Turn
 * steps from its minimum, not the placeholder, until compact-mantine's number field takes an
 * origin (issue #6233).
 * @param props - Component props
 * @param props.descriptor - the property
 * @param props.word - the row's word
 * @param props.choices - each value's key and word, for a choice
 * @param props.value - the value set here
 * @param props.write - writes a value
 * @returns The field
 */
function SettingControl({ descriptor, word, choices, value, write }: Readonly<SettingControlProps>): React.JSX.Element {
    const fallback = descriptor?.default;
    if (choices === undefined) {
        const shown = typeof fallback === "number" ? String(fallback) : "";
        return (
            <ComboInput
                label={typeof value === "number" ? word : `${word}, default ${shown} deg`}
                width="100%"
                numeric
                options={[]}
                value={typeof value === "number" ? value : ""}
                placeholder={shown === "" ? undefined : shown}
                suffix="deg"
                min={descriptor?.min}
                max={descriptor?.max}
                step={1}
                onChange={(next) => {
                    if (typeof next === "number") {
                        write(next);
                    }
                }}
            />
        );
    }
    const chosen = typeof value === "string" || typeof value === "boolean" ? String(value) : undefined;
    const unsetWord = choices.find(([key]) => key === String(fallback))?.[1];
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
                write(parsed(descriptor?.channel ?? "node.model", String(next)));
            }}
        />
    );
}

/**
 * Model settings (node-models design 13.3): one compact property row each for Up, Turn, Color, Fit
 * and Center, opened by the Shape line's Model settings button while the field holds a model. An
 * unset row shows graphty-element's default as its placeholder; a set one has its minus. The
 * element's `W_MODEL_UP_GUESSED` and `W_MODEL_COLOR_IGNORED` mark Up and Color with a chip.
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
    return (
        <Stack gap={4} className="ws-model-settings">
            {MODEL_SETTING_ROWS.map(({ channel, word, choices }) => {
                const line = lineIn(ctx, channel);
                const own = line?.layer.locked === true ? undefined : line;
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
                                    choices={choices}
                                    value={own?.value}
                                    write={(next) => {
                                        writeIn(ctx, channel, { value: next }).catch(fail);
                                    }}
                                />
                            </div>
                            <span className="ws-slot">
                                {own === undefined ? null : (
                                    <Tooltip label={removeName}>
                                        <ActionIcon
                                            variant="subtle"
                                            size="sm"
                                            aria-label={removeName}
                                            onClick={() => {
                                                removeLine(session, own.layer, channel).catch(fail);
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
                    </div>
                );
            })}
        </Stack>
    );
}
