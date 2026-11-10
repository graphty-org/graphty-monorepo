/** The layout form's Transition row: its name, its choices and its settings. */
export const TRANSITION_WORDS = {
    transition: "Transition",
    none: "None",
    seconds: "Seconds",
    /** An unset duration: the element's own. */
    defaultSeconds: "Default",
    settings: (name: string): string => `${name} settings`,
} as const;

/** The layout form's row that lays out only the nodes the filter shows. */
export const SHOWN_ONLY_WORDS = {
    shownOnly: "Shown nodes only",
} as const;
