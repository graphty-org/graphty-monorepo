// The named presets (design section 4.2, plan section 5). Pairs differ in one technique, so a
// difference the owner feels belongs to that technique. The landing page also links every technique
// alone (`preset=empty&on=<id>`).

import type { Preset } from "./core/url";

const BASELINE = ["hover-tag", "node-menus", "wrist-menu", "visible-undo"];

export const PRESETS: readonly Preset[] = [
    {
        id: "empty",
        name: "Empty",
        graph: "florentine",
        techniques: [],
        question: "Switch techniques on in the headset",
    },
    {
        id: "baseline",
        name: "Baseline",
        graph: "florentine",
        techniques: BASELINE,
        settings: { "node-menus.style": "list" },
        question: "The control every other preset is compared with",
    },
    {
        id: "baseline-pull",
        name: "Baseline + pull to grow",
        graph: "florentine",
        techniques: [...BASELINE, "pull-to-grow"],
        question: "Getting a neighborhood: pull against the menu",
    },
    {
        id: "baseline-palette",
        name: "Baseline + palette",
        graph: "florentine",
        techniques: [...BASELINE, "palette"],
        question: "Color by: palette against the menus",
    },
    {
        id: "baseline-figma",
        name: "Baseline + Figma menus",
        graph: "florentine",
        techniques: [...BASELINE, "figma-menus"],
        question: "Color by: desktop-style panels against the menus",
    },
    {
        id: "baseline-voice",
        name: "Baseline + voice",
        graph: "florentine",
        techniques: [...BASELINE, "voice"],
        question: "Neighborhood and color by: voice against the menus",
    },
    {
        id: "hands-first",
        name: "Hands first",
        graph: "florentine",
        techniques: ["gestures", "pull-to-grow", "handling", "hover-tag", "wrist-menu", "visible-undo"],
        settings: { "handling.twoHand": "ours" },
        question: "Bare hands, few panels",
    },
    {
        id: "palette",
        name: "Palette",
        graph: "florentine",
        techniques: ["palette", "physical-tools", "hover-tag", "handling", "visible-undo"],
        question: "A Tilt Brush-style off-hand palette",
    },
    {
        id: "figma",
        name: "Figma",
        graph: "florentine",
        techniques: ["figma-menus", "node-menus", "hover-tag", "text-entry", "visible-undo"],
        question: "Desktop-style panels in space; keyboard against dictation",
    },
    {
        id: "voice",
        name: "Voice",
        graph: "florentine",
        techniques: ["voice", "text-entry", "hover-tag", "wrist-menu", "visible-undo"],
        question: "Speech with the chip sentence",
    },
    {
        id: "dense",
        name: "Dense",
        graph: "dense",
        techniques: ["dense-picking", "handling", "hover-tag", "node-menus", "visible-undo"],
        question: "Picking in a crowded graph, both aids",
    },
    {
        id: "dense-hints",
        name: "Dense, hint tags only",
        graph: "dense",
        techniques: ["dense-picking", "handling", "hover-tag", "node-menus", "visible-undo"],
        settings: { "dense-picking.slab": false },
        question: "Picking with hint tags alone",
    },
    {
        id: "dense-slab",
        name: "Dense, slab only",
        graph: "dense",
        techniques: ["dense-picking", "handling", "hover-tag", "node-menus", "visible-undo"],
        settings: { "dense-picking.hints": false },
        question: "Picking with the slab alone",
    },
    {
        id: "example",
        name: "Example module",
        graph: "florentine",
        techniques: ["example", ...BASELINE],
        question: "The example module: A cycles color by, undo names the step",
    },
    {
        id: "everything",
        name: "Everything",
        graph: "florentine",
        techniques: [
            "physical-tools",
            "dense-picking",
            "voice",
            "palette",
            "pull-to-grow",
            "node-menus",
            "handling",
            "gestures",
            "example",
            "hover-tag",
            "wrist-menu",
            "figma-menus",
            "visible-undo",
            "text-entry",
        ],
        question: "The arbitration stress test",
    },
];
