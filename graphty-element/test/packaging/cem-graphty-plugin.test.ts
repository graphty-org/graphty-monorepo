/**
 * @file The custom elements manifest plugin rewrites only `<graphty-element>`'s declaration: it
 * drops private members and replaces the analyzer's events with the element's own events
 * (keeping what the analyzer found about each) and the events it forwards, sorted by name.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));

// The scripts are plain JavaScript with no declaration files, so they are loaded by path and
// typed here.
interface DomEvent {
    name: string;
    detail: string;
    description: string;
}

interface OwnDomEvent {
    name: string;
    type: string;
}

interface DomEventsModule {
    readDomEvents: (file: string) => DomEvent[];
    readOwnDomEvents: (file: string) => OwnDomEvent[];
}

interface PluginModule {
    graphtyManifestPlugin: () => {
        packageLinkPhase: (context: { customElementsManifest: unknown }) => void;
    };
}

const pluginPath = resolve(PACKAGE_ROOT, "scripts/cem-graphty-plugin.mjs");
const domEventsPath = resolve(PACKAGE_ROOT, "scripts/dom-events.mjs");
const { graphtyManifestPlugin } = (await import(pluginPath)) as PluginModule;
const { readDomEvents, readOwnDomEvents } = (await import(domEventsPath)) as DomEventsModule;

interface Declaration {
    tagName?: string;
    members?: { name?: unknown }[];
    events?: Record<string, unknown>[];
}

function run(declarations: Declaration[]): void {
    const customElementsManifest = { modules: [{}, { declarations }] };
    graphtyManifestPlugin().packageLinkPhase({ customElementsManifest });
}

describe("graphtyManifestPlugin", () => {
    const own = readOwnDomEvents(resolve(PACKAGE_ROOT, "src/graphty-element.ts"));
    const forwarded = readDomEvents(resolve(PACKAGE_ROOT, "src/events.ts"));

    it("leaves other declarations alone", () => {
        const other: Declaration = { tagName: "other-element", members: [{ name: "#x" }], events: [{ name: "name" }] };
        const before = structuredClone(other);
        run([other]);
        assert.deepEqual(other, before);
    });

    it("drops private and unnamed members", () => {
        const element: Declaration = {
            tagName: "graphty-element",
            members: [{ name: "#state" }, { name: "layout" }, {}],
        };
        run([element]);
        assert.deepEqual(element.members, [{ name: "layout" }]);
    });

    it("lists own then forwarded events by name, keeping what the analyzer found", () => {
        assert.isAbove(own.length, 0);
        assert.isAbove(forwarded.length, 0);
        const ownName = own[0].name;
        const element: Declaration = {
            tagName: "graphty-element",
            events: [
                { name: ownName, description: "analyzed", type: { text: "Event" } },
                { name: "name", type: { text: "CustomEvent" } },
            ],
        };
        run([element]);

        const events = element.events ?? [];
        const names = events.map((event) => String(event.name));
        const expected = [...new Set([...own.map((e) => e.name), ...forwarded.map((e) => e.name)])].sort((a, b) =>
            a.localeCompare(b),
        );
        assert.deepEqual(names, expected);
        assert.notInclude(names, "name");

        const first = events.find((event) => event.name === ownName);
        assert.deepEqual(first, { name: ownName, description: "analyzed", type: { text: own[0].type } });

        for (const event of forwarded) {
            if (own.some((o) => o.name === event.name)) {
                continue;
            }

            const written = events.find((e) => e.name === event.name);
            const expectedEvent: Record<string, unknown> = {
                name: event.name,
                type: { text: `CustomEvent<${event.detail}>` },
            };
            if (event.description) {
                expectedEvent.description = event.description;
            }

            assert.deepEqual(written, expectedEvent);
        }
    });
});
