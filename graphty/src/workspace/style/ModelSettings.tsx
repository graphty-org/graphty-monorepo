import { ComboInput, PanelField } from "@graphty/compact-mantine";
import { channelsFor } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue } from "@graphty/graphty-element/schema";
import { ActionIcon, Badge, Stack, Tooltip } from "@mantine/core";
import React from "react";

import { useModelStates } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
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

/**
 * Model settings (node-models design 13.3): one compact property row each for Up, Turn, Color, Fit
 * and Center, opened by the Shape row's settings button while the field holds a model. An unset row
 * shows graphty-element's default as its placeholder; a set one has its minus. The element's
 * `W_MODEL_UP_GUESSED` and `W_MODEL_COLOR_IGNORED` mark Up and Color with a chip.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.model - what the layer's `node.model` names
 * @returns The rows
 */
export function ModelSettings({ ctx, model }: Readonly<{ ctx: RowContext; model: string }>): React.JSX.Element {
    const { store } = useWorkspace();
    const { session } = ctx;
    const states = useModelStates(session);
    const record = session.assets.list().find((r) => r.id === model || r.url === model);
    const problems = [...(states.find((change) => change.ref === model)?.problems ?? []), ...(record?.problems ?? [])];
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords("Model setting", "changed", error), error: true } });
    };
    return (
        <Stack gap={4} className="ws-model-settings">
            {MODEL_SETTING_ROWS.map(({ channel, word, choices }) => {
                const descriptor = channelsFor("node").find((d) => d.channel === channel);
                const line = lineIn(ctx, channel);
                const own = line?.layer.locked === true ? undefined : line;
                const value = own?.value;
                const fallback = descriptor?.default;
                const chip = MODEL_SETTING_CHIPS[channel];
                const flagged = chip !== undefined && problems.some((p) => p.code === chip.code);
                const write = (next: ChannelValue): void => {
                    writeIn(ctx, channel, { value: next }).catch(fail);
                };
                let control: React.ReactNode;
                if (choices === undefined) {
                    control = (
                        <ComboInput
                            label={word}
                            width="100%"
                            numeric
                            variant="outlined"
                            options={[]}
                            value={typeof value === "number" ? value : ""}
                            placeholder={typeof fallback === "number" ? String(fallback) : undefined}
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
                } else {
                    const chosen = typeof value === "string" || typeof value === "boolean" ? String(value) : undefined;
                    const unsetWord = choices.find(([key]) => key === String(fallback))?.[1];
                    const chosenWord = choices.find(([key]) => key === chosen)?.[1];
                    control = (
                        <PanelField
                            label={`${word}, ${chosenWord ?? `default ${unsetWord ?? ""}`}`}
                            kind="select"
                            width="fill"
                            data={choices.map(([key, label]) => ({ value: key, label }))}
                            value={chosen ?? null}
                            placeholder={chosen === undefined ? unsetWord : undefined}
                            onChange={(next) => {
                                write(parsed(channel, String(next)));
                            }}
                        />
                    );
                }
                const removeName = `Remove model ${word.toLowerCase()}`;
                return (
                    <div key={channel} className="ws-row" data-line={channel}>
                        <div className="ws-field" data-named="">
                            <span className="ws-field-label">
                                <span className="ws-field-name" title={word} aria-hidden>
                                    {word}
                                </span>
                            </span>
                            <div className="ws-field-control">{control}</div>
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
                            <Tooltip label={chip.tip}>
                                <Badge size="xs" color="yellow" variant="light" ml={56} role="status">
                                    {chip.word}
                                </Badge>
                            </Tooltip>
                        ) : null}
                    </div>
                );
            })}
        </Stack>
    );
}
