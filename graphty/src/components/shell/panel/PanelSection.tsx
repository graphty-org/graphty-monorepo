import { ControlSection, PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import { ActionIcon, Box } from "@mantine/core";
import React, { createContext, useContext, useEffect } from "react";

import { useShell } from "../ShellContext";

/**
 * The sections drawn inside one panel, so that the two universal overflow rows
 * and the alt-click sibling toggle can reach every one of them.
 *
 * Registration is what makes "every sibling header in the same panel" a real
 * set rather than a guess: a section that is not rendered -- because the data
 * cannot support it (Rule 7c) -- is not in it, and one added by a later pass
 * joins it without anyone maintaining a list.
 */
export interface PanelSectionScope {
    /** Adds a section to the panel's set. Called on mount. */
    readonly registerSection: (sectionId: string) => void;
    /** Removes a section from the panel's set. Called on unmount. */
    readonly unregisterSection: (sectionId: string) => void;
    /** Every section currently drawn in this panel, in registration order. */
    readonly sectionIds: () => readonly string[];
}

/**
 * The panel's own section set. `null` outside a panel, where a section keeps
 * its own state and has no siblings to sweep.
 */
export const PanelSectionScopeContext = createContext<PanelSectionScope | null>(null);

/*
 * The 5.8 status word and its pill. Both are shell-wide: the inspector and the Views
 * menu draw the same tag, and 6.8's "one verb, one drawing" makes that one drawing, so
 * it lives in `shell/ComingTag.tsx` and is re-exported here for every panel that
 * already reaches for it through this module.
 */
export { COMING_LABEL, ComingTag } from "../ComingTag";

/**
 * The sentence a group of three or more contiguous unshipped rows carries, once,
 * on its own header (5.8; StylePanel.dc.html:"Dimmed controls are not built yet.").
 */
export const COMING_GROUP_SENTENCE = "Dimmed rows are not built yet.";

/**
 * Props of {@link SectionAddButton}.
 * @public
 */
export interface SectionAddButtonProps {
    /**
     * The tooltip: the saved-thing verb, and, where the control cannot act, the
     * reason after it -- "Save as filter... Build a filter first" (floor item 4).
     */
    readonly tooltip: string;
    /** The accessible name: the tooltip with any key chip removed. */
    readonly label: string;
    /** Whether the control cannot act. Its reason stays in the tooltip. */
    readonly disabled?: boolean;
    /** What the plus does. It commits to a sensible default rather than asking. */
    readonly onClick?: () => void;
}

/**
 * The resident `+` of a library section.
 *
 * Rule 7b's one carve-out: the plus that adds to a library section is resident
 * whether the section is empty or full, so the five libraries of a panel line
 * their pluses up in one column at x = 248..272. A plus that cannot act yet is
 * drawn disabled with its reason in its tooltip rather than hidden.
 *
 * It is supplied through a section's `actions` rather than `ControlSection`'s
 * own `onAdd`, because `onAdd` names itself "Add &lt;section&gt;" and the
 * register fixes these verbs -- `Save as filter...`, `Save selection as set...`,
 * `Save as view...`, `Note (N)` (spec 03 section 2.2; Main.dc.html).
 * @param props - the plus's props.
 * @returns the 24px library plus.
 */
export function SectionAddButton(props: SectionAddButtonProps): React.JSX.Element {
    const { tooltip, label, disabled = false, onClick } = props;

    return (
        <ActionIcon
            type="button"
            variant="subtle"
            size={PANEL_GRID.CONTROL_HEIGHT}
            radius="sm"
            c={disabled ? PANEL_INK.DISABLED : PANEL_INK.CHROME}
            title={tooltip}
            aria-label={label}
            // `aria-disabled`, never the `disabled` attribute: floor item 4 puts the
            // reason a control cannot act in that control's own tooltip, and a real
            // `disabled` button answers no pointer, so the reason could never be read.
            // The click is guarded instead, the way `TopBarIconButton` and the
            // inspector's own controls already do it.
            aria-disabled={disabled || undefined}
            data-disabled={disabled || undefined}
            data-testid="section-add"
            style={disabled ? { background: "transparent" } : undefined}
            onClick={() => {
                if (disabled) {
                    return;
                }

                onClick?.();
            }}
        >
            <UiGlyph name="plus" size={PANEL_GRID.GLYPH} />
        </ActionIcon>
    );
}

/**
 * Props of {@link PanelRows}.
 * @public
 */
export interface PanelRowsProps {
    /** The rows to lay on the content band. */
    readonly children: React.ReactNode;
}

/**
 * The 16 | 224 | 8 | 24 | 8 content band, for rows that are not inside a
 * section.
 *
 * `ControlSection` lays this band itself for the rows it holds; a tier 1 row
 * that stands on its own -- Explore's search box, its two action rows -- needs
 * the same 16px leading and 8px trailing pad drawn around it, and this is where
 * that happens, once, rather than on every row.
 * @param props - the band's children.
 * @returns the padded content band.
 */
export function PanelRows(props: PanelRowsProps): React.JSX.Element {
    const { children } = props;

    return (
        <Box
            data-testid="panel-rows"
            style={{
                display: "flex",
                flexDirection: "column",
                flex: "0 0 auto",
                boxSizing: "border-box",
                paddingInlineStart: PANEL_GRID.PAD_LEFT,
                paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
            }}
        >
            {children}
        </Box>
    );
}

/**
 * Props of {@link PanelSection}.
 * @public
 */
export interface PanelSectionProps {
    /**
     * The section's id, unique shell-wide. It is the key the open state is
     * remembered under (6.5), so the convention is `<region>.<section>`.
     */
    readonly sectionId: string;
    /** The section's name, drawn in its 32px header. */
    readonly label: string;
    /**
     * The technical half of a 6.3 pair, WITHOUT its parentheses. Spec 04 section 4.2
     * step 10 fixes one drawing for it: "plain name, space, technical name in
     * parentheses in muted ink, inside one label" -- so it is drawn in the header, not
     * hidden in a wrapper's `title`, which FLOOR-1.9 section 1 counts as off screen.
     */
    readonly technicalName?: string;
    /**
     * Whether the section opens by default. Sections default CLOSED, which is
     * what pays for the resident rows above them (spec 04 section 4.4).
     */
    readonly defaultOpen?: boolean;
    /**
     * Whether the section has nothing in it. An empty section is ONE 32px row:
     * dimmed name, no chevron, no content rows, no "0" and no empty-state
     * sentence (spec 03 section 1.5).
     */
    readonly empty?: boolean;
    /** The sentence behind the header's info circle. */
    readonly info?: React.ReactNode;
    /** The section's own header controls, ending at x = 272. */
    readonly actions?: React.ReactNode;
    /** The resident `+` of a library section. */
    readonly onAdd?: () => void;
    /** The rows the section holds. */
    readonly children?: React.ReactNode;
}

/**
 * One RT-8 section of an activity panel, wired to the shell's memory and to the
 * panel's alt-click sibling rule.
 *
 * Three things this adds to `ControlSection`:
 *
 * 1. The open state is the shell store's, keyed by `sectionId`, so it survives
 *    the panel closing and the session ending (6.5).
 * 2. Alt-clicking the header applies that header's toggle to every sibling
 *    section of the same panel -- the pointer twin of the overflow's two rows
 *    (spec 03 section 1.4).
 * 3. The section registers itself with the panel, which is what gives those two
 *    overflow rows and the alt-click sweep a real set to act on.
 * @param props - the section's props.
 * @returns the section, its header and its rows.
 */
export function PanelSection(props: PanelSectionProps): React.JSX.Element {
    const { sectionId, label, technicalName, defaultOpen = false, empty, info, actions, onAdd, children } = props;

    const { isSectionOpen, setSectionOpen, setSectionsOpen } = useShell();
    const scope = useContext(PanelSectionScopeContext);

    useEffect(() => {
        // An empty section has no chevron and so no state to sweep; it is drawn
        // but it is not one of the siblings the two overflow rows reach.
        if (scope === null || empty === true) {
            return undefined;
        }

        scope.registerSection(sectionId);

        return () => {
            scope.unregisterSection(sectionId);
        };
    }, [empty, scope, sectionId]);

    const handleOpenChange = (opened: boolean, event?: React.SyntheticEvent): void => {
        const native = event?.nativeEvent;

        if (scope !== null && native instanceof MouseEvent && native.altKey) {
            setSectionsOpen(scope.sectionIds(), opened);
            return;
        }

        setSectionOpen(sectionId, opened);
    };

    return (
        <ControlSection
            label={label}
            technicalName={technicalName}
            opened={isSectionOpen(sectionId, defaultOpen)}
            onOpenChange={handleOpenChange}
            empty={empty}
            info={info}
            actions={actions}
            onAdd={
                onAdd === undefined
                    ? undefined
                    : () => {
                          onAdd();
                      }
            }
        >
            {children}
        </ControlSection>
    );
}
