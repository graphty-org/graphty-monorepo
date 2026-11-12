import { CHANNELS, channelsFor, LABEL_STYLE_FIELDS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import {
    CHANNEL_HOMES,
    COLOR_BRANCHES,
    DESIGN_PLACED,
    GRAPH_SETTING_HOMES,
    type Home,
    homeless,
    LABEL_FIELD_HOMES,
    noVaryReason,
    PER_VALUE_CONTROLS,
    publishedGraphSettings,
} from "../coverage";
import { LABEL_SETTINGS_FIELDS } from "../labelFields";
import { fieldChannelOf } from "../offered";
import { isPercent, sectionsFor, takesBinding, TEXT_KINDS, valueFieldKind } from "../words";

/**
 * A path the glob gives relative to this folder, as a path under `src/`.
 * @param path - such as `../BindingPopover.tsx` or `../../inspector/Inspector.tsx`.
 * @returns such as `workspace/style/BindingPopover.tsx`.
 */
function fromSrc(path: string): string {
    const here = ["workspace", "style", "__tests__"];
    const parts = path.split("/");
    while (parts[0] === "..") {
        parts.shift();
        here.pop();
    }
    return [...here, ...parts.filter((part) => part !== ".")].join("/");
}

/** The app's sources, by path under `src/`, as text: the rule is app-wide. */
const SOURCES: Readonly<Record<string, string>> = Object.fromEntries(
    Object.entries(
        import.meta.glob<string>(
            [
                "../../../**/*.{ts,tsx}",
                "!../../../**/__tests__/**",
                "!../../../**/*.stories.tsx",
                "!../../../**/*.test.{ts,tsx}",
            ],
            {
                query: "?raw",
                import: "default",
                eager: true,
            },
        ),
    ).map(([path, text]) => [fromSrc(path), text]),
);

/** A branch on a color: `accepts === "color"`, `accepts !== "color"` or `isColor`. */
const COLOR_BRANCH = /accepts [!=]== "color"|\bisColor\b/g;

/** Every section of the Style tab, the experiments' included. */
const ALL_SECTIONS = [
    ...sectionsFor("node", { cosmograph: true, nodeModels: true }),
    ...sectionsFor("edge", { cosmograph: true, nodeModels: true }),
];

/** Every channel a section of the Style tab draws as a line, the experiments' included. */
const DRAWN = new Set<string>(ALL_SECTIONS.flatMap((section) => section.channels));

/**
 * Every channel a text entry varies beside a field of its Label settings (the letter size, the font),
 * or beside its own Position line.
 */
const VARIED = (["node", "edge"] as const).flatMap((side) =>
    TEXT_KINDS[side].flatMap((kind) =>
        [...LABEL_SETTINGS_FIELDS, "location" as const].flatMap(
            (field) => fieldChannelOf(side, kind.words, field) ?? [],
        ),
    ),
);

/**
 * Every channel the Style tab sets: its lines, what a line sets from inside (Model settings), and
 * what a text entry varies through its Label settings.
 */
const PLACED = new Set<string>([...DRAWN, ...ALL_SECTIONS.flatMap((section) => section.inner ?? []), ...VARIED]);

/**
 * The only styles the panel may leave without a control, each for a reason no control could fix.
 * Every other channel, label style field and graph setting has an `at(...)` home, so a channel
 * graphty-element adds later fails here until the panel draws a control for it.
 */
const NOT_OFFERED = [
    "node.marker",
    "label field size",
    "viewMode",
    "twoD",
    "addDefaultStyle",
    "startingRows",
    "startingCameraDistance",
    "layout",
    "layoutOptions",
];

/**
 * The names a home map marks "not offered".
 * @param homes - the map.
 * @param prefix - put before each name, to tell label fields from channels.
 * @returns the names, in the map's order.
 */
function notOfferedIn(homes: Readonly<Record<string, Home>>, prefix = ""): string[] {
    return Object.entries(homes).flatMap(([name, home]) => ("notOffered" in home ? [prefix + name] : []));
}

describe("every style has a home", () => {
    it("gives every style a control except the few no control could set", () => {
        assert.deepEqual(
            [
                ...notOfferedIn(CHANNEL_HOMES),
                ...notOfferedIn(LABEL_FIELD_HOMES, "label field "),
                ...notOfferedIn(GRAPH_SETTING_HOMES),
            ],
            NOT_OFFERED,
        );
    });

    it("gives every channel graphty-element publishes a control or a reason", () => {
        assert.deepEqual(homeless(CHANNELS, CHANNEL_HOMES), []);
    });

    it("gives every label style field a control or a reason", () => {
        assert.deepEqual(homeless(LABEL_STYLE_FIELDS, LABEL_FIELD_HOMES), []);
    });

    it("gives every published graph setting a control or a reason", () => {
        const published = publishedGraphSettings();
        assert.isAbove(published.length, 0);
        assert.deepEqual(homeless(published, GRAPH_SETTING_HOMES), []);
    });

    it("names an entry the element adds and the map lacks", () => {
        assert.deepEqual(homeless([...CHANNELS, "node.sparkle"], CHANNEL_HOMES), ["node.sparkle"]);
    });

    it("places exactly the channels the Style tab draws, and gives the rest a reason", () => {
        for (const channel of CHANNELS) {
            assert.strictEqual("place" in CHANNEL_HOMES[channel], PLACED.has(channel), channel);
        }
    });

    it("places every model channel: none is left without a row", () => {
        const models = CHANNELS.filter((channel) => channel.startsWith("node.model") || channel === "node.texture");
        assert.isAbove(models.length, 0);
        assert.deepEqual(
            models.filter((channel) => !("place" in CHANNEL_HOMES[channel])),
            [],
        );
    });

    it("draws today's sections with the node-models experiment off", () => {
        const off = sectionsFor("node", { cosmograph: true, nodeModels: false });
        assert.isFalse(off.some((section) => section.channels.includes("node.texture")));
        assert.isFalse(off.some((section) => section.inner !== undefined));
    });

    it("offers every style the design places in the panel: none of them is 'not offered'", () => {
        const notOffered = [
            ...DESIGN_PLACED.channels.filter((channel) => "notOffered" in CHANNEL_HOMES[channel]),
            ...DESIGN_PLACED.labelFields.filter((field) => "notOffered" in LABEL_FIELD_HOMES[field]),
        ];
        assert.deepEqual(notOffered, []);
    });

    it("records why a drawn property has no vary glyph: yes-or-no properties and label looks, by decision", () => {
        const descriptors = [...channelsFor("node"), ...channelsFor("edge")].filter((d) => DRAWN.has(d.channel));
        const neither = descriptors.filter((d) => !takesBinding(d) && noVaryReason(d) === undefined);
        assert.deepEqual(
            neither.map((d) => d.channel),
            [],
        );
        // A reason is never given for a property that does vary.
        assert.deepEqual(
            descriptors.filter((d) => takesBinding(d) && noVaryReason(d) !== undefined).map((d) => d.channel),
            [],
        );
        for (const d of descriptors.filter((x) => x.accepts === "boolean")) {
            assert.isFalse(takesBinding(d), `${d.channel} is yes-or-no and has no vary by`);
        }
    });

    it("draws every opacity as a percent that varies by a value", () => {
        const opacities = [...channelsFor("node"), ...channelsFor("edge")].filter((d) => d.channel.endsWith("pacity"));
        assert.isAbove(opacities.length, 0);
        for (const d of opacities) {
            // a channel the panel does not offer yet says why in CHANNEL_HOMES (checked above); every
            // one it places is drawn in a section, or varied from a text entry's Label settings
            if ("place" in CHANNEL_HOMES[d.channel]) {
                assert.isTrue(
                    DRAWN.has(d.channel) || VARIED.includes(d.channel),
                    `${d.channel} is in a section or Label settings`,
                );
            }
            assert.isTrue(takesBinding(d), `${d.channel} varies by a value`);
            assert.isTrue(isPercent(d), `${d.channel} reads as a percent`);
        }
    });
});

describe("no color-only controls", () => {
    const drawn = [...channelsFor("node"), ...channelsFor("edge")].filter((d) => DRAWN.has(d.channel));

    it("reads the Style tab's sources", () => {
        assert.include(Object.keys(SOURCES), "workspace/style/BindingPopover.tsx");
        assert.include(Object.keys(SOURCES), "workspace/style/Groups.tsx");
    });

    it("gives every kind of property the property row varies a per-value field", () => {
        const missing = drawn.filter((d) => takesBinding(d) && valueFieldKind(d) === null).map((d) => d.channel);
        assert.deepEqual(missing, [], "the shared per-value field draws a control for each");
    });

    it("draws every per-value and per-group control through the shared field", () => {
        for (const [control, { file, draws }] of Object.entries(PER_VALUE_CONTROLS)) {
            assert.include(SOURCES[file] ?? "", draws, `${control} (${file}) draws ${draws}`);
        }
    });

    it("names every color branch with its reason, so a new color-only one is caught", () => {
        const found = Object.fromEntries(
            Object.entries(SOURCES).flatMap(([file, text]) => {
                const count = text.match(COLOR_BRANCH)?.length ?? 0;
                return count === 0 ? [] : [[file, count]];
            }),
        );
        const recorded = Object.fromEntries(Object.entries(COLOR_BRANCHES).map(([file, { count }]) => [file, count]));
        assert.deepEqual(found, recorded, "add the other kinds, or a reason in coverage.ts COLOR_BRANCHES");
    });

    it("catches a file that branches on color alone", () => {
        const text = 'if (descriptor.accepts === "color") { chit = <Chit />; }';
        assert.lengthOf(text.match(COLOR_BRANCH) ?? [], 1);
    });
});
