import { describe, expect, it } from "vitest";

import {
    computeDrop,
    flattenTree,
    iconOffset,
    moveTreeItem,
    renameTreeItem,
    rowTints,
    type TreeNodeData,
} from "../../../src/components/tree/treeModel";

// frame
//   rect
//   group
//     text
//     vector
// other
// leaf
const ITEMS: TreeNodeData[] = [
    {
        id: "frame",
        name: "Frame",
        children: [
            { id: "rect", name: "Rect" },
            {
                id: "group",
                name: "Group",
                children: [
                    { id: "text", name: "Text" },
                    { id: "vector", name: "Vector" },
                ],
            },
        ],
    },
    { id: "other", name: "Other", children: [] },
    { id: "leaf", name: "Leaf" },
];

const ids = (rows: ReturnType<typeof flattenTree>): string[] => rows.map((r) => r.node.id);

describe("flattenTree", () => {
    it("shows only the rows whose ancestors are all open", () => {
        expect(ids(flattenTree(ITEMS, new Set()))).toEqual(["frame", "other", "leaf"]);
        expect(ids(flattenTree(ITEMS, new Set(["frame"])))).toEqual(["frame", "rect", "group", "other", "leaf"]);
        expect(ids(flattenTree(ITEMS, new Set(["group"])))).toEqual(["frame", "other", "leaf"]);
    });

    it("gives every row its level, parent and position among its siblings", () => {
        const rows = flattenTree(ITEMS, new Set(["frame", "group"]));
        const text = rows.find((r) => r.node.id === "text");
        expect(text).toMatchObject({ level: 3, parentId: "group", posInSet: 1, setSize: 2 });
        expect(rows[0]).toMatchObject({ level: 1, parentId: null, posInSet: 1, setSize: 3, hasChildren: true });
    });

    it("treats an empty children array as a container with nothing to open", () => {
        const other = flattenTree(ITEMS, new Set(["other"])).find((r) => r.node.id === "other");
        expect(other).toMatchObject({ hasChildren: false, expanded: false });
    });
});

describe("rowTints", () => {
    const open = new Set(["frame", "group"]);
    const rows = flattenTree(ITEMS, open);
    const tintOf = (selected: string[]): Record<string, string> => {
        const tints = rowTints(rows, new Set(selected));
        return Object.fromEntries(rows.map((r, i) => [r.node.id, tints[i]]));
    };

    it("draws a lone selected row as one pill", () => {
        expect(tintOf(["leaf"]).leaf).toBe("selected");
    });

    it("merges adjacent selected rows into one block", () => {
        const t = tintOf(["text", "vector", "other"]);
        expect([t.text, t.vector, t.other]).toEqual(["first", "middle", "last"]);
    });

    it("gives a selected, open parent the pill with a band below, and bands its descendants", () => {
        const t = tintOf(["frame"]);
        expect(t.frame).toBe("parent");
        expect([t.rect, t.group, t.text]).toEqual(["child", "child", "child"]);
        expect(t.vector).toBe("child-last");
        expect(t.other).toBe("none");
    });

    it("ends the band at the last row of the selected subtree, however deep", () => {
        const t = tintOf(["group"]);
        expect(t.group).toBe("parent");
        expect(t.text).toBe("child");
        expect(t.vector).toBe("child-last");
        expect(t.frame).toBe("none");
    });

    it("draws a selected but closed parent as a plain pill", () => {
        const closed = flattenTree(ITEMS, new Set());
        expect(rowTints(closed, new Set(["frame"]))[0]).toBe("selected");
    });
});

