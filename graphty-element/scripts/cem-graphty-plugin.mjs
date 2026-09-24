/**
 * The custom elements manifest analyzer plugin for `<graphty-element>`.
 *
 * It fixes two things the analyzer cannot know on its own:
 *
 * 1. **Private fields are not API.** The element stores its state in `#`-prefixed fields, which
 *    the analyzer records as members. A manifest is what an editor, a React wrapper generator
 *    and a documentation viewer read to decide what a consumer may touch, so shipping private
 *    storage there invites code that breaks on the next refactor.
 * 2. **The events have names.** The element forwards every internal graph event to the DOM with
 *    a name computed at run time, so all the analyzer can see is "a CustomEvent" with no name.
 *    The names are recovered from `src/events.ts` by `dom-events.mjs`.
 *
 * Anything the analyzer already found correctly is left alone: a named event it saw survives,
 * and no slot, CSS part or CSS custom property is invented here, because the element declares
 * none.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readDomEvents } from "./dom-events.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The tag this plugin corrects. Other declarations in the manifest are untouched. */
const TAG_NAME = "graphty-element";

/**
 * Builds the analyzer plugin.
 * @returns {{ name: string, packageLinkPhase: (context: { customElementsManifest: unknown }) => void }}
 *     A plugin for `@custom-elements-manifest/analyzer`.
 */
export function graphtyManifestPlugin() {
    return {
        name: "graphty-manifest",
        packageLinkPhase({ customElementsManifest }) {
            const forwarded = readDomEvents(resolve(packageRoot, "src/events.ts"));

            for (const module of customElementsManifest.modules ?? []) {
                for (const declaration of module.declarations ?? []) {
                    if (declaration.tagName !== TAG_NAME) {
                        continue;
                    }

                    declaration.members = (declaration.members ?? []).filter(
                        (member) => typeof member.name === "string" && !member.name.startsWith("#"),
                    );

                    /** @type {Map<string, Record<string, unknown>>} */
                    const events = new Map();

                    for (const event of declaration.events ?? []) {
                        if (typeof event.name === "string" && event.name.length > 0) {
                            events.set(event.name, event);
                        }
                    }

                    for (const event of forwarded) {
                        if (events.has(event.name)) {
                            continue;
                        }

                        events.set(event.name, {
                            name: event.name,
                            type: { text: `CustomEvent<${event.detail}>` },
                            ... (event.description ? { description: event.description } : {}),
                        });
                    }

                    declaration.events = [...events.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
                }
            }
        },
    };
}
