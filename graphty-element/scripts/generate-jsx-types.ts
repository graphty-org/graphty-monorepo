#!/usr/bin/env node
/**
 * Writes `jsx.ts`, the `@graphty/graphty-element/jsx` entry point, from the custom elements
 * manifest.
 *
 * `npm run build` runs this after `vite build` has written `dist/custom-elements.json` and before
 * `tsc` emits the declarations, so the published `dist/jsx.d.ts` always matches the manifest
 * published beside it. The output is committed too, because the graphty app and the docs read the
 * package from source; `test/packaging/jsx-types.test.ts` fails when the committed file and the
 * manifest disagree.
 *
 * What it writes, for the one tag the manifest describes:
 *
 * - every writable public property, typed as `Graphty["name"]` -- the element's own declared
 *   type, not the manifest's type text, which names types this file cannot import. React 19
 *   assigns a prop whose name is a property of the element as that property, so `nodeData`,
 *   `algorithmsOnLoad` and `acceleration` arrive as arrays and objects, not strings;
 * - every attribute whose name is not also a property name (`node-data`, `layout-2d`), which
 *   React 19 sets as an attribute: `boolean` for a boolean property's attribute, else `string`;
 * - an `on<event-name>` listener prop for every DOM event, which is how React 19 binds an event
 *   on a custom element. A `graphty-` event takes its type from `GraphtyElementEventMap`; a
 *   forwarded graph event takes `CustomEvent<EventOfType<name>>`.
 *
 * Usage: node --experimental-strip-types scripts/generate-jsx-types.ts [manifest] [output]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The tag the generated declaration names. */
const TAG_NAME = "graphty-element";

/** The parts of a custom elements manifest this script reads. */
export interface Manifest {
    modules?: {
        declarations?: {
            tagName?: string;
            members?: {
                kind: string;
                name: string;
                static?: boolean;
                readonly?: boolean;
                privacy?: string;
                description?: string;
            }[];
            attributes?: { name: string; type?: { text: string }; description?: string }[];
            events?: { name: string; description?: string }[];
        }[];
    }[];
}

/** One prop of the generated declaration. */
export interface JsxMember {
    name: string;
    description: string;
}

/** What becomes JSX props: the writable properties, the attributes that are not property names, and the events. */
export interface JsxSurface {
    properties: JsxMember[];
    attributes: (JsxMember & { type: "boolean" | "string" })[];
    events: JsxMember[];
}

/**
 * The parts of `<graphty-element>`'s manifest entry that become JSX props.
 * @param manifest - The custom elements manifest.
 * @returns The writable properties, the attributes that are not property names, and the events.
 * @throws {Error} When the manifest does not describe the tag.
 */
export function jsxSurface(manifest: Manifest): JsxSurface {
    const declaration = (manifest.modules ?? [])
        .flatMap((module) => module.declarations ?? [])
        .find((candidate) => candidate.tagName === TAG_NAME);

    if (declaration === undefined) {
        throw new Error(`The custom elements manifest does not describe <${TAG_NAME}>.`);
    }

    const properties = (declaration.members ?? [])
        .filter(
            (member) =>
                member.kind === "field" &&
                !member.static &&
                !member.readonly &&
                (member.privacy ?? "public") === "public" &&
                !member.name.startsWith("#"),
        )
        .map((member) => ({ name: member.name, description: member.description ?? "" }));
    const propertyNames = new Set(properties.map((property) => property.name));

    const attributes = (declaration.attributes ?? [])
        .filter((attribute) => !propertyNames.has(attribute.name))
        .map((attribute) => ({
            name: attribute.name,
            type: /^boolean( \| undefined)?$/.test(attribute.type?.text ?? "")
                ? ("boolean" as const)
                : ("string" as const),
            description: attribute.description ?? "",
        }));

    const events = (declaration.events ?? []).map((event) => ({
        name: event.name,
        description: event.description ?? "",
    }));

    return { properties, attributes, events };
}

/**
 * A property key as Prettier writes it: bare when it is an identifier, quoted otherwise.
 * @param name - The key.
 * @returns The key as written in the interface.
 */
function key(name: string): string {
    return /^[A-Za-z_$][\w$]*$/.test(name) ? name : `"${name}"`;
}

/**
 * A JSDoc block for one member, or nothing when the manifest has no description for it.
 * @param description - The manifest's description.
 * @param indent - The indentation of the member.
 * @returns The comment lines, each ending in a newline.
 */
function doc(description: string, indent: string): string {
    if (description.trim() === "") {
        return "";
    }

    const lines = description
        .trim()
        .replaceAll("*/", "*\\/")
        .split("\n")
        .map((line) => (line.trim() === "" ? `${indent} *` : `${indent} * ${line.trimEnd()}`));

    return `${indent}/**\n${lines.join("\n")}\n${indent} */\n`;
}

/**
 * The source of `jsx.ts` for a manifest.
 * @param manifest - The custom elements manifest.
 * @returns The file's contents.
 */
export function generateJsxTypes(manifest: Manifest): string {
    const { properties, attributes, events } = jsxSurface(manifest);
    const indent = "    ";
    const members = [
        ...properties.map(
            ({ name, description }) => `${doc(description, indent)}${indent}${name}?: Graphty["${name}"];`,
        ),
        ...attributes.map(
            ({ name, type, description }) => `${doc(description, indent)}${indent}${key(name)}?: ${type};`,
        ),
        ...events.map(({ name, description }) => {
            const type = name.startsWith("graphty-")
                ? `GraphtyElementEventMap["${name}"]`
                : `CustomEvent<EventOfType<"${name}">>`;

            return `${doc(description, indent)}${indent}${key(`on${name}`)}?: (event: ${type}) => void;`;
        }),
    ];

    return `/**
 * @file \`@graphty/graphty-element/jsx\`: \`<graphty-element>\` typed for JSX.
 *
 * THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT scripts/generate-jsx-types.ts
 * (\`npm run build\` rewrites it from the custom elements manifest).
 *
 * Nothing is declared until a program opts in, with one line anywhere in it:
 *
 * \`\`\`ts
 * import type {} from "@graphty/graphty-element/jsx";
 * \`\`\`
 *
 * or with \`"types": ["@graphty/graphty-element/jsx"]\` in tsconfig.json. This entry point has no
 * JavaScript: it carries types only. Importing the element never applies it.
 *
 * The declaration is for React 19, which assigns a prop whose name is a property of the element as
 * that property and binds an \`on<event-name>\` prop as a listener for that DOM event. Another JSX
 * framework can declare the tag in its own namespace with {@link GraphtyElementJSXProps}.
 */

import type * as ReactTypes from "react";

import type { Graphty, GraphtyElementEventMap } from "./index";
import type { EventOfType } from "./src/events";

/**
 * Every property, attribute and event listener \`<graphty-element>\` accepts in JSX, besides the
 * ordinary HTML attributes.
 */
export interface GraphtyElementJSXProps {
${members.join("\n")}
}

// Named through an alias: inside the augmentation, a bare DetailedHTMLProps is React's own
// module-scope name, which the declaration emit cannot write.
declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "${TAG_NAME}": ReactTypes.DetailedHTMLProps<ReactTypes.HTMLAttributes<Graphty>, Graphty> &
                GraphtyElementJSXProps;
        }
    }
}
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const manifestPath = resolve(process.argv[2] ?? resolve(packageRoot, "dist/custom-elements.json"));
    const outputPath = resolve(process.argv[3] ?? resolve(packageRoot, "jsx.ts"));

    writeFileSync(outputPath, generateJsxTypes(JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest));
}
