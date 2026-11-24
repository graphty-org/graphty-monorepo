/**
 * A family thing's Switch to (design/ui/style-panel-v2/design.md, section 5): the Kind line, first in the row's
 * "..." pop-over, choosing among every member. A member an experiment has off is listed,
 * disabled, never hidden. A member that needs a pick (a model, a picture, a shader in the shapes' place)
 * opens its picker beside the row and switches on the pick; Escape changes nothing. Others switch at once,
 * in one undo step.
 */

import { PanelField, Popout } from "@graphty/compact-mantine";
import { LABEL_LOOKS, type ShaderPlace, type StyleFamilyDescriptor } from "@graphty/graphty-element/catalog";
import React, { useRef, useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import { ModelsPopover } from "../ModelsPopover";
import { PicturePopover } from "../PicturePopover";
import { FieldLine, type RowContext } from "../PropertyRow";
import { writeIn } from "../row";
import { ShaderGallery } from "../ShaderGallery";
import { failureWords } from "../words";
import { rowReader } from "./drawn";
import { currentMember, isHeld, type MemberChoice, type MemberPick, membersOf, switchMember } from "./families";
import { type KindGroup, type KindMember, kindsShown, lookOf, PLAIN_LOOK, switchKind, writeLook } from "./kindGroups";
import { entryLook, entryOf, writeEntry } from "./labelEntries";
import { TEXT_THINGS } from "./labelRubric";
import { SegmentsLine } from "./RubricLine";

/** The places a shader for the shapes' place is picked from. */
const REPLACE_PLACES: readonly ShaderPlace[] = ["replace"];

/**
 * The shader gallery beside a row, listing the shaders that draw in the shapes' place (design 5, rule 1).
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.anchor - the line it opens beside
 * @param props.title - its header
 * @param props.places - the places it lists; the shapes' place when left out
 * @param props.onPick - picks a shader by id
 * @param props.onClose - closes it with nothing picked
 * @returns The gallery
 */
export function ReplaceGallery({
    ctx,
    anchor,
    title,
    places = REPLACE_PLACES,
    onPick,
    onClose,
}: Readonly<{
    ctx: RowContext;
    anchor: React.RefObject<HTMLElement | null>;
    title: string;
    places?: readonly ShaderPlace[];
    onPick: (id: string) => void;
    onClose: () => void;
}>): React.JSX.Element {
    return (
        <Popout
            opened
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <Popout.Panel
                width={280}
                placement="left"
                alignment="start"
                anchorY={anchor}
                header={{ variant: "title", title }}
                closeLabel={`Close ${title}`}
            >
                <Popout.Content>
                    <ShaderGallery session={ctx.session} tab={ctx.side} bare places={places} onPick={onPick} />
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * How a one-of is drawn (design "Input rules", "Tabs"): a tab strip, the pop-over's first row, when its choices show
 * different settings; grouped buttons named above when they show the same; a drop-down at 6 or more choices, or where
 * the words do not fit the line.
 */
type SwitchForm = "strip" | "buttons" | "select";

/** The most tabs a strip or grouped-buttons line holds (owner, 2026-11-24): more choices are a drop-down. */
const MOST_TABS = 5;

/**
 * A row's one-of choice of what it draws (a family's members, a kind group's kinds, a text's looks), the current one
 * picked: shared by a graphty-element family's row and a kind group's row.
 * @param props - Component props
 * @param props.boxRef - the box it is drawn in, for a picker opened beside it
 * @param props.attribute - the box's data attribute naming what it switches
 * @param props.name - its name above it, and its accessible name
 * @param props.form - how it is drawn
 * @param props.members - the choices, in order
 * @param props.now - the current choice's key
 * @param props.onChoose - told the choice picked
 * @param props.children - what opens beside it (a picker)
 * @returns The line
 */
function SwitchMenu<T extends { readonly key: string; readonly name: string; readonly disabled: boolean }>({
    boxRef,
    attribute,
    name = "Kind",
    form,
    members,
    now,
    onChoose,
    children,
}: Readonly<{
    boxRef?: React.RefObject<HTMLSpanElement | null>;
    attribute: Readonly<Record<string, string>>;
    name?: string;
    form: SwitchForm;
    members: readonly T[];
    now: string;
    onChoose: (member: T) => void;
    children?: React.ReactNode;
}>): React.JSX.Element {
    const pick = (next: string): void => {
        const member = members.find((each) => each.key === next);
        if (member !== undefined) {
            onChoose(member);
        }
    };
    const shown: SwitchForm = members.length > MOST_TABS ? "select" : form;
    const segments = (
        <div className="ws-field-control">
            <SegmentsLine
                label={name}
                options={members.map((member) => ({
                    value: member.key,
                    name: member.name,
                    disabled: member.disabled && member.key !== now,
                }))}
                value={now}
                onPick={pick}
            />
        </div>
    );
    if (shown === "strip") {
        return (
            <span ref={boxRef} className="ws-member" data-strip="" {...attribute}>
                {segments}
                {children}
            </span>
        );
    }
    return (
        <span ref={boxRef} className="ws-member" {...attribute}>
            {/* Named by its caption above it, as every line is (owner's input rules: every input is self describing). */}
            <FieldLine name={name} settings={null} above>
                {shown === "buttons" ? (
                    segments
                ) : (
                    <div className="ws-field-control">
                        <PanelField
                            label={name}
                            kind="select"
                            width="fill"
                            data={members.map((member) => ({
                                value: member.key,
                                label: member.name,
                                disabled: member.disabled && member.key !== now,
                            }))}
                            value={now}
                            onChange={(next) => {
                                pick(String(next));
                            }}
                        />
                    </div>
                )}
            </FieldLine>
            {children}
        </span>
    );
}

/** What every shader member's key starts with: the Shader tab's key. */
const SHADER_TAB = "replace:";

/** A fill gradient's kinds, each a tab of the Fill's strip. */
const GRADIENT_KINDS = [
    { value: "linear", name: "Linear" },
    { value: "radial", name: "Radial" },
] as const;

/** How a kind group's kinds are drawn, by group id; a group not named is a drop-down. */
const KIND_FORMS: Readonly<Record<string, { readonly form: SwitchForm; readonly name: string }>> = {
    // Under line and Over line show different settings: the pop-over's tabs.
    "edge.outline": { form: "strip", name: "Kind" },
    // Behind and Over show the same settings.
    "node.plate": { form: "buttons", name: "Kind" },
    "edge.endCaption": { form: "buttons", name: "End" },
    // Four ends' words do not fit the line's 200 px as buttons.
    "edge.arrow": { form: "select", name: "End" },
};

/** The tab a text's looks share beside a kind that is no look (a node Label's Text beside its Glyph). */
const TEXT_TAB = "look:text";

/**
 * A kind group's Switch to (kindGroups.ts): Text or Glyph on a node's Label row (its looks a Look line under the tabs),
 * a text's looks, an outline's Under line or Over line, an arrow's or caption's end. A switch moves the shared slots
 * and holds the rest, in one undo step.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.group - the kind group
 * @param props.now - the row's kind
 * @returns The line or lines
 */
export function KindMenu({
    ctx,
    group,
    now,
}: Readonly<{ ctx: RowContext; group: KindGroup; now: KindMember }>): React.JSX.Element {
    const { store } = useWorkspace();
    // A kind another row of the thing already draws is listed, not picked.
    const taken = new Set(kindsShown(ctx, group).map((member) => member.id));
    const done = (promise: Promise<void>, word: string): void => {
        promise
            .then(() => {
                store.set({ announcement: `${group.plainName} now ${word}` });
            })
            .catch((error: unknown) => {
                store.set({ notice: { message: failureWords(group.plainName, "changed", error), error: true } });
            });
    };
    const switchTo = (to: KindMember | undefined): void => {
        if (to !== undefined && to.id !== now.id) {
            done(switchKind(ctx, group, now, to), to.plainName);
        }
    };
    const choice = (member: KindMember): { key: string; name: string; disabled: boolean } => ({
        key: member.id,
        name: member.plainName,
        disabled: member.id !== now.id && taken.has(member.id),
    });
    const looks = group.members.filter((member) => member.look !== undefined);
    const others = group.members.filter((member) => member.look === undefined);
    // A text's looks share every setting: a Look line, never tabs.
    const lookLine =
        now.look === undefined || looks.length < 2 ? null : (
            <SwitchMenu
                attribute={{ "data-look-menu": group.id }}
                name="Look"
                form="select"
                members={looks.map((member) => choice(member))}
                now={now.id}
                onChoose={(picked) => {
                    switchTo(looks.find((member) => member.id === picked.key));
                }}
            />
        );
    if (looks.length > 0) {
        // Text (its looks) beside a kind of its own (Glyph): the tabs, the Look line under them.
        const tabs =
            others.length === 0 ? null : (
                <SwitchMenu
                    attribute={{ "data-kind-menu": group.id }}
                    form="strip"
                    members={[
                        { key: TEXT_TAB, name: "Text", disabled: false },
                        ...others.map((member) => choice(member)),
                    ]}
                    now={now.look === undefined ? now.id : TEXT_TAB}
                    onChoose={(picked) => {
                        if (picked.key !== TEXT_TAB) {
                            switchTo(others.find((member) => member.id === picked.key));
                            return;
                        }
                        const look = lookOf(ctx, looks[0]?.look?.style ?? now.head);
                        switchTo(looks.find((member) => member.look?.id === look) ?? looks[0]);
                    }}
                />
            );
        return (
            <>
                {tabs}
                {lookLine}
            </>
        );
    }
    // An End caption's looks follow its ends (E196): they are the looks of the caption the row draws.
    const style =
        group.looks === true ? Object.values(TEXT_THINGS[ctx.side]).find((t) => t.words === now.head) : undefined;
    const look = style === undefined ? undefined : lookOf(ctx, style.style);
    const form = KIND_FORMS[group.id] ?? { form: "select", name: "Kind" };
    return (
        <>
            <SwitchMenu
                attribute={{ "data-kind-menu": group.id }}
                name={form.name}
                form={form.form}
                members={group.members.map((member) => choice(member))}
                now={now.id}
                onChoose={(picked) => {
                    switchTo(group.members.find((member) => member.id === picked.key));
                }}
            />
            {style === undefined || look === undefined ? null : (
                <SwitchMenu
                    attribute={{ "data-look-menu": group.id }}
                    name="Look"
                    form="select"
                    members={LABEL_LOOKS.map((each) => ({
                        key: each.id,
                        name: each.id === PLAIN_LOOK ? group.plainName : each.plainName,
                        disabled: false,
                    }))}
                    now={look}
                    onChoose={(picked) => {
                        if (picked.key !== look) {
                            done(writeLook(ctx, style.style, picked.key, group.plainName), picked.name);
                        }
                    }}
                />
            )}
        </>
    );
}

/**
 * A further label's Switch to (labelEntries.ts): the text's looks, the current one checked; a pick writes only the
 * entry's look (E196). A further label has no Glyph: a glyph is the node's own channel.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.entry - the further label's id
 * @returns The Look line
 */
export function EntryLookMenu({ ctx, entry }: Readonly<{ ctx: RowContext; entry: string }>): React.JSX.Element {
    const { store } = useWorkspace();
    const style = entryOf(ctx, entry)?.style ?? {};
    const now = entryLook(ctx, entry);
    const members = LABEL_LOOKS.map((each) => ({
        key: each.id,
        name: each.id === PLAIN_LOOK ? "Label" : each.plainName,
        disabled: false,
    }));
    return (
        <SwitchMenu
            attribute={{ "data-look-menu": `${ctx.side}.labels` }}
            name="Look"
            form="select"
            members={members}
            now={now}
            onChoose={(choice) => {
                if (choice.key === now) {
                    return;
                }
                // Label names the plain look: a further label naming none draws in the main label's look.
                const next: Record<string, unknown> = { ...style, look: choice.key };
                writeEntry(ctx, entry, { style: next })
                    .then(() => {
                        store.set({ announcement: `Label now ${choice.name}` });
                    })
                    .catch((error: unknown) => {
                        store.set({ notice: { message: failureWords("Label", "changed", error), error: true } });
                    });
            }}
        />
    );
}

/**
 * The menu: see the file header.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.family - the thing's family
 * @param props.inRow - drawn under its row, where a pop-over's tabs do not belong: a Kind drop-down there
 * @returns The tab strip, or the Kind line under a row
 */
export function MemberMenu({
    ctx,
    family,
    inRow = false,
}: Readonly<{ ctx: RowContext; family: StyleFamilyDescriptor; inRow?: boolean }>): React.JSX.Element {
    const { store } = useWorkspace();
    const box = useRef<HTMLSpanElement>(null);
    const [picking, setPicking] = useState<{ readonly to: MemberChoice; readonly pick: MemberPick } | null>(null);
    const members = membersOf(ctx, family);
    const now = currentMember(ctx, family, members);
    const go = (toKey: string, picked?: string): void => {
        setPicking(null);
        const to = members.find((member) => member.key === toKey);
        switchMember(ctx, family, members, now, toKey, picked)
            .then(() => {
                store.set({ announcement: `${family.plainName} now ${to?.name ?? toKey}` });
            })
            .catch((error: unknown) => {
                store.set({ notice: { message: failureWords(family.plainName, "changed", error), error: true } });
            });
    };
    const choose = (to: MemberChoice): void => {
        setPicking(null);
        if (to.key === now || to.disabled) {
            return;
        }
        // A member that needs a pick, and holds nothing from before, waits for it; the row keeps the old
        // member until then.
        if (to.pick !== undefined && !isHeld(ctx, family, to.key)) {
            setPicking({ to, pick: to.pick });
            return;
        }
        go(to.key);
    };
    const close = (): void => {
        setPicking(null);
    };
    const shaders = members.filter((member) => member.shader !== undefined);
    const kindRead = rowReader(ctx)("node.gradientKind");
    const gradient = family.id === "node.fill" ? "gradient" : undefined;
    const kindNow = typeof kindRead === "string" ? kindRead : "linear";
    // Every shader drawn in the shapes' place is one Shader tab (its gallery picks which); a fill's gradient is a
    // Linear and a Radial tab, its kind changing its settings too (owner, 2026-11-24: a nested one-of is merged
    // into the strip when the combinations fit).
    const tabs = members.flatMap((member): { key: string; name: string; disabled: boolean }[] => {
        if (member.shader !== undefined) {
            return member === shaders[0] ? [{ key: SHADER_TAB, name: "Shader", disabled: false }] : [];
        }
        if (member.key === gradient) {
            return GRADIENT_KINDS.map((kind) => ({
                key: `${member.key}:${kind.value}`,
                name: kind.name,
                disabled: member.disabled,
            }));
        }
        return [member];
    });
    let tabNow = now;
    if (now.startsWith(SHADER_TAB)) {
        tabNow = SHADER_TAB;
    } else if (now === gradient) {
        tabNow = `${now}:${kindNow}`;
    }
    const writeKind = (kind: string): void => {
        writeIn(ctx, "node.gradientKind", { value: kind }).catch((error: unknown) => {
            store.set({ notice: { message: failureWords(family.plainName, "changed", error), error: true } });
        });
    };
    const onTab = (tab: { key: string }): void => {
        if (tab.key === tabNow) {
            return;
        }
        if (tab.key === SHADER_TAB && shaders.length > 0) {
            // The gallery lists every shader: titled by the tab, not by one shader.
            setPicking({ to: { ...shaders[0], name: "Shader" }, pick: "shader" });
            return;
        }
        if (gradient !== undefined && tab.key.startsWith(`${gradient}:`)) {
            const kind = tab.key.slice(gradient.length + 1);
            if (now !== gradient) {
                go(gradient);
            }
            writeKind(kind);
            return;
        }
        const to = members.find((member) => member.key === tab.key);
        if (to !== undefined) {
            choose(to);
        }
    };
    return (
        <SwitchMenu
            boxRef={box}
            attribute={{ "data-member-menu": family.id }}
            form={inRow ? "select" : "strip"}
            // Under a row, a drop-down lists every member, each shader by its name.
            members={inRow ? members : tabs}
            now={inRow ? now : tabNow}
            onChoose={(picked) => {
                const member = members.find((each) => each.key === picked.key);
                if (inRow && member !== undefined) {
                    choose(member);
                } else {
                    onTab(picked);
                }
            }}
        >
            {picking?.pick === "model" && (
                <ModelsPopover
                    opened
                    anchor={box}
                    onPick={(ref) => {
                        go(picking.to.key, ref);
                    }}
                    onCustom={close}
                    onBack={close}
                    onClose={close}
                />
            )}
            {picking?.pick === "shader" && (
                <ReplaceGallery
                    ctx={ctx}
                    anchor={box}
                    title={picking.to.name}
                    onPick={(id) => {
                        go(`${SHADER_TAB}${id}`, id);
                    }}
                    onClose={close}
                />
            )}
            {picking?.pick === "picture" && (
                <PicturePopover
                    opened
                    anchor={box}
                    onPick={(ref) => {
                        go(picking.to.key, ref);
                    }}
                    onModel={close}
                    onClose={close}
                />
            )}
        </SwitchMenu>
    );
}
