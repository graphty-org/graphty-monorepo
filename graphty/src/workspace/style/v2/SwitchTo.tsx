/**
 * The Switch to line (design/ui/style-panel-v2/design.md, section 5): the first line of a family
 * thing's settings pop-over, the same in every member. Every member is listed; one an experiment
 * has off is disabled, never hidden. Words when they fit the pop-over's full line, else a select
 * named "Switch to". A member that needs a pick (a model, a picture) opens its picker beside the
 * pop-over and switches on the pick; Escape changes nothing. Others switch at once, in one undo step.
 */

import { PanelField } from "@graphty/compact-mantine";
import type { StyleFamilyDescriptor } from "@graphty/graphty-element/catalog";
import React, { useRef, useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import { ModelsPopover } from "../ModelsPopover";
import { PicturePopover } from "../PicturePopover";
import type { RowContext } from "../PropertyRow";
import { failureWords } from "../words";
import { currentMember, isHeld, type MemberChoice, type MemberPick, membersOf, switchMember } from "./families";
import { LINE_WIDTHS, segmentsWidth } from "./rubric";
import { LineFrame, SegmentsLine } from "./RubricLine";

/** The line's name, on the select it becomes when the members' words do not fit. */
const SWITCH_TO = "Switch to";

/**
 * The line: see the file header.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.family - the thing's family
 * @returns The line
 */
export function SwitchTo({
    ctx,
    family,
}: Readonly<{ ctx: RowContext; family: StyleFamilyDescriptor }>): React.JSX.Element {
    const { store } = useWorkspace();
    const box = useRef<HTMLDivElement>(null);
    const [picking, setPicking] = useState<{ readonly to: MemberChoice; readonly pick: MemberPick } | null>(null);
    const members = membersOf(ctx, family);
    const now = currentMember(ctx, members);
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
    const choose = (toKey: string): void => {
        const to = members.find((member) => member.key === toKey);
        setPicking(null);
        if (to === undefined || to.key === now || to.disabled) {
            return;
        }
        // A member that needs a pick, and holds nothing from before, waits for it; the row keeps
        // the old member until then.
        if (to.pick !== undefined && !isHeld(ctx, family, members, to.key)) {
            setPicking({ to, pick: to.pick });
            return;
        }
        go(toKey);
    };
    const options = members.map((member) => ({
        value: member.key,
        name: member.name,
        disabled: member.disabled && member.key !== now,
    }));
    const fits = segmentsWidth(options) <= LINE_WIDTHS.popoverFull;
    const control = fits ? (
        <SegmentsLine label={SWITCH_TO} options={options} value={now} onPick={choose} />
    ) : (
        <PanelField
            label={SWITCH_TO}
            kind="select"
            width="fill"
            data={options.map((option) => ({ value: option.value, label: option.name, disabled: option.disabled }))}
            value={now}
            onChange={(next) => {
                choose(String(next));
            }}
        />
    );
    const close = (): void => {
        setPicking(null);
    };
    return (
        // A segment's click reaches the settings pop-over after the change it made, and a click on
        // a pop-over closes what was opened from it: kept here, so the picker it opened stays open.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- only stops a click bubbling; the strip's own radios take the keys
        <div
            ref={box}
            data-switch-to={family.id}
            onClick={(event) => {
                event.stopPropagation();
            }}
        >
            <LineFrame
                line={`switch:${family.id}`}
                name={fits ? null : SWITCH_TO}
                set={false}
                rule={fits ? "R8f" : "R9"}
                control={control}
                modifier={null}
                removeName={undefined}
                onRemove={close}
            />
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
        </div>
    );
}
