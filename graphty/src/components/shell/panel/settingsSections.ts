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
