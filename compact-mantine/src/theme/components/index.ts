import type { MantineThemeComponents } from "@mantine/core";

/**
 * Every Mantine component extension in this folder, collected from each file's
 * `*ComponentExtensions` exports, so a package adds a theme file (for example `color.ts`)
 * without touching this registry.
 *
 * Two files extending the same Mantine component is a mistake that would otherwise be silent
 * (the later file would win), so it throws at load.
 */
const modules = import.meta.glob<Record<string, unknown>>(["./*.ts", "!./index.ts"], { eager: true });

function collect(): MantineThemeComponents {
    const all: MantineThemeComponents = {};
    const owner: Record<string, string> = {};
    for (const path of Object.keys(modules).sort()) {
        for (const [exportName, value] of Object.entries(modules[path])) {
            if (!exportName.endsWith("ComponentExtensions")) {
                continue;
            }
            for (const [component, extension] of Object.entries(value as MantineThemeComponents)) {
                if (component in owner) {
                    throw new Error(`compact-mantine: ${component} is extended in both ${owner[component]} and ${path}`);
                }
                owner[component] = path;
                all[component] = extension;
            }
        }
    }
    return all;
}

/** Every component extension, keyed by Mantine component name. */
export const componentExtensions: MantineThemeComponents = collect();
