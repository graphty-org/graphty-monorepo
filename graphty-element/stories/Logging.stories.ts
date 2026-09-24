import type { Meta } from "@storybook/web-components-vite";

const meta: Meta = {
    title: "Logging",
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component: `
# Logging System

The graphty-element logging system provides configurable, hierarchical logging for debugging and development.

## Where to import it from

Everything below comes from \`@graphty/graphty-element/logging\`, which resolves in Node with no
renderer anywhere in its import graph. The registration verb for a destination of your own,
\`registerLogSink\`, comes from \`@graphty/graphty-element/extend\`.

## Log Levels

From least to most verbose:

1. **silent** - No logging
2. **error** - Errors only
3. **warn** - Warnings and above
4. **info** - Info and above
5. **debug** - Debug and above
6. **trace** - All messages

## Programmatic Usage

\`\`\`typescript
import { GraphtyLogger, LogLevel } from "@graphty/graphty-element/logging";

// Configure logging
await GraphtyLogger.configure({
    enabled: true,
    level: LogLevel.DEBUG,
    modules: "*", // or ["layout", "xr"]
    format: { timestamp: true, module: true }
});

// Get a logger for a specific module
const logger = GraphtyLogger.getLogger(["graphty", "myModule"]);
logger.info("Message", { data: "value" });
logger.debug("Debug info");
logger.error("Something went wrong", error);
\`\`\`

## Turning logging on from the page's query string

The element does not read the query string. A component that reconfigured global logging
because of something in its host page's URL could not be opted out of and could not be tested,
so the reading moved to the page that wants it -- the parser is still published, and one call
wires it back up:

\`\`\`typescript
import { GraphtyLogger, LogLevel, parseLoggingURLParams } from "@graphty/graphty-element/logging";

// ?graphty-element-logging=layout:debug,xr:trace&graphty-element-log-level=debug
const params = parseLoggingURLParams();
if (params?.enabled) {
    await GraphtyLogger.configure({
        enabled: true,
        modules: params.modules,
        level: params.level ?? LogLevel.INFO,
        format: { timestamp: true, module: true, colors: true },
    });
}
\`\`\`
`,
            },
        },
    },
};

export default meta;
