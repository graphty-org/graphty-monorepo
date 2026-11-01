import { Box, Button, Group, Menu, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";

import { DataTable, type DataTableColumn } from "../../../src";

/**
 * TRY-OUT ONLY (branch try/safe-triangle-demo, never merged): the same menu twice, so the
 * difference a submenu "safe triangle" makes can be felt before deciding whether to adopt it.
 *
 * - **Today**: compact-mantine's behavior. The submenu stays open across the 4px gap to it, and
 *   closes as soon as the pointer reaches another row of the parent menu.
 * - **With safe triangle**: the submenu also stays open while the pointer moves diagonally across
 *   other parent rows TOWARD it (macOS, Floating UI's `safePolygon`). A move away from it, or
 *   resting on a row for 400 ms, closes it as today.
 *
 * Try it: open a menu, hover "Type", then move straight to "Date" or "Category" in the submenu.
 */
const meta: Meta = {
    title: "Components/Overlays/Submenu safe triangle (try-out)",
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** How long the pointer may rest on another parent row before the submenu closes anyway. */
const REST_CLOSE_MS = 400;
const OPEN_SUBMENU_ROW = '[data-sub-menu-item][aria-expanded="true"]';

interface Point {
    x: number;
    y: number;
}

let last: Point | null = null;
let beforeLast: Point | null = null;
/** The parent row the pointer is on while the submenu is kept open for it, and that submenu's row. */
let pending: { row: Element; item: Element } | null = null;
let restTimer = 0;
let releasing = false;

/**
 * The open submenu row in the same safe-triangle menu as `element`, with its submenu.
 * @param element - a row or anything in a parent menu
 * @returns the open submenu row and its submenu, or null
 */
function openSubmenuOf(element: Element): { item: Element; submenu: Element } | null {
    const menu = element.closest("[data-safe-triangle]");
    const item = menu?.querySelector(OPEN_SUBMENU_ROW);
    const submenu = item ? document.getElementById(item.getAttribute("aria-controls") ?? "") : null;
    return item && submenu ? { item, submenu } : null;
}

/**
 * Whether `p` lies in the triangle from the pointer's previous position to the submenu's near edge.
 * @param p - where the pointer is now
 * @param submenu - the open submenu
 * @returns true when the pointer is heading for the submenu
 */
function headingFor(p: Point, submenu: Element): boolean {
    const from = last && (last.x !== p.x || last.y !== p.y) ? last : beforeLast;
    if (!from) {
        return false;
    }
    const r = submenu.getBoundingClientRect();
    const edgeX = r.left >= from.x ? r.left : r.right;
    const a = from;
    const b = { x: edgeX, y: r.top };
    const c = { x: edgeX, y: r.bottom };
    const cross = (o: Point, u: Point, v: Point): number => (u.x - o.x) * (v.y - o.y) - (u.y - o.y) * (v.x - o.x);
    const d1 = cross(a, b, p);
    const d2 = cross(b, c, p);
    const d3 = cross(c, a, p);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
}

/** Let the held-back move through: Mantine and compact-mantine close the submenu as they do today. */
function release(): void {
    window.clearTimeout(restTimer);
    if (!pending) {
        return;
    }
    const { row, item } = pending;
    pending = null;
    releasing = true;
    item.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: row }));
    row.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: item }));
    releasing = false;
}

/**
 * A move onto another parent row while heading for the open submenu is held back from every other
 * listener (window capture runs first), so nothing closes the submenu or highlights that row.
 * @param event - a mouseover or mouseout anywhere
 */
function holdForTriangle(event: MouseEvent): void {
    if (releasing) {
        return;
    }
    const to = event.type === "mouseover" ? event.target : event.relatedTarget;
    const row = to instanceof Element ? to.closest("[data-menu-item]") : null;
    const open = row ? openSubmenuOf(row) : null;
    if (!row || !open || row === open.item || open.submenu.contains(row)) {
        if (event.type === "mouseover") {
            pending = null;
            window.clearTimeout(restTimer);
        }
        return;
    }
    if (headingFor({ x: event.clientX, y: event.clientY }, open.submenu)) {
        event.stopPropagation();
        pending = { row, item: open.item };
        window.clearTimeout(restTimer);
        restTimer = window.setTimeout(release, REST_CLOSE_MS);
    } else if (pending) {
        pending = null;
    }
}

/**
 * Track the pointer, and close the kept-open submenu when the pointer turns away from it while
 * still on a parent row (no boundary event fires for that).
 * @param event - a pointermove anywhere
 */
