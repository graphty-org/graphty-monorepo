/**
 * A shader use's row in Style panel v2 (design/ui/style-panel-v2/design.md, sections 2.4 and 7.1,
 * 7.2): a thing row like every other. A use in the Shaders section shows its preset, which opens the
 * gallery of its place to draw another; a group outline is named by its shader and its main control
 * is the field it groups by (R12). Its settings pop-over holds Switch to Bubble / Hull on a group
 * outline, Place where the shader draws in more than one (R8f), and its parameters, each empty until
 * the layer writes it, with a "-" that takes it off the use. The row's "-" takes the use off.
 */

import { PanelField } from "@graphty/compact-mantine";
import { type ShaderPlace, STYLE_FAMILIES } from "@graphty/graphty-element/catalog";
import React, { useRef, useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import type { RowContext } from "../PropertyRow";
import { type Fail, GroupByPopout } from "../ShaderRow";
import {
    paramsOf,
    pickedShader,
    placeOf,
    removeShader,
    type ShaderEntry,
    swapShader,
    writePlace,
} from "../shaderSlots";
import { dialogPlaceWords, failureWords } from "../words";
import { ReplaceGallery } from "./MemberMenu";
import { LINE_WIDTHS, segmentsWidth } from "./rubric";
import { LineFrame, SegmentsLine } from "./RubricLine";
import { RowSettings } from "./ThingLine";
import { PopoverShell } from "./ThingPopover";
import { UseParams } from "./ThingRow";
import { ValueButton } from "./ValueButton";

/** graphty-element's Group outline family: its members (Bubble, Hull) and the use fields they share. */
const GROUP_OUTLINE = STYLE_FAMILIES.find((family) => family.id === "node.groupOutline");

/**
 * A strip, or a select named `name` where the options' words do not fit the pop-over's line.
 * @param props - Component props
 * @param props.line - what the line edits, for `data-line`
 * @param props.name - the select's name
 * @param props.options - the options
 * @param props.value - the option in force
 * @param props.set - whether the use sets it, so it has a "-"
 * @param props.onPick - writes an option
 * @param props.onRemove - takes it off the use
 * @returns The line
 */
function ChoiceLine({
    line,
    name,
    options,
    value,
    set,
    onPick,
    onRemove,
}: Readonly<{
    line: string;
    name: string;
    options: readonly { readonly value: string; readonly name: string }[];
    value: string;
    set: boolean;
    onPick: (value: string) => void;
    onRemove?: () => void;
}>): React.JSX.Element {
    const fits = segmentsWidth(options) <= LINE_WIDTHS.popoverFull;
    const control = fits ? (
        <SegmentsLine label={name} options={options} value={value} onPick={onPick} />
    ) : (
        <PanelField
            label={name}
            kind="select"
            width="fill"
            data={options.map((option) => ({ value: option.value, label: option.name }))}
            value={value}
            onChange={(next) => {
                onPick(String(next));
            }}
        />
    );
    return (
        <LineFrame
            line={line}
            name={fits ? null : name}
            set={set}
            rule={fits ? "R8f" : "R9"}
            control={control}
            modifier={null}
            removeName={set && onRemove !== undefined ? `Remove ${name.toLowerCase()}` : undefined}
            onRemove={onRemove ?? (() => undefined)}
        />
    );
}

/**
 * A value field that opens a picker: the row's main control.
 * @param props - Component props
 * @param props.label - its accessible name
 * @param props.words - what it shows; empty while unset
 * @param props.onClick - opens the picker
 * @returns The field
 */
function PickerField({
    label,
    words,
    onClick,
}: Readonly<{ label: string; words: string; onClick?: () => void }>): React.JSX.Element {
    return <ValueButton label={label} words={words} opens="dialog" onClick={onClick} />;
}

/**
 * A use's main control: "Off" for a use switched off, a group outline's field, else its preset.
 * @param args - the row.
 * @param args.ctx - the row and kind
 * @param args.entry - the use
 * @param args.title - the row's name with its kind
 * @param args.fail - posts a failed write's notice
 * @param args.outline - the use is a group outline
 * @param args.onGallery - opens the gallery of its place
 * @returns The control
 */
function mainControl(args: {
    readonly ctx: RowContext;
    readonly entry: ShaderEntry;
    readonly title: string;
    readonly fail: Fail;
    readonly outline: boolean;
    readonly onGallery: () => void;
}): React.ReactNode {
    const { ctx, entry, title, fail, outline, onGallery } = args;
    const name = entry.descriptor?.plainName ?? entry.use.shader;
    if (entry.use.off === true) {
        return <PickerField label={title} words="Off" />;
    }
    if (outline) {
        return (
            <GroupByPopout
                ctx={ctx}
                entry={entry}
                fail={fail}
                renderTrigger={(word) => <PickerField label={`${name} by`} words={word ?? ""} />}
            />
        );
    }
    return <PickerField label={title} words={name} onClick={onGallery} />;
}

/**
 * The row: see the file header.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.entry - the use
 * @param props.outline - the use is a group outline (Order and groups)
 * @returns The row
 */
export function ShaderUseRow({
    ctx,
    entry,
    outline = false,
}: Readonly<{ ctx: RowContext; entry: ShaderEntry; outline?: boolean }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(false);
    const [gallery, setGallery] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const { descriptor, use } = entry;
    const name = descriptor?.plainName ?? use.shader;
    const kind = ctx.side === "node" ? "Node" : "Edge";
    const title = outline ? `${kind} group outline` : `${kind} ${name.toLowerCase()}`;
    const fail: Fail = (verb) => (error) => {
        store.set({ notice: { message: failureWords(name, verb, error), error: true } });
    };
    const params = paramsOf(entry);
    const place = placeOf(entry);
    const places = descriptor?.places ?? [];
    const catalogId = descriptor?.copyOf ?? use.shader;

    const swap = (id: string, keep: readonly string[]): void => {
        pickedShader(ctx.session, id)
            .then((picked) => swapShader(ctx, entry, picked, keep))
            .catch(fail("changed"));
    };
    const member = GROUP_OUTLINE?.members.find((each) => each.shader === catalogId);
    const switchTo =
        outline && GROUP_OUTLINE !== undefined ? (
            <ChoiceLine
                line="switch:node.groupOutline"
                name="Switch to"
                options={GROUP_OUTLINE.members.map((each) => ({ value: each.id, name: each.plainName }))}
                value={member?.id ?? ""}
                set={false}
                onPick={(id) => {
                    const to = GROUP_OUTLINE.members.find((each) => each.id === id);
                    if (to?.shader !== undefined && to.id !== member?.id) {
                        swap(to.shader, GROUP_OUTLINE.shared);
                    }
                }}
            />
        ) : null;
    const placeLine =
        places.length > 1 ? (
            <ChoiceLine
                key="place"
                line={`${entry.key}.place`}
                name="Place"
                options={places.map((each) => ({ value: each, name: dialogPlaceWords(each, ctx.side) }))}
                value={use.place ?? ""}
                set={use.place !== undefined}
                onPick={(next) => {
                    writePlace(ctx, entry, next as ShaderPlace).catch(fail("changed"));
                }}
                onRemove={() => {
                    writePlace(ctx, entry, undefined).catch(fail("changed"));
                }}
            />
        ) : null;
    const paramRows = descriptor === undefined ? null : <UseParams key="params" ctx={ctx} entry={entry} />;
    const settings =
        descriptor === undefined || use.off === true ? null : (
            <RowSettings
                label={`${title} settings`}
                title={title}
                changed={Object.keys(params).length > 0 || use.place !== undefined}
                opened={open}
                onOpenChange={setOpen}
            >
                <PopoverShell
                    ctx={ctx}
                    title={title}
                    groups={[]}
                    isSet={() => false}
                    onUnset={() => undefined}
                    main={[placeLine, paramRows].filter((line) => line !== null)}
                    others={[]}
                    linesOf={() => null}
                    first={switchTo}
                />
            </RowSettings>
        );

    const control = mainControl({
        ctx,
        entry,
        title,
        fail,
        outline,
        onGallery: () => {
            setGallery(true);
        },
    });
    const removeName = `Remove ${title.toLowerCase()}`;
    return (
        <div ref={box} data-thing={outline ? "groupOutline" : "shader"} data-shader={use.shader}>
            <LineFrame
                line={entry.key}
                name={outline ? name : null}
                set
                rule={outline ? "R12" : "R10"}
                control={control}
                modifier={settings}
                removeName={removeName}
                onRemove={() => {
                    store.set({ announcement: `${name} removed` });
                    removeShader(ctx, entry).catch(fail("removed"));
                }}
            />
            {gallery ? (
                <ReplaceGallery
                    ctx={ctx}
                    anchor={box}
                    title={title}
                    places={place === undefined ? undefined : [place]}
                    onPick={(id) => {
                        setGallery(false);
                        if (id !== catalogId && id !== use.shader) {
                            swap(id, []);
                        }
                    }}
                    onClose={() => {
                        setGallery(false);
                    }}
                />
            ) : null}
        </div>
    );
}
