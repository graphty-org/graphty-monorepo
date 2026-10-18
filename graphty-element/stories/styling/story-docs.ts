/**
 * @file What the Styling stories show a reader beside the canvas: the code a consumer would write
 * to get the same picture.
 *
 * Storybook's own source for these stories is the plumbing (`renderFn`, `storySetup`), which no
 * consumer writes. `parameters.docs.source.transform` replaces it with the element calls the story
 * makes, built from the story's live args, so the code still matches after a reader moves a
 * control.
 *
 * ponytail: the arg-to-setup mapping below repeats the one `renderFn` in ../helpers.ts applies.
 * When a shared source helper lands in helpers.ts, these stories should call that instead.
 */

import type { StoryContext } from "@storybook/web-components-vite";

import type { LayerSpec } from "../../src/catalog/types";
import { catSocialNetwork2FixedUrl, catSocialNetwork2Url, data2Url, skyboxUrl } from "../datasets";

/** Everything a consumer sets on the element to draw one of these stories. */
export interface ConsumerParts {
    viewMode?: unknown;
    background?: unknown;
    selectionStyle?: unknown;
    layoutBehavior?: unknown;
    layers?: readonly LayerSpec[];
    nodeData?: unknown;
    edgeData?: unknown;
    dataSource?: unknown;
    dataSourceConfig?: unknown;
    layoutConfig?: Record<string, unknown>;
    layout?: unknown;
    /** A node the story selects once the layout settles. */
    select?: string;
}

/** The stories' served files, by the name a consumer would give the same file next to their page. */
const SERVED_FILES = new Map<string, string>([
    [catSocialNetwork2Url, "cat-social-network.json"],
    [catSocialNetwork2FixedUrl, "cat-social-network-fixed-positions.json"],
    [data2Url, "data2.json"],
    [skyboxUrl, "skybox.png"],
]);

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * Write a value as a JavaScript literal, short arrays and objects on one line.
 * @param value - The value.
 * @param indent - The indent of the line the value starts on.
 * @returns The literal.
 */
function literal(value: unknown, indent = ""): string {
    if (typeof value === "string") {
        const file = SERVED_FILES.get(value);

        return file === undefined ? JSON.stringify(value) : `new URL(${JSON.stringify(file)}, document.baseURI).href`;
    }

    if (value === null || typeof value !== "object") {
        return String(value);
    }

    const inner = `${indent}    `;
    const entries = Array.isArray(value)
        ? value.map((item) => literal(item, inner))
        : Object.entries(value as Record<string, unknown>)
              .filter(([, item]) => item !== undefined)
              .map(([key, item]) => `${IDENTIFIER.test(key) ? key : JSON.stringify(key)}: ${literal(item, inner)}`);
    const [open, close] = Array.isArray(value) ? ["[", "]"] : ["{ ", " }"];

    if (entries.length === 0) {
        return Array.isArray(value) ? "[]" : "{}";
    }

    const oneLine = `${open}${entries.join(", ")}${close}`;

    if (oneLine.length + indent.length <= 100 && !oneLine.includes("\n")) {
        return oneLine;
    }

    return `${open.trim()}\n${entries.map((entry) => `${inner}${entry},`).join("\n")}\n${indent}${close.trim()}`;
}

/**
 * The code a consumer writes to draw what a story draws.
 * @param parts - What the story sets on the element.
 * @returns HTML plus a module script, ready to paste into a page that loads the element.
 */
export function consumerSource(parts: ConsumerParts): string {
    const lines: string[] = [
        '<graphty-element style="display: block; width: 100%; height: 600px"></graphty-element>',
        "",
        '<script type="module">',
        '    import "@graphty/graphty-element";',
        "",
        '    const graph = document.querySelector("graphty-element");',
    ];
    const assign = (property: keyof ConsumerParts): void => {
        if (parts[property] !== undefined) {
            lines.push(`    graph.${property} = ${literal(parts[property], "    ")};`);
        }
    };

    assign("viewMode");
    assign("background");
    assign("selectionStyle");
    assign("layoutBehavior");

    for (const layer of parts.layers ?? []) {
        lines.push(`    graph.session.styles.add(${literal(layer, "    ")});`);
    }

    assign("nodeData");
    assign("edgeData");
    assign("dataSourceConfig");
    assign("dataSource");

    if (parts.layoutConfig !== undefined && Object.keys(parts.layoutConfig).length > 0) {
        assign("layoutConfig");
    }

    assign("layout");

    if (parts.select !== undefined) {
        lines.push(
            `    graph.addEventListener("graph-settled", () => graph.selectNode(${JSON.stringify(parts.select)}));`,
        );
    }

    lines.push("</script>");

    return lines.join("\n");
}

