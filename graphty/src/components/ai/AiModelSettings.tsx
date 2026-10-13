/**
 * Settings > AI providers, inside one provider's row: the model the assistant uses with that
 * provider, and the options the model takes. Every choice offered is a fact graphty-element's
 * catalog gives (`AiModelDescriptor`): its models, which reasoning setting each takes, and whether it
 * honors a temperature. An empty field is the provider's own default.
 */

import { PANEL_GRID } from "@graphty/compact-mantine";
import {
    type AiModelDescriptor,
    aiProviderDescriptor,
    type AiProviderId,
    type AiReasoningEffort,
} from "@graphty/graphty-element/catalog";
import { Box, NativeSelect, NumberInput } from "@mantine/core";
import React from "react";

import type { AiModelChoice } from "../../workspace/settings/preferences";

/** The width of each field: a name or a number, never a sentence. */
const FIELD_WIDTH = 240;

/** The app's words for each reasoning effort. */
const EFFORT_WORDS: Readonly<Record<AiReasoningEffort, string>> = {
    minimal: "Minimal",
    low: "Low",
    medium: "Medium",
    high: "High",
};

/** The empty choice's words: the provider decides. */
const PROVIDER_DEFAULT = "Provider default";

/** How far one press of a number field's arrows moves the thinking budget. */
const BUDGET_STEP = 1024;

/**
 * A number field's value as an option: a finite number, or absent for an empty field.
 * @param value - What the field reported.
 * @returns The number, or undefined.
 */
function numberOrUnset(value: string | number): number | undefined {
    const parsed = typeof value === "number" ? value : Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * The choice with only the options the model takes: a model change drops what the new model
 * cannot take, so nothing it would refuse or ignore is sent.
 * @param choice - The reader's choice.
 * @param model - The model it is for.
 * @returns The choice, trimmed.
 */
function fitted(choice: AiModelChoice, model: AiModelDescriptor | undefined): AiModelChoice {
    const reasoning = model?.reasoning;
    const efforts = reasoning !== undefined && "efforts" in reasoning ? reasoning.efforts : [];
    const { reasoningEffort, thinkingBudgetTokens, temperature, ...rest } = choice;
    return {
        ...rest,
        ...(reasoningEffort !== undefined && efforts.includes(reasoningEffort) && { reasoningEffort }),
        ...(thinkingBudgetTokens !== undefined &&
            reasoning !== undefined &&
            "budgetTokens" in reasoning && { thinkingBudgetTokens }),
        ...(temperature !== undefined && model?.temperature !== undefined && { temperature }),
    };
}

/**
 * The model and its options for one provider.
 * @param props - The provider, the reader's choice, and where a change goes.
 * @param props.provider - The provider.
 * @param props.choice - The reader's choice for it.
 * @param props.onChange - Called with the whole new choice.
 * @returns The fields.
 */
export function AiModelSettings({
    provider,
    choice,
    onChange,
}: {
    readonly provider: AiProviderId;
    readonly choice: AiModelChoice;
    readonly onChange: (choice: AiModelChoice) => void;
}): React.JSX.Element {
    const descriptor = aiProviderDescriptor(provider);
    const modelId = choice.model ?? descriptor.defaultModel;
    const model = descriptor.models.find((entry) => entry.id === modelId);
    const defaultModel = descriptor.models.find((entry) => entry.id === descriptor.defaultModel);
    const reasoning = model?.reasoning;

    return (
        <Box
            data-testid={`ai-model-settings-${provider}`}
            style={{ display: "flex", flexWrap: "wrap", gap: PANEL_GRID.TRAIL_GAP }}
        >
            <Box style={{ width: FIELD_WIDTH }}>
                <NativeSelect
                    label="Model"
                    data-testid={`ai-model-${provider}`}
                    value={choice.model ?? ""}
                    data={[
                        {
                            value: "",
                            label: `${PROVIDER_DEFAULT} (${defaultModel?.plainName ?? descriptor.defaultModel})`,
                        },
                        ...descriptor.models.map((entry) => ({ value: entry.id, label: entry.plainName })),
                    ]}
                    onChange={(event) => {
                        const next = event.currentTarget.value;
                        const { model: _old, ...rest } = choice;
                        const nextModel = descriptor.models.find(
                            (entry) => entry.id === (next === "" ? descriptor.defaultModel : next),
                        );
                        onChange(fitted(next === "" ? rest : { ...rest, model: next }, nextModel));
                    }}
                />
            </Box>

            {reasoning !== undefined && "efforts" in reasoning && (
                <Box style={{ width: FIELD_WIDTH }}>
                    <NativeSelect
                        label="Reasoning"
                        data-testid={`ai-reasoning-${provider}`}
                        value={choice.reasoningEffort ?? ""}
                        data={[
                            { value: "", label: PROVIDER_DEFAULT },
                            ...reasoning.efforts.map((effort) => ({ value: effort, label: EFFORT_WORDS[effort] })),
                        ]}
                        onChange={(event) => {
                            const next = event.currentTarget.value as AiReasoningEffort | "";
                            const { reasoningEffort: _old, ...rest } = choice;
                            onChange(next === "" ? rest : { ...rest, reasoningEffort: next });
                        }}
                    />
                </Box>
            )}

            {reasoning !== undefined && "budgetTokens" in reasoning && (
                <Box style={{ width: FIELD_WIDTH }}>
                    <NumberInput
                        key={modelId}
                        label="Thinking budget (tokens)"
                        placeholder="Off"
                        data-testid={`ai-thinking-budget-${provider}`}
                        min={reasoning.budgetTokens.min}
                        step={BUDGET_STEP}
                        allowDecimal={false}
                        allowNegative={false}
                        defaultValue={choice.thinkingBudgetTokens ?? ""}
                        // Committed when the field is left, not on every keystroke: each change
                        // switches the assistant on again.
                        onBlur={(event) => {
                            const value = numberOrUnset(event.currentTarget.value);
                            const { thinkingBudgetTokens: _old, ...rest } = choice;
                            onChange(
                                value === undefined
                                    ? rest
                                    : { ...rest, thinkingBudgetTokens: Math.max(reasoning.budgetTokens.min, value) },
                            );
                        }}
                    />
                </Box>
            )}

            {model?.temperature !== undefined && (
                <Box style={{ width: FIELD_WIDTH }}>
                    <NumberInput
                        key={modelId}
                        label="Temperature"
                        placeholder={PROVIDER_DEFAULT}
                        data-testid={`ai-temperature-${provider}`}
                        min={model.temperature.min}
                        max={model.temperature.max}
                        step={0.1}
                        decimalScale={2}
                        allowNegative={false}
                        clampBehavior="strict"
                        defaultValue={choice.temperature ?? ""}
                        onBlur={(event) => {
                            const value = numberOrUnset(event.currentTarget.value);
                            const { temperature: _old, ...rest } = choice;
                            onChange(value === undefined ? rest : { ...rest, temperature: value });
                        }}
                    />
                </Box>
            )}
        </Box>
    );
}
