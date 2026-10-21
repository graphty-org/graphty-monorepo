import {
    type ShaderDescriptor,
    shaderParamChannel,
    type ShaderParams as Params,
} from "@graphty/graphty-element/catalog";
import type { Channel, ShaderParamAddress } from "@graphty/graphty-element/schema";
import { ActionIcon, Group, Stack, Text, Tooltip } from "@mantine/core";
import React, { useLayoutEffect, useRef } from "react";

import { GLYPHS } from "../glyphs";
import { OptionsForm } from "../options/OptionsForm";
import { useWorkspace } from "../state/WorkspaceContext";
import { type RowContext, VarySlot } from "./PropertyRow";
import { type DataBinding, sourceName } from "./row";
import { enumWords, failureWords, motionWords, usesWords } from "./words";

/** Props for ShaderParams. */
interface ShaderParamsProps {
    readonly ctx: RowContext;
    readonly descriptor: ShaderDescriptor;
    /** The map channel the parameters land in: `<target>.shaderParams` for a surface, `<target>.effects` for an effect. */
    readonly channel: Channel;
    /** The values the layer sets; a parameter left out draws its default. */
    readonly values: Params;
    /** The parameters the layer binds to data, by parameter id. */
    readonly bindings: Readonly<Record<string, DataBinding>>;
    /** Sets one parameter; undefined clears it back to its default. */
    readonly onChange: (name: string, value: Params[string] | undefined) => void;
    /** Stops a parameter varying by data. */
    readonly onUnbind: (name: string) => void;
}

/**
 * A shader row's settings pop-out (shader-styles design, section 6.3): one field per parameter the
 * catalog declares, drawn by the app's option form, with focus in the first one. A parameter that
 * varies has the vary glyph, which binds it per element with `encode` on its parameter's address;
 * a bound one names its source and unbinds. A set parameter's minus clears it to its default.
 * Under them, the Uses and Motion rows, read from the catalog.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the shader
 * @param props.channel - the map channel its parameters land in
 * @param props.values - the values the layer sets
 * @param props.bindings - the parameters bound to data
 * @param props.onChange - sets or clears one parameter
 * @param props.onUnbind - stops one varying
 * @returns The fields
 */
export function ShaderParams({
    ctx,
    descriptor,
    channel,
    values,
    bindings,
    onChange,
    onUnbind,
}: Readonly<ShaderParamsProps>): React.JSX.Element {
    const box = useRef<HTMLDivElement>(null);
    const { store } = useWorkspace();
    // The pop-out puts focus on the field marked to take it: the first parameter's.
    useLayoutEffect(() => {
        box.current?.querySelector<HTMLElement>("input, button")?.setAttribute("data-autofocus", "");
    }, []);
    const trailing = (option: (typeof descriptor.params)[number]): React.ReactNode => {
        const address = `${channel}.${descriptor.id}.${option.name}` as ShaderParamAddress;
        const bound = bindings[option.name];
        let vary: React.ReactNode = <span className="ws-slot" />;
        if (bound !== undefined) {
            vary = (
                <span className="ws-slot">
                    <Tooltip label={`Stop varying ${option.plainName.toLowerCase()} by data`}>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label={`Stop varying ${option.plainName.toLowerCase()} by data`}
                            onClick={() => {
                                onUnbind(option.name);
                            }}
                        >
                            <GLYPHS.unlink size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </span>
            );
        } else if (option.varies === true) {
            // The vary list reads the parameter as the element binds it: its own descriptor, under
            // its address, so a pick writes encode on that address.
            const paramDescriptor = { ...shaderParamChannel(address), channel: address as unknown as Channel };
            vary = (
                <VarySlot
                    ctx={ctx}
                    descriptor={paramDescriptor}
                    label={`${option.plainName} by attribute`}
                    onFail={(error) => {
                        store.set({
                            notice: { message: failureWords(option.plainName, "varied", error), error: true },
                        });
                    }}
                />
            );
        }
        const set = values[option.name] !== undefined;
        return (
            <>
                {vary}
                <span className="ws-slot">
                    {set && (
                        <Tooltip label={`Reset ${option.plainName.toLowerCase()}`}>
                            <ActionIcon
                                variant="subtle"
                                size="sm"
                                aria-label={`Reset ${option.plainName.toLowerCase()}`}
                                onClick={() => {
                                    onChange(option.name, undefined);
                                }}
                            >
                                <GLYPHS.remove size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    )}
                </span>
            </>
        );
    };
    const boundWords = Object.entries(bindings).map(([name, binding]) => {
        const param = descriptor.params.find((p) => p.name === name);
        return `${param?.plainName ?? name}: ${sourceName(ctx.session, binding) ?? binding.by}`;
    });
    return (
        <Stack ref={box} gap={8} className="ws-shader-params" data-shader={descriptor.id}>
            <OptionsForm
                session={ctx.session}
                options={descriptor.params}
                values={values}
                onChange={(name, value) => {
                    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
                        onChange(name, value);
                    }
                }}
                words={(option) => ({ label: option.plainName, choice: enumWords })}
                trailing={trailing}
            />
            {boundWords.map((words) => (
                <Text key={words} size="xs" c="var(--cm-text-secondary)" data-param-bound>
                    {words}
                </Text>
            ))}
            <Group gap={4} wrap="nowrap" data-testid="shader-uses">
                <Text size="xs" c="var(--cm-text-secondary)" w={56}>
                    Uses
                </Text>
                <Text size="xs">{usesWords(descriptor.reads)}</Text>
            </Group>
            <Group gap={4} wrap="nowrap" data-testid="shader-motion">
                <Text size="xs" c="var(--cm-text-secondary)" w={56}>
                    Motion
                </Text>
                <Text size="xs">{motionWords(descriptor)}</Text>
            </Group>
        </Stack>
    );
}
