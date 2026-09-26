/**
 * Sample tools, rail destinations, shortcuts and actions for the editor shell stories. The
 * glyphs are lucide's (no JSX here, so the file lints as a plain .ts module), drawn at 18px with a 1px stroke to sit in the 24px icon box the way
 * Figma's do; an app brings its own.
 */
import {
    AlignCenterVertical,
    AlignEndVertical,
    AlignStartVertical,
    ArrowUpRight,
    Briefcase,
    Circle,
    File,
    Hand,
    Hash,
    Image,
    ImagePlus,
    ImageUp,
    LayoutGrid,
    MessageCircle,
    MousePointer2,
    PenTool,
    Puzzle,
    Ruler,
    ScanFace,
    ScanSearch,
    Slash,
    Square,
    SquareDashed,
    Star,
    TextCursorInput,
    Triangle,
    Type,
    Variable,
    WandSparkles,
} from "lucide-react";
import { createElement, type ReactElement } from "react";

import type { QuickAction, ShortcutSheetTab, ToolItem } from "../../../src";

const glyph = (Icon: typeof Square): ReactElement => createElement(Icon, { size: 18, strokeWidth: 1 });

export const moveTools: ToolItem[] = [
    { value: "move", label: "Move", icon: glyph(MousePointer2), shortcut: "V" },
    { value: "hand", label: "Hand tool", icon: glyph(Hand), shortcut: "H" },
];
export const frameTools: ToolItem[] = [
    { value: "frame", label: "Frame", icon: glyph(Hash), shortcut: "F" },
    { value: "section", label: "Section", icon: glyph(SquareDashed), shortcut: "Shift+S" },
];
export const shapeTools: ToolItem[] = [
    { value: "rectangle", label: "Rectangle", icon: glyph(Square), shortcut: "R" },
    { value: "line", label: "Line", icon: glyph(Slash), shortcut: "L" },
    { value: "arrow", label: "Arrow", icon: glyph(ArrowUpRight), shortcut: "Shift+L" },
    { value: "ellipse", label: "Ellipse", icon: glyph(Circle), shortcut: "O" },
    { value: "polygon", label: "Polygon", icon: glyph(Triangle) },
    { value: "star", label: "Star", icon: glyph(Star) },
    { value: "image", label: "Image/video...", icon: glyph(Image), shortcut: "Ctrl+Shift+K" },
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
    file: glyph(File),
    toolbox: glyph(Briefcase),
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

/**
 * The palette's rows, laid out like Figma's capture (popovers-and-menus/quick-actions-open,
 * dark-theme/light-dialog-quick-actions-results): recents (one with no glyph), sections, rows with
 * shortcut hints, and disabled rows (nothing selected to align).
 */
export const actions: QuickAction[] = [
    { value: "a11y", label: "Accessibility settings...", section: "Recents" },
    { value: "nudge", label: "Nudge amount...", section: "Recents", icon: glyph(Ruler) },
    { value: "wireframe", label: "Ink Wireframe", section: "Recents", icon: glyph(LayoutGrid) },
    { value: "make-image", label: "Make an image", section: "Image editing", icon: glyph(ImagePlus) },
    { value: "remove-bg", label: "Remove background", section: "Image editing", icon: glyph(ScanFace) },
    { value: "boost", label: "Boost resolution", section: "Image editing", icon: glyph(ImageUp) },
    { value: "edit-image", label: "Edit image with prompt", section: "Image editing", icon: glyph(WandSparkles) },
    { value: "rename", label: "Rename layers...", section: "Design tools", icon: glyph(TextCursorInput), shortcut: "Ctrl+R" },
    { value: "align-left", label: "Align left", section: "Design tools", icon: glyph(AlignStartVertical), shortcut: "Alt+A", disabled: true },
    {
        value: "align-center",
        label: "Align horizontal centers",
        section: "Design tools",
        icon: glyph(AlignCenterVertical),
        shortcut: "Alt+H",
        disabled: true,
    },
    { value: "align-right", label: "Align right", section: "Design tools", icon: glyph(AlignEndVertical), shortcut: "Alt+D", disabled: true },
    { value: "frame", label: "Frame", section: "Design tools", icon: glyph(Hash), shortcut: "F" },
    { value: "text", label: "Text", section: "Design tools", icon: glyph(Type), shortcut: "T" },
    { value: "plugins", label: "Browse plugins", section: "Plugins & widgets", icon: glyph(Puzzle) },
];

/** The trailing action of the palette's search (Figma's visual search): a lucide glyph. */
export const visualSearchIcon = glyph(ScanSearch);
