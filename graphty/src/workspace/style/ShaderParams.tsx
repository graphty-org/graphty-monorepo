import { ComboInput, CompactColorInput, PanelField, useScrub } from "@graphty/compact-mantine";
import {
    type ShaderClockBinding,
    type ShaderDescriptor,
    shaderParamChannel,
    type ShaderParamDescriptor,
    type ShaderParamValue,
} from "@graphty/graphty-element/catalog";
import type { Channel, ShaderParamAddress } from "@graphty/graphty-element/schema";
import { ActionIcon, Text, Tooltip } from "@mantine/core";
import React, { useLayoutEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { type RowContext, VarySlot } from "./PropertyRow";
import { type DataBinding, sourceName } from "./row";
import { clockWords, colorName, enumWords, failureWords, SHADER_FACT_WORDS, usesWords } from "./words";

/** One parameter's value: a number, a color or a word, a switch, or a clock binding. */
type Value = ShaderParamValue;

/**
 * A value bound to a clock, as a use or a shader's default writes it.
 * @param value - a parameter's value.
 * @returns the binding, or undefined for a plain value.
 */
function clockOf(value: unknown): ShaderClockBinding | undefined {
    return typeof value === "object" && value !== null && "by" in value ? (value as ShaderClockBinding) : undefined;
}

/** Props for ShaderParams. */
interface ShaderParamsProps {
    /** The row, for the vary glyph; left out (the background), a parameter does not vary. */
    readonly ctx?: RowContext;
    readonly descriptor: ShaderDescriptor;
    /** The list channel the use is on (`node.shaders`, `edge.shaders`), whose address a binding to data takes. */
    readonly channel?: Channel;
    /** The values the layer sets; a parameter left out draws its default. */
    readonly values: Readonly<Record<string, Value>>;
    /** The parameters the layer binds to data, by parameter id. */
    readonly bindings?: Readonly<Record<string, DataBinding>>;
    /** Sets one parameter; undefined clears it back to its default. */
    readonly onChange: (name: string, value: Value | undefined) => void;
    /** Stops a parameter varying by data. */
    readonly onUnbind?: (name: string) => void;
}

/** How far a whole bounded range is scrubbed across, in CSS pixels. */
const SCRUB_RANGE_PX = 200;

/**
 * A number parameter's bounds, where they are numbers.
 * @param option - the parameter.
 * @returns its smallest and largest values.
 */
function boundsOf(option: ShaderParamDescriptor): { min?: number; max?: number } {
    return {
        ...(typeof option.min === "number" ? { min: option.min } : {}),
        ...(typeof option.max === "number" ? { max: option.max } : {}),
    };
}

/**
 * A number parameter's one arrow step: its own, 1 for an integer, else a hundredth of its range.
 * @param option - the parameter.
 * @returns the step.
 */
function stepOf(option: ShaderParamDescriptor): number {
    if (option.step !== undefined) {
        return option.step;
    }
    if (option.type === "integer") {
        return 1;
    }
    const { min, max } = boundsOf(option);
    return min !== undefined && max !== undefined && max > min ? Math.max((max - min) / 100, 0.001) : 0.1;
}

/**
 * A value on a parameter's grid: inside its bounds and rounded to its step's decimals.
 * @param option - the parameter.
 * @param value - the value.
 * @returns the value on the grid.
 */
function onGrid(option: ShaderParamDescriptor, value: number): number {
    const { min: lo = -Infinity, max: hi = Infinity } = boundsOf(option);
    const step = stepOf(option);
    const decimals = Math.max(0, Math.min(6, Math.ceil(-Math.log10(step))));
    const clamped = Math.min(hi, Math.max(lo, value));
    return Number((option.type === "integer" ? Math.round(clamped) : clamped).toFixed(decimals));
}

/**
 * A number parameter's control: the panel's number field, bounded by the parameter's range and
 * step, and the label column scrubs it (Figma's label scrub): the value follows the drag live and
 * is written once on release, so a drag is one undo step. A bounded range is crossed in 200 px.
 * @param props - Component props
 * @param props.option - the parameter
 * @param props.label - its name
 * @param props.value - the value in force
 * @param props.onCommit - writes a value
 * @param props.children - the label column
 * @returns The label column and the field
 */
function NumberParam({
    option,
    label,
    value,
    onCommit,
    children,
}: Readonly<{
    option: ShaderParamDescriptor;
    label: string;
    value: number | undefined;
    onCommit: (value: number) => void;
    children: (scrub: ReturnType<typeof useScrub>) => React.ReactNode;
}>): React.JSX.Element {
    const [live, setLive] = useState<number | null>(null);
    const base = useRef(0);
    const latest = useRef<number | null>(null);
    const { min, max } = boundsOf(option);
    const rate =
        min !== undefined && max !== undefined && max > min ? (max - min) / SCRUB_RANGE_PX : stepOf(option) / 2;
    const scrub = useScrub(true, document.dir === "rtl", {
        onStart: () => {
            base.current = value ?? 0;
            latest.current = null;
        },
        onMove: (_delta, total) => {
            latest.current = onGrid(option, base.current + total * rate);
            setLive(latest.current);
        },
        onEnd: () => {
            const next = latest.current;
            latest.current = null;
            setLive(null);
            if (next !== null && next !== value) {
                onCommit(next);
            }
        },
    });
    return (
        <>
            {children(scrub)}
            <div className="ws-field-control">
                <ComboInput
                    label={label}
                    width="100%"
                    numeric
                    variant="outlined"
                    options={[]}
                    value={live ?? value ?? ""}
                    min={min}
                    max={max}
                    step={stepOf(option)}
                    onChange={(next) => {
                        if (typeof next === "number") {
                            onCommit(onGrid(option, next));
                        }
                    }}
                />
            </div>
        </>
    );
}

/**
 * The pictures of an integer parameter that picks one of a set (an icon, a pattern): a grid of
 * its choices' glyphs, the one in force pressed.
 * @param props - Component props
 * @param props.option - the parameter
 * @param props.label - its name
 * @param props.value - the value in force
 * @param props.onPick - writes a value
 * @returns The grid
 */
function ChoiceGrid({
    option,
    label,
    value,
    onPick,
}: Readonly<{
    option: ShaderParamDescriptor;
    label: string;
    value: unknown;
    onPick: (value: number) => void;
}>): React.JSX.Element {
    return (
        <div // NOSONAR(S6819): an ARIA group naming a row of toggle buttons; a fieldset would draw its own border and legend
            className="ws-param-choices"
            role="group"
            aria-label={label}
        >
            {(option.choices ?? []).map((choice) => (
                <Tooltip key={choice.value} label={choice.plainName}>
                    <ActionIcon
                        variant={choice.value === value ? "light" : "subtle"}
                        size="sm"
                        aria-label={choice.plainName}
                        aria-pressed={choice.value === value}
                        data-choice={choice.value}
                        onClick={() => {
                            onPick(choice.value);
                        }}
                    >
                        <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
                            <path
                                d={choice.glyph.path}
                                fill={choice.glyph.outline === true ? "none" : "currentColor"}
                                fillRule="evenodd"
                                stroke={choice.glyph.outline === true ? "currentColor" : "none"}
                                strokeWidth={2}
                            />
                        </svg>
                    </ActionIcon>
                </Tooltip>
            ))}
        </div>
    );
}

/**
 * A parameter's value as a list control reads it: an enum's string, a boolean as "on" / "off".
 * @param option - the parameter.
 * @param value - its value.
 * @returns the list's value.
 */
function listValue(option: ShaderParamDescriptor, value: unknown): string | null {
    if (option.type === "boolean") {
        return value === true ? "on" : "off";
    }
    return typeof value === "string" ? value : null;
}

/** Props for one parameter's row. */
interface ParamRowProps {
    readonly ctx: RowContext | undefined;
    readonly channel: Channel | undefined;
    readonly descriptor: ShaderDescriptor;
    readonly option: ShaderParamDescriptor;
    readonly value: Value | undefined;
    readonly binding: DataBinding | undefined;
    readonly onChange: (name: string, value: Value | undefined) => void;
    readonly onUnbind: ((name: string) => void) | undefined;
}

/**
 * One parameter as the panel's property row (the owner's style panel design, 2026-10-13): its name
 * in the label column, its field, the vary glyph, and one minus that takes a set value back to its
 * default. A bound parameter names its source, and its vary glyph stops the varying.
 * @param props - Component props
 * @param props.ctx - the row, for the vary glyph
 * @param props.channel - the map channel the parameters land in
 * @param props.descriptor - the shader
 * @param props.option - the parameter
 * @param props.value - the value the layer sets
 * @param props.binding - the parameter's binding to data
 * @param props.onChange - sets or clears it
 * @param props.onUnbind - stops it varying
 * @returns The row
 */
function ParamRow({
    ctx,
    channel,
    descriptor,
    option,
    value,
    binding,
    onChange,
    onUnbind,
}: Readonly<ParamRowProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const label = option.plainName;
    const lower = option.plainName.toLowerCase();
    const shown = value ?? (option.default as Value | undefined);
    const set = value !== undefined;
    const write = (next: Value): void => {
        onChange(option.name, next);
    };

    let vary: React.ReactNode = <span className="ws-slot ws-vary" />;
    if (binding !== undefined && onUnbind !== undefined) {
        vary = (
            <span className="ws-slot ws-vary">
                <Tooltip label={`Stop varying ${lower} by data`}>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        aria-label={`Stop varying ${lower} by data`}
                        onClick={() => {
                            onUnbind(option.name);
                        }}
                    >
                        <GLYPHS.unlink size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </span>
        );
    } else if (option.varies === true && ctx !== undefined && channel !== undefined) {
        // The vary list reads the parameter as the element binds it: its own descriptor, under
        // its address, so a pick writes encode on that address.
        const address = `${channel}.${descriptor.id}.${option.name}` as ShaderParamAddress;
        vary = (
            <VarySlot
                ctx={ctx}
                descriptor={{ ...shaderParamChannel(address), channel: address as unknown as Channel }}
                label={`${option.plainName} by attribute`}
                onFail={(error) => {
                    store.set({ notice: { message: failureWords(option.plainName, "varied", error), error: true } });
                }}
            />
        );
    }
    const minus = (
        <span className="ws-slot">
            {set && binding === undefined && (
                <Tooltip label={`Reset ${lower}`} position="top">
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        aria-label={`Reset ${lower}`}
                        onClick={() => {
                            onChange(option.name, undefined);
                        }}
                    >
                        <GLYPHS.remove size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            )}
        </span>
    );
    const name = (scrub?: ReturnType<typeof useScrub>): React.ReactNode => (
        <span className="ws-field-label" data-scrub={scrub === undefined ? undefined : ""} {...scrub}>
            <span className="ws-field-name" title={label} aria-hidden>
                {label}
            </span>
        </span>
    );
    const numeric = (option.type === "number" || option.type === "integer") && option.choices === undefined;

    const clock = clockOf(shown);
    let body: React.ReactNode;
    if (clock !== undefined && binding === undefined) {
        // A parameter bound to a clock is an ordinary row whose value shows the binding.
        body = (
            <>
                {name()}
                <div className="ws-field-control">
                    <Text size="xs" truncate data-param-clock title={clockWords(clock)}>
                        {clockWords(clock)}
                    </Text>
                </div>
            </>
        );
    } else if (binding !== undefined) {
        body = (
            <>
                {name()}
                <div className="ws-field-control">
                    <Text size="xs" truncate data-param-bound>
                        {ctx === undefined ? binding.by : (sourceName(ctx.session, binding) ?? binding.by)}
                    </Text>
                </div>
            </>
        );
    } else if (numeric) {
        body = (
            <NumberParam
                option={option}
                label={label}
                value={typeof shown === "number" ? shown : undefined}
                onCommit={write}
            >
                {(scrub) => name(scrub)}
            </NumberParam>
        );
    } else {
        const control = paramControl(ctx, option, label, shown, write);
        body = (
            <>
                {name()}
                <div className="ws-field-control">{control}</div>
            </>
        );
    }
    return (
        <div className="ws-row" data-option={option.name} data-set={set ? "" : undefined}>
            <div className="ws-field ws-varies" data-named="">
                {body}
                {vary}
                {minus}
            </div>
        </div>
    );
}

/**
 * A parameter's control, for one that is not a number: its choices as a grid of glyphs, a color
 * chip, or a select of its values (On and Off for a boolean).
 * @param ctx - the row, for its document colors
 * @param option - the parameter
 * @param label - its name
 * @param shown - the value shown
 * @param write - sets it
 * @returns The control
 */
function paramControl(
    ctx: RowContext | undefined,
    option: ShaderParamDescriptor,
    label: string,
    shown: unknown,
    write: (next: Value) => void,
): React.ReactNode {
    let control: React.ReactNode;
    if (option.choices !== undefined) {
        control = <ChoiceGrid option={option} label={label} value={shown} onPick={write} />;
    } else if (option.type === "color") {
        const hex = typeof shown === "string" ? shown.toUpperCase() : "#000000";
        control = (
            <CompactColorInput
                aria-label={label}
                valueText={colorName(hex)}
                width="100%"
                color={hex}
                defaultColor={hex}
                showOpacity={false}
                showReset={false}
                swatches={ctx?.documentColors}
                onChangeEnd={(next) => {
                    if (next !== undefined && next.toUpperCase() !== hex) {
                        write(next.toUpperCase());
                    }
                }}
            />
        );
    } else {
        const data =
            option.type === "boolean"
                ? [
                      { value: "on", label: "On" },
                      { value: "off", label: "Off" },
                  ]
                : (option.values ?? []).map(({ value: v }) => ({ value: v, label: enumWords(v) }));
        control = (
            <PanelField
                label={label}
                kind="select"
                width="fill"
                value={listValue(option, shown)}
                data={data}
                onChange={(picked) => {
                    if (typeof picked === "string") {
                        write(option.type === "boolean" ? picked === "on" : picked);
                    }
                }}
            />
        );
    }
    return control;
}

/**
 * A read-only line in the parameters' label column layout: Uses, and Cost.
 * @param props - Component props
 * @param props.label - its name
 * @param props.testId - its test id
 * @param props.children - its words
 * @returns The line
 */
function FactRow({
    label,
    testId,
    children,
}: Readonly<{ label: string; testId: string; children: string }>): React.JSX.Element {
    return (
        <div className="ws-row" data-testid={testId}>
            <div className="ws-field" data-named="">
                <span className="ws-field-label">
                    <span className="ws-field-name">{label}</span>
                </span>
                <Text size="xs" className="ws-field-control" truncate>
                    {children}
                </Text>
                <span className="ws-slot" />
                <span className="ws-slot" />
            </div>
        </div>
    );
}

/**
 * A shader's settings pop-out (decisions-v2, section 2.1), as the panel's property rows: one row
 * per parameter the catalog declares, the name in the label column (it scrubs a number), the
 * field bounded by the parameter's range and step, the vary glyph, and one minus as the only
 * reset. An integer that picks one of a set shows its pictures; a parameter bound to a clock shows
 * the binding. Minimum size is a row only when the shader declares it (the catalog lists it as a
 * parameter then). Under them, what it reads and one cost line, from the same fact the gallery
 * tile shows. Focus starts in the first field.
 * @param props - Component props
 * @param props.ctx - the row; left out, no parameter varies
 * @param props.descriptor - the shader
 * @param props.channel - the list channel its use is on
 * @param props.values - the values the layer sets
 * @param props.bindings - the parameters bound to data
 * @param props.onChange - sets or clears one parameter
 * @param props.onUnbind - stops one varying
 * @returns The rows
 */
export function ShaderParams({
    ctx,
    descriptor,
    channel,
    values,
    bindings = {},
    onChange,
    onUnbind,
}: Readonly<ShaderParamsProps>): React.JSX.Element {
    const box = useRef<HTMLDivElement>(null);
    // The pop-out puts focus on the field marked to take it: the first parameter's.
    useLayoutEffect(() => {
        box.current?.querySelector<HTMLElement>("input, button")?.setAttribute("data-autofocus", "");
    }, []);
    return (
        <div ref={box} className="ws-shader-params" data-shader={descriptor.id}>
            {descriptor.params.map((option) => (
                <ParamRow
                    key={option.name}
                    ctx={ctx}
                    channel={channel}
                    descriptor={descriptor}
                    option={option}
                    value={values[option.name]}
                    binding={bindings[option.name]}
                    onChange={onChange}
                    onUnbind={onUnbind}
                />
            ))}
            <FactRow label="Uses" testId="shader-uses">
                {usesWords(descriptor.reads)}
            </FactRow>
            <FactRow label="Cost" testId="shader-cost">
                {SHADER_FACT_WORDS.cost(descriptor.cost)}
            </FactRow>
        </div>
    );
}
