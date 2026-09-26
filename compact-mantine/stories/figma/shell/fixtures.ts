/**
 * Sample tools, rail destinations, shortcuts and actions for the editor shell stories. The
 * glyphs are lucide's (no JSX here, so the file lints as a plain .ts module), drawn at 18px with a 1px stroke to sit in the 24px icon box the way
 * Figma's do; an app brings its own.
 */
import { Hash, LayoutGrid, MessageCircle, MousePointer2, PenTool, Square, Type, Variable } from "lucide-react";
import { createElement, type ReactElement } from "react";

import type { QuickAction, ShortcutSheetTab, ToolItem } from "../../../src";

const glyph = (Icon: typeof Square): ReactElement => createElement(Icon, { size: 18, strokeWidth: 1 });

export const moveTools: ToolItem[] = [
    { value: "move", label: "Move", icon: glyph(MousePointer2), shortcut: "V" },
    { value: "hand", label: "Hand tool", icon: glyph(LayoutGrid), shortcut: "H" },
];
export const frameTools: ToolItem[] = [
    { value: "frame", label: "Frame", icon: glyph(Hash), shortcut: "F" },
    { value: "section", label: "Section", icon: glyph(LayoutGrid), shortcut: "Shift+S" },
];
export const shapeTools: ToolItem[] = [
    { value: "rectangle", label: "Rectangle", icon: glyph(Square), shortcut: "R" },
    { value: "line", label: "Line", icon: glyph(PenTool), shortcut: "L" },
    { value: "ellipse", label: "Ellipse", icon: glyph(MessageCircle), shortcut: "O" },
];
export const textTools: ToolItem[] = [{ value: "text", label: "Text", icon: glyph(Type), shortcut: "T" }];

export const icons = {
    move: glyph(MousePointer2),
    frame: glyph(Hash),
    rectangle: glyph(Square),
    pen: glyph(PenTool),
    text: glyph(Type),
    comment: glyph(MessageCircle),
    grid: glyph(LayoutGrid),
    variable: glyph(Variable),
};

export const sheetTabs: ShortcutSheetTab[] = [
    {
        value: "essential",
        label: "Essential",
        variant: "essential",
        caption: "Essential keyboard shortcuts",
        groups: [
            {
                shortcuts: [
                    {
                        label: "Show/Hide UI",
                        description: "Press it now to quickly hide the panes and focus on your work",
                        keys: ["Ctrl", "\\"],
                    },
                ],
            },
            {
                shortcuts: [{ label: "Pick color", description: "Grab a color from elsewhere without losing your flow", keys: ["I"] }],
            },
            {
                shortcuts: [
                    {
                        label: "Actions...",
                        description: "Search through menus, commands, and plugins",
                        keys: ["Ctrl", "K"],
                        highlighted: true,
                    },
                ],
            },
        ],
    },
    {
        value: "tools",
        label: "Tools",
        groups: [
            {
                shortcuts: [
                    { label: "Move tool", keys: ["V"], icon: glyph(MousePointer2) },
                    { label: "Frame tool", keys: ["F"], icon: glyph(Hash) },
                    { label: "Pen tool", keys: ["P"], icon: glyph(PenTool) },
                    { label: "Pencil tool", keys: ["Shift", "P"], icon: glyph(PenTool) },
                ],
            },
            {
                shortcuts: [
                    { label: "Text tool", keys: ["T"], icon: glyph(Type) },
                    { label: "Rectangle tool", keys: ["R"], icon: glyph(Square) },
                    { label: "Arrow tool", keys: ["Shift", "L"], icon: glyph(PenTool) },
                ],
            },
            {
                shortcuts: [
                    { label: "View comments", keys: ["C"], icon: glyph(MessageCircle) },
                    { label: "Slice tool", keys: ["S"], icon: glyph(LayoutGrid) },
                ],
            },
        ],
    },
    { value: "view", label: "View", groups: [{ shortcuts: [{ label: "Pixel grid", keys: ["Shift", "'"] }] }] },
    { value: "zoom", label: "Zoom", groups: [{ shortcuts: [{ label: "Zoom to fit", keys: ["Shift", "1"] }] }] },
];

export const actions: QuickAction[] = [
    { value: "wireframe", label: "Ink Wireframe", section: "Recents", icon: glyph(LayoutGrid) },
    { value: "make-image", label: "Make an image", section: "Image editing", icon: glyph(Square) },
    { value: "remove-bg", label: "Remove background", section: "Image editing", icon: glyph(Square) },
    { value: "boost", label: "Boost resolution", section: "Image editing", icon: glyph(Square), disabled: true },
    { value: "frame", label: "Frame", section: "Design tools", icon: glyph(Hash), shortcut: "F" },
    { value: "text", label: "Text", section: "Design tools", icon: glyph(Type), shortcut: "T" },
    { value: "pen", label: "Pen", section: "Design tools", icon: glyph(PenTool), shortcut: "P" },
];
