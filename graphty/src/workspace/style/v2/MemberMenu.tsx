/**
 * A family thing's Switch to (design/ui/style-panel-v2/design.md, section 5): a glyph before the row's name
 * opening a menu of every member, the current one checked (and `aria-current`). A member an experiment has off is listed,
 * disabled, never hidden. A member that needs a pick (a model, a picture, a shader in the shapes' place)
 * opens its picker beside the row and switches on the pick; Escape changes nothing. Others switch at once,
 * in one undo step.
 */

import { Popout } from "@graphty/compact-mantine";
import type { ShaderPlace, StyleFamilyDescriptor } from "@graphty/graphty-element/catalog";
import { ActionIcon, Menu, Tooltip } from "@mantine/core";
import React, { useRef, useState } from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import { ModelsPopover } from "../ModelsPopover";
import { PicturePopover } from "../PicturePopover";
import type { RowContext } from "../PropertyRow";
import { ShaderGallery } from "../ShaderGallery";
import { failureWords } from "../words";
import { currentMember, isHeld, type MemberChoice, type MemberPick, membersOf, switchMember } from "./families";
import { type KindGroup, type KindMember, kindsShown, switchKind } from "./kindGroups";

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
 * The Switch to glyph and its menu of kinds, the current one checked (and `aria-current`): shared by a
 * graphty-element family's row and a kind group's row.
 * @param props - Component props
 * @param props.boxRef - the box it is drawn in, for a picker opened beside it
 * @param props.attribute - the box's data attribute naming what it switches
 * @param props.title - the thing's name with its kind ("Node fill")
 * @param props.members - the kinds, in order
 * @param props.now - the current kind's key
 * @param props.onChoose - told the kind picked
 * @param props.children - what opens beside it (a picker)
 * @returns The glyph and its menu
 */
function SwitchMenu<T extends { readonly key: string; readonly name: string; readonly disabled: boolean }>({
    boxRef,
    attribute,
    title,
    members,
    now,
    onChoose,
    children,
}: Readonly<{
    boxRef?: React.RefObject<HTMLSpanElement | null>;
    attribute: Readonly<Record<string, string>>;
    title: string;
    members: readonly T[];
    now: string;
    onChoose: (member: T) => void;
    children?: React.ReactNode;
}>): React.JSX.Element {
    const label = `Switch ${title.toLowerCase()} to`;
    const current = members.find((member) => member.key === now);
    return (
        <span ref={boxRef} className="ws-member" {...attribute}>
            <Menu position="bottom-start">
                <Menu.Target>
                    <Tooltip label={current === undefined ? label : `${label}: ${current.name}`}>
                        <ActionIcon variant="subtle" size="sm" aria-label={label}>
                            <GLYPHS.switchTo size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                    {members.map((member) => (
                        <Menu.Item
                            key={member.key}
                            aria-current={member.key === now ? "true" : undefined}
                            disabled={member.disabled && member.key !== now}
                            leftSection={
                                member.key === now ? (
                                    <GLYPHS.check size={14} aria-hidden />
                                ) : (
                                    <span className="ws-member-blank" />
                                )
                            }
                            onClick={() => {
                                onChoose(member);
                            }}
                        >
                            {member.name}
                        </Menu.Item>
                    ))}
                </Menu.Dropdown>
            </Menu>
            {children}
        </span>
    );
}

/**
 * A kind group's Switch to (kindGroups.ts): Text or Glyph on a node's Label row. A switch moves the shared
 * slots and holds the rest, in one undo step.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.group - the kind group
 * @param props.now - the row's kind
 * @param props.title - the thing's name with its kind ("Node label")
 * @returns The glyph and its menu
 */
export function KindMenu({
    ctx,
    group,
    now,
    title,
}: Readonly<{ ctx: RowContext; group: KindGroup; now: KindMember; title: string }>): React.JSX.Element {
    const { store } = useWorkspace();
    // A kind another row of the thing already draws is listed, not picked.
    const taken = new Set(kindsShown(ctx, group).map((member) => member.id));
    const members = group.members.map((member) => ({
        key: member.id,
        name: member.plainName,
        disabled: member.id !== now.id && taken.has(member.id),
    }));
    return (
        <SwitchMenu
            attribute={{ "data-kind-menu": group.id }}
            title={title}
            members={members}
            now={now.id}
            onChoose={(choice) => {
                const to = group.members.find((member) => member.id === choice.key);
                if (to === undefined || to.id === now.id) {
                    return;
                }
                switchKind(ctx, group, now, to)
                    .then(() => {
                        store.set({ announcement: `${group.plainName} now ${to.plainName}` });
                    })
                    .catch((error: unknown) => {
                        store.set({
                            notice: { message: failureWords(group.plainName, "changed", error), error: true },
                        });
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
 * @param props.title - the thing's name with its kind ("Node fill")
 * @returns The glyph and its menu
 */
export function MemberMenu({
    ctx,
    family,
    title,
}: Readonly<{ ctx: RowContext; family: StyleFamilyDescriptor; title: string }>): React.JSX.Element {
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
    return (
        <SwitchMenu
            boxRef={box}
            attribute={{ "data-member-menu": family.id }}
            title={title}
            members={members}
            now={now}
            onChoose={choose}
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
                        go(picking.to.key, id);
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