describe("computeDrop", () => {
    const rows = flattenTree(ITEMS, new Set(["frame", "group"]));
    const at = (id: string): number => rows.findIndex((r) => r.node.id === id);

    it("drops before a row from its top quarter, with a line at that row's depth", () => {
        const drop = computeDrop(rows, "leaf", at("rect"), 0.1);
        expect(drop?.move).toEqual({ id: "leaf", parentId: "frame", index: 0 });
        expect(drop?.line).toEqual({ boundary: at("rect"), level: 2 });
        expect(drop?.boxRow).toBe(at("frame"));
    });

    it("drops into a container from its middle half, drawn as a box and no line", () => {
        const drop = computeDrop(rows, "leaf", at("other"), 0.5);
        expect(drop?.move).toEqual({ id: "leaf", parentId: "other", index: 0 });
        expect(drop).toMatchObject({ boxRow: at("other"), line: null });
    });

    it("drops beside a leaf from its middle half, on the nearer side", () => {
        expect(computeDrop(rows, "other", at("text"), 0.4)?.move).toEqual({ id: "other", parentId: "group", index: 0 });
        expect(computeDrop(rows, "other", at("text"), 0.6)?.move).toEqual({ id: "other", parentId: "group", index: 1 });
    });

    it("makes the bottom quarter of an open parent its first child", () => {
        const drop = computeDrop(rows, "leaf", at("group"), 0.9);
        expect(drop?.move).toEqual({ id: "leaf", parentId: "group", index: 0 });
        expect(drop?.line).toEqual({ boundary: at("group") + 1, level: 3 });
    });

    it("puts the line after a closed row's whole subtree", () => {
        const closed = flattenTree(ITEMS, new Set());
        const drop = computeDrop(closed, "leaf", 0, 0.9);
        expect(drop?.move).toEqual({ id: "leaf", parentId: null, index: 1 });
        expect(drop?.line).toEqual({ boundary: 1, level: 1 });
    });

    it("counts the new index with the moved item already taken out", () => {
        // Moving "frame" (index 0) to after "other" (index 1) lands at index 1 once frame is removed.
        const closed = flattenTree(ITEMS, new Set());
        expect(computeDrop(closed, "frame", 1, 0.9)?.move).toEqual({ id: "frame", parentId: null, index: 1 });
    });

    it("refuses a drop into the item's own subtree, and a drop back where it is", () => {
        expect(computeDrop(rows, "frame", at("text"), 0.1)).toBeNull();
        expect(computeDrop(rows, "group", at("group"), 0.5)).toBeNull();
        expect(computeDrop(rows, "rect", at("rect"), 0.1)).toBeNull();
    });
});

describe("iconOffset", () => {
    it("puts the top-level glyph at 16 and indents 24 per level (Figma x 73, 97, 121 in a panel at 57)", () => {
        expect([1, 2, 3].map(iconOffset)).toEqual([16, 40, 64]);
    });
});

describe("moveTreeItem and renameTreeItem", () => {
    const shape = (items: readonly TreeNodeData[]): unknown[] =>
        items.map((n) => (n.children ? [n.id, shape(n.children)] : n.id));

    it("reorders at the top level, counting the index with the item removed", () => {
        expect(shape(moveTreeItem(ITEMS, { id: "leaf", parentId: null, index: 0 }))).toEqual([
            "leaf",
            ["frame", ["rect", ["group", ["text", "vector"]]]],
            ["other", []],
        ]);
    });

    it("moves an item into a nested parent and out of its old one", () => {
        expect(shape(moveTreeItem(ITEMS, { id: "text", parentId: "frame", index: 0 }))).toEqual([
            ["frame", ["text", "rect", ["group", ["vector"]]]],
            ["other", []],
            "leaf",
        ]);
    });

    it("moves into a parent that has no children array yet, and keeps other fields", () => {
        const flat = [
            { id: "a", name: "A", extra: 1 },
            { id: "b", name: "B", extra: 2 },
        ];
        expect(moveTreeItem(flat, { id: "a", parentId: "b", index: 0 })).toEqual([
            { id: "b", name: "B", extra: 2, children: [{ id: "a", name: "A", extra: 1 }] },
        ]);
    });

    it("returns the list unchanged for an unknown id", () => {
        expect(moveTreeItem(ITEMS, { id: "nope", parentId: null, index: 0 })).toEqual(ITEMS);
    });

    it("renames at any depth and leaves the input alone", () => {
        const renamed = renameTreeItem(ITEMS, "vector", "Arrow");
        expect(renamed[0].children?.[1].children?.[1].name).toBe("Arrow");
        expect(ITEMS[0].children?.[1].children?.[1].name).not.toBe("Arrow");
    });
});
