/**
 * A shader use's row in Style panel v2 (design/ui/style-panel-v2/design.md, sections 2.4 and 7.1,
 * 7.2): a thing row like every other. A use in the Shaders section shows its preset, which opens the
 * Shaders list to draw another. Its settings pop-over holds its parameters, each empty until
 * the layer writes it, with a "-" that takes it off the use. The row's "-" takes the use off.
 */

import React, { useRef, useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import type { RowContext } from "../PropertyRow";
import type { Fail } from "../ShaderRow";
import { paramsOf, pickedShader, removeShader, type ShaderEntry, swapShader } from "../shaderSlots";
import { failureWords, LISTED_PLACES } from "../words";
import { ReplaceGallery } from "./MemberMenu";
import { LineFrame } from "./RubricLine";
import { RowSettings } from "./ThingLine";
import { PopoverShell } from "./ThingPopover";
import { UseParams } from "./ThingRow";
import { ValueButton } from "./ValueButton";

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
 * A use's main control: "Off" for a use switched off, else its preset.
 * @param args - the row.
 * @param args.entry - the use
 * @param args.title - the row's name with its kind
 * @param args.onGallery - opens the gallery of its place
 * @returns The control
 */
function mainControl(args: {
    readonly entry: ShaderEntry;
    readonly title: string;
    readonly onGallery: () => void;
}): React.ReactNode {
    const { entry, title, onGallery } = args;
    const name = entry.descriptor?.plainName ?? entry.use.shader;
    if (entry.use.off === true) {
        return <PickerField label={title} words="Off" />;
    }
    return <PickerField label={title} words={name} onClick={onGallery} />;
}

/**
 * The row: see the file header.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.entry - the use
 * @returns The row
 */
export function ShaderUseRow({ ctx, entry }: Readonly<{ ctx: RowContext; entry: ShaderEntry }>): React.JSX.Element {
    const { store } = useWorkspace();
    // on reload: fresh: pointer: a pop-over held open by its control
    const [open, setOpen] = useState(false);
    // on reload: fresh: pointer: the gallery held open by its control
    const [gallery, setGallery] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const { descriptor, use } = entry;
    const name = descriptor?.plainName ?? use.shader;
    const kind = ctx.side === "node" ? "Node" : "Edge";
    const title = `${kind} ${name.toLowerCase()}`;
    const fail: Fail = (verb) => (error) => {
        store.set({ notice: { message: failureWords(name, verb, error), error: true } });
    };
    const params = paramsOf(entry);
    const catalogId = descriptor?.copyOf ?? use.shader;

    const swap = (id: string): void => {
        pickedShader(ctx.session, id)
            .then((picked) => swapShader(ctx, entry, picked, []))
            .catch(fail("changed"));
    };
    const paramRows = descriptor === undefined ? null : <UseParams key="params" ctx={ctx} entry={entry} />;
    const settings =
        descriptor === undefined || use.off === true ? null : (
            <RowSettings
                label={`${title} settings`}
                title={title}
                changed={Object.keys(params).length > 0}
                opened={open}
                onOpenChange={setOpen}
            >
                <PopoverShell
                    ctx={ctx}
                    groups={[]}
                    isSet={() => false}
                    onUnset={() => undefined}
                    main={paramRows === null ? [] : [paramRows]}
                    others={[]}
                    linesOf={() => null}
                    first={null}
                />
            </RowSettings>
        );

    const control = mainControl({
        entry,
        title,
        onGallery: () => {
            setGallery(true);
        },
    });
    const removeName = `Remove ${title.toLowerCase()}`;
    return (
        <div ref={box} data-thing="shader" data-shader={use.shader}>
            <LineFrame
                line={entry.key}
                name={null}
                set
                rule="R10"
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
                    places={LISTED_PLACES[ctx.side]}
                    onPick={(id) => {
                        setGallery(false);
                        if (id !== catalogId && id !== use.shader) {
                            swap(id);
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
