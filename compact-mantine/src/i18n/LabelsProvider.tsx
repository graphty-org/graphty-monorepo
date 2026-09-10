import React, { createContext, useContext, useMemo } from "react";

import { type CompactMantineLabels, defaultLabels } from "./labels";

// The language tag used when nothing else says which one to use. Kept as bare
// "en" rather than "en-US" so that a consumer who never sets a locale still gets
// the English defaults the package ships without inheriting American number and
// date conventions by accident.
const FALLBACK_LOCALE = "en";

// The root value is the English default set, so useLabels() with no provider
// above it returns the shipped strings and nothing breaks for a consumer who
// does not care about translation.
const LabelsContext = createContext<CompactMantineLabels>(defaultLabels);

// Undefined means "nobody has said", which is what lets the resolution order in
// resolveLocale fall through to the document and then to the browser.
const LocaleContext = createContext<string | undefined>(undefined);

/**
 * Works out which locale is in force.
 *
 * Resolution order: the locale a `LabelsProvider` was given, then the `lang`
 * attribute on the document, then the browser's own preference, then English.
 * @param provided - The locale from the nearest `LabelsProvider`, if there is one
 * @returns A BCP 47 language tag
 */
function resolveLocale(provided: string | undefined): string {
    if (provided !== undefined && provided !== "") {
        return provided;
    }

    // Mantine 8 core exposes no locale of its own -- verified against
    // @mantine/core 8.3.10: neither MantineProvider nor the theme carries one,
    // and only @mantine/dates has a DatesProvider locale, which this package
    // does not depend on. The document's `lang` attribute stands in for it, and
    // is the same channel Mantine's own DirectionProvider reads `dir` from.
    if (typeof document !== "undefined" && document.documentElement.lang !== "") {
        return document.documentElement.lang;
    }

    if (typeof navigator !== "undefined" && navigator.language !== "") {
        return navigator.language;
    }

    return FALLBACK_LOCALE;
}

/**
 * Props for the LabelsProvider component.
 */
export interface LabelsProviderProps {
    /**
     * The strings to replace. Anything left out keeps the English default, and
     * anything left out of a nested provider keeps the value from the provider
     * above it.
     */
    labels?: Partial<CompactMantineLabels>;
    /**
     * The BCP 47 language tag numbers, ordinals and sorting are formatted for,
     * such as `"de-DE"`. Leave it out to use the document's `lang` attribute and
     * then the browser's own preference.
     */
    locale?: string;
    /** The part of the tree the strings and the locale apply to. */
    children: React.ReactNode;
}

/**
 * Supplies this library's strings and its locale to everything beneath it.
 *
 * Nothing about it is required: every component works with no provider at all
 * and reads the English defaults. Wrap the app when you want to translate the
 * library, to reword a string for your product, or to format numbers for a
 * locale other than the browser's.
 *
 * Providers nest, and an inner one merges over the outer one rather than over
 * the defaults, so a dialog can restate one string without repeating the rest.
 * @param props - Component props
 * @param props.labels - The strings to replace; anything left out is inherited
 * @param props.locale - The BCP 47 language tag to format numbers, ordinals and sorting for
 * @param props.children - The part of the tree the strings and the locale apply to
 * @returns The provider wrapping its children
 * @example
 * ```tsx
 * <LabelsProvider locale="de-DE" labels={{mixed: "Verschieden"}}>
 *     <Inspector />
 * </LabelsProvider>
 * ```
 */
export function LabelsProvider({ labels, locale, children }: LabelsProviderProps): React.JSX.Element {
    const inherited = useContext(LabelsContext);
    const inheritedLocale = useContext(LocaleContext);

    const value = useMemo<CompactMantineLabels>(() => ({ ...inherited, ...labels }), [inherited, labels]);
    const resolvedLocale = locale ?? inheritedLocale;

    return (
        <LocaleContext.Provider value={resolvedLocale}>
            <LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>
        </LocaleContext.Provider>
    );
}

/**
 * Reads this library's strings.
 *
 * Returns the English defaults when there is no `LabelsProvider` above, so a
 * component can always call it and a consumer who does not care about
 * translation is unaffected.
 * @returns A complete set of strings; every entry is always present
 */
export function useLabels(): CompactMantineLabels {
    return useContext(LabelsContext);
}

/**
 * Reads the locale numbers, ordinals and sorting are formatted for.
 *
 * Falls back to the document's `lang` attribute, then to the browser's own
 * preference, then to English, so it always returns a usable language tag.
 * @returns A BCP 47 language tag, such as `"de-DE"`
 */
export function useLocale(): string {
    const provided = useContext(LocaleContext);
    return resolveLocale(provided);
}
