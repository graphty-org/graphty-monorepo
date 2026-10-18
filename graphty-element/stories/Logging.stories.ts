import type { Meta } from "@storybook/web-components-vite";

/**
 * The Configuration / Logging component, with no stories of its own yet. Its page is
 * `stories/Logging.mdx`, which shares this title; this file keeps the component id `logging`, so a
 * story added here later is `logging--<name>`. It declares no `autodocs`, because the MDX page is
 * the section's one Docs entry.
 */
const meta: Meta = {
    title: "Configuration/Logging",
    id: "logging",
    tags: ["!autodocs"],
    parameters: {
        docs: {
            description: {
                component:
                    "Turning on the element's log, choosing its level and categories, and sending it to the console, " +
                    "a remote log server or a destination of your own. See the Configuration / Logging page.",
            },
        },
    },
};

export default meta;
