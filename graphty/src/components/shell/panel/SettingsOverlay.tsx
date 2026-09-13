import { PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import { ActionIcon, Box, Overlay } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { AiProviderSettings, type AiProviderSettingsProps } from "../../ai/AiProviderSettings";
import { ColorSchemeToggle } from "../../ColorSchemeToggle";
import { formatChords, SHELL_KEY_BINDINGS } from "../bindings";
import { OVERLAY_INSET, PANEL_HEADER_HEIGHT, SHELL_OVERLAY_Z_INDEX } from "../constants";
import { ComingTag } from "./PanelSection";

/** The overlay's own name, drawn at the dialog title size. */
const SETTINGS_LABEL = "Settings";

/** The dialog / large panel title size (spec 04 section 3.2). */
const TITLE_FONT_SIZE = 14;

/** The line that says what Close will do before it does it (floor item 4). */
const AUTOSAVE_LINE = "Changes save automatically";

/** The close control's accessible name: its tooltip with the key chip removed. */
const CLOSE_LABEL = "Close";

/** The close control's tooltip (Settings.dc.html:654). */
const CLOSE_TOOLTIP = "Close (Esc)";

/** The section nav's width (Settings.dc.html:684). */
const NAV_WIDTH = 200;

/** The gap between two nav rows, and the nav's own padding. */
const NAV_GAP = 1;

/** One nav row's height, the list-row height of VOCAB section 3. */
const NAV_ROW_HEIGHT = PANEL_GRID.DATA_PITCH;

/**
 * One section of the Settings overlay. In Settings the NAV ITEM IS THE DOOR and
 * the pane is what is behind it (Settings.dc.html): seven doors, seven panes,
 * one open at a time.
 *
 * The row type of {@link SETTINGS_SECTIONS}, which is public alongside it.
 * @public
 */
export interface SettingsSection {
    /** Stable id. */
    readonly id: string;
    /** The section's name, drawn in the nav and at the head of its pane. */
    readonly label: string;
    /** The row's full reading, where the drawn name is shorter than the meaning. */
    readonly title?: string;
    /**
     * The teaching sentence the pane's heading keeps behind an info circle.
     *
     * IC-6 moves an explanation that reads the same with the data taken away off
     * the pane and onto the heading it explains (Settings.dc.html:752), so the
     * sentence is one hover away rather than a paragraph the reader scrolls past
     * every time.
     */
    readonly info?: string;
}

/**
 * The seven sections, in the order spec 03 section 2.7 freezes them.
 */
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
    { id: "appearance", label: "Appearance" },
    { id: "defaults", label: "Defaults" },
    { id: "shortcuts", label: "Keyboard shortcuts" },
    { id: "performance", label: "Performance" },
    {
        id: "ai",
        label: "AI providers",
        title: "AI providers and keys",
        info: "Connect a provider to use the AI assistant. All features work without AI: loading data, exploring, running algorithms, styling and exporting never need a provider.",
    },
    { id: "data", label: "Data management", title: "Data management. Saved items, recent files and storage used" },
    { id: "extensions", label: "Extensions" },
];

/**
 * The sections whose pane draws real content today.
 *
 * Spec 5.8 gives an unshipped capability exactly one drawing, so a section that is
 * not on this list draws the `Coming` tag rather than an empty pane -- and a section
 * that gains content is added here in the same pass that gives it content, which is
 * what stops a working pane from being hidden behind a tag it has outgrown. AI
 * providers was on the wrong side of this line: spec 5.1 places AI settings inside
 * Settings and 5.3 AI tier 3 opens this pane from the assistant's setup prompt, and
 * until now that prompt led to a stub.
 */
const SHIPPED_SECTION_IDS: readonly string[] = ["appearance", "shortcuts", "ai"];

/**
 * Props of the Settings overlay.
 * @public
 */
export interface SettingsOverlayProps {
    /** Whether the overlay is shown. */
    readonly opened: boolean;
    /** Closes it. Escape reaches this through the shell's one Escape ladder. */
    readonly onClose: () => void;
    /**
     * The section to open on, when Settings was opened from a place that named one.
     *
     * Left out, the overlay opens where it was last left (6.5). The assistant's setup
     * prompt names `"ai"`, because spec 5.3 AI tier 3 sends it to "Settings > AI
     * providers" rather than to Settings -- a user with no provider configured is
     * exactly the user who cannot find that pane by hunting for it.
     */
    readonly section?: string;
    /**
     * The key store the AI providers pane writes to, handed down by the shell.
     *
     * Required, not optional: the shell holds the one `useAiKeyStorage` instance and
     * a pane that reached for its own would be a second `ApiKeyManager` with its own
     * copy of the user's keys. An overlay with no store could only draw a key field
     * that quietly dropped what was typed into it.
     */
    readonly aiProviders: AiProviderSettingsProps;
}

