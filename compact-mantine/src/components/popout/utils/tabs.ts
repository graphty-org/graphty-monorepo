// Mantine's Tabs derives a tab's id and the id its aria-controls points at from
// the Tabs `id` prop: `${id}-tab-${value}` and `${id}-panel-${value}`
// (@mantine/core Tabs.tsx, getTabId / getPanelId). The pop-out's header draws
// the tab list and the panel draws the tab panel, so both sides build the ids
// the same way from one base.

/**
 * The id Mantine gives a tab.
 * @param base - The Tabs `id`
 * @param value - The tab's value
 * @returns The tab element's id
 */
export function tabId(base: string, value: string | undefined): string {
    return `${base}-tab-${value ?? ""}`;
}

/**
 * The id Mantine points a tab's aria-controls at.
 * @param base - The Tabs `id`
 * @param value - The tab's value
 * @returns The tab panel's id
 */
export function tabPanelId(base: string, value: string | undefined): string {
    return `${base}-panel-${value ?? ""}`;
}