function trackPointer(event: PointerEvent): void {
    const p = { x: event.clientX, y: event.clientY };
    if (pending) {
        const open = openSubmenuOf(pending.row);
        if (!open || !headingFor(p, open.submenu)) {
            release();
        } else {
            window.clearTimeout(restTimer);
            restTimer = window.setTimeout(release, REST_CLOSE_MS);
        }
    }
    if (!last || last.x !== p.x || last.y !== p.y) {
        beforeLast = last;
        last = p;
    }
}

/** Install the safe triangle for menus whose dropdown carries `data-safe-triangle`, while mounted. */
function useSafeTriangle(): void {
    useEffect(() => {
        window.addEventListener("mouseover", holdForTriangle, true);
        window.addEventListener("mouseout", holdForTriangle, true);
        window.addEventListener("pointermove", trackPointer, true);
        return () => {
            window.removeEventListener("mouseover", holdForTriangle, true);
            window.removeEventListener("mouseout", holdForTriangle, true);
            window.removeEventListener("pointermove", trackPointer, true);
            window.clearTimeout(restTimer);
        };
    }, []);
}

const TYPES = ["Text", "Number", "Integer", "Boolean", "Date", "Color", "Category", "ID"];

/** The header menu's rows: "Type" near the top opens a long submenu. */
function Rows(): React.JSX.Element {
    return (
        <>
            <Menu.Item>Rename</Menu.Item>
            <Menu.Sub>
                <Menu.Sub.Target>
                    <Menu.Sub.Item>Type</Menu.Sub.Item>
                </Menu.Sub.Target>
                <Menu.Sub.Dropdown>
                    {TYPES.map((type) => (
                        <Menu.Item key={type}>{type}</Menu.Item>
                    ))}
                </Menu.Sub.Dropdown>
            </Menu.Sub>
            <Menu.Item>Sort ascending</Menu.Item>
            <Menu.Item>Sort descending</Menu.Item>
            <Menu.Item>Filter...</Menu.Item>
            <Menu.Item>Pin column</Menu.Item>
            <Menu.Item>Hide column</Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red">Delete column</Menu.Item>
        </>
    );
}

/**
 * One labeled menu.
 * @param props - the label and whether it gets the safe triangle
 * @param props.label - the caption over the button
 * @param props.safe - true for the safe-triangle variant
 * @returns the captioned menu
 */
function DemoMenu({ label, safe }: { label: string; safe: boolean }): React.JSX.Element {
    return (
        <Stack gap={8} align="flex-start" style={{ width: 320 }}>
            <Text fw={600}>{label}</Text>
            <Menu position="bottom-start">
                <Menu.Target>
                    <Button data-testid={safe ? "open-safe" : "open-today"}>Column ...</Button>
                </Menu.Target>
                <Menu.Dropdown data-safe-triangle={safe ? "" : undefined}>
                    <Rows />
                </Menu.Dropdown>
            </Menu>
        </Stack>
    );
}

interface Row {
    id: string;
    label: string;
    type: string;
}

const DATA: Row[] = TYPES.map((type, index) => ({ id: String(index), label: `node ${index}`, type }));

/**
 * The two menus side by side, and the same menu (today's behavior) in a data table header.
 */
export const SideBySide: Story = {
    render: function SideBySideRender() {
        useSafeTriangle();
        const columns: DataTableColumn<Row>[] = [
            { id: "label", header: "Node", value: (row) => row.label, width: 140, menu: <Rows /> },
            { id: "type", header: "Kind", value: (row) => row.type, width: 140 },
        ];
        return (
            <Stack gap={32}>
                {/* The menus come first: each needs about 250px of canvas under its button. Under
                    the instructions, a canvas shortened by Storybook's addon panel flipped them
                    above their buttons, capped and scrolling, and the pointer crossing the scroll
                    chevron slid "Type" out from under it, so no submenu opened. */}
                <Group gap={160} align="flex-start" wrap="nowrap">
                    <DemoMenu label="Today" safe={false} />
                    <DemoMenu label="With safe triangle" safe />
                </Group>
                <Text size="sm" c="dimmed" maw={720}>
                    Open a menu, hover &quot;Type&quot;, then move the pointer straight (diagonally, across the rows
                    below it) to &quot;Date&quot; or &quot;Category&quot; in the submenu. Today the submenu closes on
                    the first row crossed; with the safe triangle it stays open while you head toward it.
                </Text>
                <Stack gap={8}>
                    <Text fw={600}>Today, in a data table header (hover the Node header, click its caret)</Text>
                    <Box style={{ width: 320 }}>
                        <DataTable
                            columns={columns}
                            data={DATA}
                            getRowId={(row) => row.id}
                            label="Nodes"
                            height={200}
                        />
                    </Box>
                </Stack>
            </Stack>
        );
    },
};