/** What `storySetup` in ../helpers.ts carries, as far as a consumer's code needs it. */
interface Setup {
    node?: Record<string, unknown>;
    nodeEncode?: Record<string, unknown>;
    edge?: Record<string, unknown>;
    edgeEncode?: Record<string, unknown>;
    layers?: readonly LayerSpec[];
    viewMode?: unknown;
    background?: unknown;
    declutterLabels?: boolean;
}

/**
 * Write one control's value where `renderFn` writes it: a style channel, or one field of a label style.
 * @param setup - The setup being built.
 * @param name - The control's name, such as `node.color` or `node.labelStyle.font`.
 * @param value - The control's value.
 */
function writeControl(setup: Setup, name: string, value: unknown): void {
    const target = ["node", "edge"].find((thing) => name.startsWith(`${thing}.`)) as "node" | "edge" | undefined;

    if (target === undefined) {
        if (name === "background.color" && typeof value === "string" && value !== "") {
            setup.background = { backgroundType: "color", color: value };
        } else if (name === "background.skybox" && typeof value === "string" && value !== "") {
            setup.background = { backgroundType: "skybox", data: value };
        }

        return;
    }

    const style = { ...setup[target] };
    const labelChannel = `${target}.labelStyle`;

    if (name.startsWith(`${labelChannel}.`)) {
        style[labelChannel] = {
            ...(style[labelChannel] as Record<string, unknown> | undefined),
            [name.slice(labelChannel.length + 1)]: value,
        };
    } else {
        style[name] = value;
    }

    setup[target] = style;
}

/**
 * The consumer's code for a story drawn by `renderFn`, from the story's live args.
 *
 * Use as `parameters.docs.source.transform` on a meta whose `render` is `renderFn`.
 * @param _code - Storybook's own source for the story, which is the plumbing; not used.
 * @param context - The story, with its current args.
 * @returns The code.
 */
export function renderFnSource(_code: string, context: StoryContext): string {
    const args = context.args as Record<string, unknown>;
    const setup: Setup = { ...(args.setup as Setup | undefined) };
    const layoutConfig: Record<string, unknown> = { ...(args.layoutConfig as Record<string, unknown> | undefined) };

    for (const [arg, value] of Object.entries(args)) {
        const name = context.argTypes[arg]?.name;

        if (name === undefined || name === arg || value === undefined) {
            continue;
        }

        if (name.startsWith("layoutConfig.")) {
            layoutConfig[name.slice("layoutConfig.".length)] = value;
        } else {
            writeControl(setup, name, value);
        }
    }

    const layers: LayerSpec[] = [];
    const everything = { match: "everything" } as const;

    if (setup.node !== undefined || setup.nodeEncode !== undefined) {
        layers.push({
            name: "every node",
            target: "node",
            selector: everything,
            ...(setup.node === undefined ? {} : { set: setup.node }),
            ...(setup.nodeEncode === undefined ? {} : { encode: setup.nodeEncode }),
        });
    }

    if (setup.edge !== undefined || setup.edgeEncode !== undefined) {
        layers.push({
            name: "every edge",
            target: "edge",
            selector: everything,
            ...(setup.edge === undefined ? {} : { set: setup.edge }),
            ...(setup.edgeEncode === undefined ? {} : { encode: setup.edgeEncode }),
        });
    }

    layers.push(...(setup.layers ?? []));

    const fromData = args.dataSource !== undefined;

    return consumerSource({
        viewMode: setup.viewMode,
        background: setup.background,
        layoutBehavior:
            setup.declutterLabels === undefined ? undefined : { labels: { declutter: setup.declutterLabels } },
        layers,
        nodeData: fromData ? undefined : args.nodeData,
        edgeData: fromData ? undefined : args.edgeData,
        dataSourceConfig: fromData ? args.dataSourceConfig : undefined,
        dataSource: args.dataSource,
        layoutConfig,
        layout: args.layout,
    });
}
