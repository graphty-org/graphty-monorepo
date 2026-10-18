/**
 * The sample library's two dialogs: what a large dataset costs to open, before it downloads, and a
 * generator's parameters, before it builds a graph.
 */

import type { DatasetMeta, GeneratorDescriptor, GeneratorParamDescriptor } from "@graphty/graph-samples";
import type { GeneratorParams } from "@graphty/graph-samples/generators";
import { DEFAULT_LIMITS } from "@graphty/graphty-element/session";
import { Anchor, Button, Group, Modal, NumberInput, Select, Stack, Switch, Text } from "@mantine/core";
import React, { useState } from "react";

import { countWords, fitsInBrowser, megabytes } from "./library";

/**
 * What opening a large dataset takes, asked before it downloads; for one too large for the
 * browser, why it does not open.
 * @param props - Component props
 * @param props.dataset - The dataset, or null when the dialog is closed
 * @param props.onOpen - Opens it
 * @param props.onClose - Closes the dialog
 * @returns The dialog
 */
export function DatasetDialog({
    dataset,
    onOpen,
    onClose,
}: Readonly<{
    dataset: DatasetMeta | null;
    onOpen: (dataset: DatasetMeta) => void;
    onClose: () => void;
}>): React.JSX.Element {
    const fits = dataset === null || fitsInBrowser(dataset);
    const size =
        dataset === null
            ? ""
            : `${countWords(dataset.nodes)} nodes and ${countWords(dataset.edges)} edges${
                  dataset.bytes === undefined ? "." : `, a ${megabytes(dataset.bytes)} download.`
              }`;
    return (
        <Modal opened={dataset !== null} onClose={onClose} title={dataset?.title ?? ""} centered>
            {dataset === null ? null : (
                <Stack gap="sm">
                    <Text size="sm">{size}</Text>
                    {fits ? (
                        <Text size="sm">
                            A graph this size takes a while to open: first the download, then laying it out and drawing
                            it. Expect anything from several seconds to a minute or two, depending on your computer.
                        </Text>
                    ) : (
                        <Text size="sm">
                            That is more than graphty can draw in a browser, which holds up to{" "}
                            {countWords(DEFAULT_LIMITS.renderCeiling)} nodes and {countWords(DEFAULT_LIMITS.edgesDrawn)}{" "}
                            edges, so it cannot be opened here.
                        </Text>
                    )}
                    <Text size="xs" c="dimmed">
                        Source:{" "}
                        <Anchor href={dataset.source} target="_blank" rel="noopener noreferrer" size="xs">
                            {new URL(dataset.source).hostname}
                        </Anchor>
                        . {dataset.license}
                    </Text>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={onClose}>
                            {fits ? "Cancel" : "Close"}
                        </Button>
                        {fits ? (
                            <Button
                                onClick={() => {
                                    onOpen(dataset);
                                }}
                            >
                                Open
                            </Button>
                        ) : null}
                    </Group>
                </Stack>
            )}
        </Modal>
    );
}

/**
 * Every parameter at its default.
 * @param generator - The generator.
 * @returns The values.
 */
function defaultsOf(generator: GeneratorDescriptor): Record<string, number | boolean | string> {
    return Object.fromEntries(generator.params.map((param) => [param.name, param.default]));
}

/**
 * One parameter's control.
 * @param props - Component props
 * @param props.param - The parameter
 * @param props.value - Its value
 * @param props.onChange - Takes a new value
 * @returns The control
 */
function ParamControl({
    param,
    value,
    onChange,
}: Readonly<{
    param: GeneratorParamDescriptor;
    value: number | boolean | string;
    onChange: (value: number | boolean | string) => void;
}>): React.JSX.Element {
    if (param.type === "boolean") {
        return (
            <Switch
                label={param.plainName}
                checked={value === true}
                onChange={(event) => {
                    onChange(event.currentTarget.checked);
                }}
            />
        );
    }
    if (param.type === "choice") {
        return (
            <Select
                label={param.plainName}
                data={[...(param.choices ?? [])]}
                value={String(value)}
                allowDeselect={false}
                onChange={(next) => {
                    if (next !== null) {
                        onChange(next);
                    }
                }}
            />
        );
    }
    return (
        <NumberInput
            label={param.plainName}
            value={value as number}
            min={param.min}
            max={param.max}
            allowDecimal={param.type === "number"}
            step={param.type === "number" && (param.max ?? Infinity) <= 1 ? 0.01 : 1}
            onChange={(next) => {
                if (typeof next === "number") {
                    onChange(next);
                }
            }}
        />
    );
}

/**
 * A generator's parameters at their defaults, and Generate, which opens the graph it builds.
 * @param props - Component props
 * @param props.generator - The generator, or null when the dialog is closed
 * @param props.onGenerate - Opens the graph
 * @param props.onClose - Closes the dialog
 * @returns The dialog
 */
export function GeneratorDialog({
    generator,
    onGenerate,
    onClose,
}: Readonly<{
    generator: GeneratorDescriptor | null;
    onGenerate: (generator: GeneratorDescriptor, params: GeneratorParams) => void;
    onClose: () => void;
}>): React.JSX.Element {
    return (
        <Modal opened={generator !== null} onClose={onClose} title={generator?.plainName ?? ""} centered>
            {/* Keyed, so each generator starts from its own defaults. */}
            {generator === null ? null : (
                <GeneratorForm key={generator.name} generator={generator} onGenerate={onGenerate} onClose={onClose} />
            )}
        </Modal>
    );
}

/**
 * The parameters and the buttons, for one generator.
 * @param props - Component props
 * @param props.generator - The generator
 * @param props.onGenerate - Opens the graph
 * @param props.onClose - Closes the dialog
 * @returns The form
 */
function GeneratorForm({
    generator,
    onGenerate,
    onClose,
}: Readonly<{
    generator: GeneratorDescriptor;
    onGenerate: (generator: GeneratorDescriptor, params: GeneratorParams) => void;
    onClose: () => void;
}>): React.JSX.Element {
    const [values, setValues] = useState(() => defaultsOf(generator));
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onGenerate(generator, values);
            }}
        >
            <Stack gap="sm">
                <Text size="sm">{generator.description}</Text>
                {generator.params.length === 0 ? (
                    <Text size="sm" c="dimmed">
                        This graph is always the same, so there is nothing to set.
                    </Text>
                ) : (
                    generator.params.map((param) => (
                        <ParamControl
                            key={param.name}
                            param={param}
                            value={values[param.name] ?? param.default}
                            onChange={(value) => {
                                setValues((before) => ({ ...before, [param.name]: value }));
                            }}
                        />
                    ))
                )}
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit">Generate</Button>
                </Group>
            </Stack>
        </form>
    );
}