/**
 * Settings, as a full-panel overlay: a scrim over the body row and a panel
 * inset 12 on all four sides -- not a route and not a 280px panel
 * (spec 03 section 2.7).
 *
 * Three of the seven panes draw content: Appearance re-homes the app's colour
 * scheme control, Keyboard shortcuts draws the 5.6 table, and AI providers draws
 * the provider list and its key form. The other four are stubs and say so with the
 * 5.8 tag -- see `SHIPPED_SECTION_IDS`, which is the one list that decides which.
 *
 * The Keyboard shortcuts pane renders the WHOLE 5.6 table, unshipped rows
 * included and tagged, which is what section 10.3 asks of this one surface; the
 * `?` dialog renders only the shipped rows. An unshipped row carries no key
 * chip anywhere, so `keyChipFor` is not used here -- the table's own chords are,
 * and only for rows that have shipped.
 * @param props - the overlay's props.
 * @returns the overlay, or null when it is closed.
 */
export function SettingsOverlay(props: SettingsOverlayProps): React.JSX.Element | null {
    const { opened, onClose, section: requestedSection, aiProviders } = props;

    const [sectionId, setSectionId] = useState<string>(SETTINGS_SECTIONS[0].id);

    /* A caller that named a section wins over the overlay's own memory, for that
       opening only: the pane it named is what the user was sent here to find, and
       clicking another nav row after that is the user changing their mind, which no
       later render undoes -- the effect runs again only when the overlay is opened
       again, or opened with a different section named. */
    useEffect(() => {
        if (opened && requestedSection !== undefined) {
            setSectionId(requestedSection);
        }
    }, [opened, requestedSection]);

    if (!opened) {
        return null;
    }

    const section = SETTINGS_SECTIONS.find((entry) => entry.id === sectionId) ?? SETTINGS_SECTIONS[0];

    return (
        <Box
            data-testid="settings-overlay"
            style={{
                position: "absolute",
                inset: 0,
                zIndex: SHELL_OVERLAY_Z_INDEX,
                display: "flex",
                padding: OVERLAY_INSET,
                boxSizing: "border-box",
            }}
        >
            <Overlay backgroundOpacity={0.6} zIndex={0} />

            <Box
                role="dialog"
                aria-modal="true"
                aria-label={SETTINGS_LABEL}
                style={{
                    position: "relative",
                    flex: "1 1 auto",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    background: PANEL_INK.PANEL,
                    border: `1px solid ${PANEL_INK.BORDER}`,
                    borderRadius: "var(--mantine-radius-lg)",
                    boxShadow: "var(--mantine-shadow-xl)",
                    boxSizing: "border-box",
                    overflow: "hidden",
                }}
            >
                <Box
                    component="header"
                    style={{
                        flex: `0 0 ${PANEL_HEADER_HEIGHT}px`,
                        height: PANEL_HEADER_HEIGHT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: PANEL_GRID.TRAIL_GAP,
                        paddingInlineStart: PANEL_GRID.PAD_LEFT,
                        paddingInlineEnd: PANEL_GRID.PAD_RIGHT + PANEL_GRID.TRIPLE_GAP,
                        borderBottom: `1px solid ${PANEL_INK.DIVIDER}`,
                        boxSizing: "border-box",
                    }}
                >
                    <Box style={{ display: "flex", alignItems: "center", gap: PANEL_GRID.TRAIL_GAP, minWidth: 0 }}>
                        <Box aria-hidden="true" style={{ display: "flex", color: PANEL_INK.CHROME }}>
                            <UiGlyph name="gear" size={PANEL_GRID.GLYPH} />
                        </Box>
                        <Box
                            component="h2"
                            style={{
                                margin: 0,
                                fontSize: TITLE_FONT_SIZE,
                                fontWeight: 500,
                                lineHeight: 1.2,
                                color: PANEL_INK.VALUE,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {SETTINGS_LABEL}
                        </Box>
                    </Box>

                    <Box style={{ display: "flex", alignItems: "center", gap: PANEL_GRID.TRAIL_GAP }}>
                        <Box
                            component="span"
                            style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}
                        >
                            {AUTOSAVE_LINE}
                        </Box>
                        <ActionIcon
                            type="button"
                            variant="subtle"
                            size={PANEL_GRID.CONTROL_HEIGHT}
                            radius="sm"
                            c={PANEL_INK.CHROME}
                            title={CLOSE_TOOLTIP}
                            aria-label={CLOSE_LABEL}
                            data-testid="settings-close"
                            onClick={onClose}
                        >
                            <UiGlyph name="close" size={PANEL_GRID.CHEVRON} />
                        </ActionIcon>
                    </Box>
                </Box>

                <Box style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "row" }}>
                    <Box
                        role="tablist"
                        aria-label={SETTINGS_LABEL}
                        aria-orientation="vertical"
                        data-testid="settings-nav"
                        style={{
                            flex: `0 0 ${NAV_WIDTH}px`,
                            width: NAV_WIDTH,
                            display: "flex",
                            flexDirection: "column",
                            gap: NAV_GAP,
                            padding: PANEL_GRID.TRAIL_GAP,
                            borderInlineEnd: `1px solid ${PANEL_INK.DIVIDER}`,
                            boxSizing: "border-box",
                            overflowY: "auto",
                        }}
                    >
                        {SETTINGS_SECTIONS.map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                role="tab"
                                aria-selected={entry.id === section.id}
                                title={entry.title}
                                onClick={() => {
                                    setSectionId(entry.id);
                                }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    height: NAV_ROW_HEIGHT,
                                    paddingInline: PANEL_GRID.TRAIL_GAP,
                                    border: "none",
                                    borderRadius: "var(--mantine-radius-sm)",
                                    background: entry.id === section.id ? PANEL_INK.RAISED : "transparent",
                                    color: PANEL_INK.VALUE,
                                    fontSize: "var(--mantine-font-size-md)",
                                    lineHeight: 1.2,
                                    textAlign: "start",
                                    cursor: "pointer",
                                }}
                            >
                                {entry.label}
                            </button>
                        ))}
                    </Box>

                    <Box
                        role="tabpanel"
                        aria-label={section.label}
                        data-testid="settings-pane"
                        style={{
                            flex: "1 1 auto",
                            minWidth: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: PANEL_GRID.TRAIL_GAP,
                            padding: PANEL_GRID.PAD_LEFT,
                            overflowY: "auto",
                        }}
                    >
                        <Box style={{ display: "flex", alignItems: "center", gap: PANEL_GRID.TRIPLE_GAP, minWidth: 0 }}>
                            <Box
                                component="h3"
                                style={{
                                    margin: 0,
                                    fontSize: TITLE_FONT_SIZE,
                                    fontWeight: 500,
                                    lineHeight: 1.2,
                                    color: PANEL_INK.VALUE,
                                }}
                            >
                                {section.label}
                            </Box>

                            {/* IC-6's info circle on the pane heading (Settings.dc.html:752). A
                                title, not a pop-out: the sentence is taught text that is read
                                once, and the artboard draws it as the hover of a 14px circle. */}
                            {section.info !== undefined && (
                                <Box
                                    title={section.info}
                                    data-testid="settings-pane-info"
                                    style={{
                                        display: "inline-flex",
                                        flex: "0 0 auto",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: PANEL_GRID.GLYPH,
                                        height: PANEL_GRID.GLYPH,
                                        color: PANEL_INK.CHROME,
                                        cursor: "default",
                                    }}
                                >
                                    <UiGlyph name="info" size={PANEL_GRID.CHEVRON} />
                                </Box>
                            )}
                        </Box>

                        {section.id === "appearance" && <ColorSchemeToggle />}

                        {/* Settings > AI providers, the destination spec 5.1 already promised
                            and 5.3 AI tier 3 opens from the assistant's setup prompt. The pane
                            is the same component the AI settings dialog draws, so the app has
                            one key-entry surface rather than two. */}
                        {section.id === "ai" && <AiProviderSettings {...aiProviders} />}

                        {section.id === "shortcuts" && (
                            <Box
                                component="table"
                                data-testid="settings-shortcuts-table"
                                style={{ borderCollapse: "collapse", fontSize: "var(--mantine-font-size-sm)" }}
                            >
                                <tbody>
                                    {SHELL_KEY_BINDINGS.map((binding) => (
                                        <tr key={binding.id}>
                                            <Box
                                                component="td"
                                                style={{
                                                    paddingBlock: PANEL_GRID.TRIPLE_GAP,
                                                    paddingInlineEnd: PANEL_GRID.PAD_LEFT,
                                                    color: binding.shipped ? PANEL_INK.VALUE : PANEL_INK.DISABLED,
                                                }}
                                            >
                                                {binding.action}
                                            </Box>
                                            <Box
                                                component="td"
                                                style={{
                                                    paddingBlock: PANEL_GRID.TRIPLE_GAP,
                                                    paddingInlineEnd: PANEL_GRID.PAD_LEFT,
                                                    color: PANEL_INK.CHROME,
                                                }}
                                            >
                                                {/* The two sanctioned table sites of 10.3 share one
                                                    joiner, so this cell and the `?` dialog cannot
                                                    print a binding differently. */}
                                                {binding.shipped ? formatChords(binding.chords) : ""}
                                            </Box>
                                            <Box component="td">{binding.shipped ? null : <ComingTag />}</Box>
                                        </tr>
                                    ))}
                                </tbody>
                            </Box>
                        )}

                        {!SHIPPED_SECTION_IDS.includes(section.id) && (
                            <Box style={{ display: "flex", alignItems: "center", gap: PANEL_GRID.TRAIL_GAP }}>
                                <ComingTag />
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
