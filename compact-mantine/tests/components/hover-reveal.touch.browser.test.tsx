/**
 * Every control compact-mantine reveals on hover is drawn at rest on a touch screen (`hover: none`),
 * which has no hover to reveal it (figma-spec.md 9.6), and stays hidden at rest under a mouse.
 *
 * Runs twice: in the "browser" project (a mouse) and in the "touch" project (a touch screen).
 */
import { MantineProvider, Menu } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActionRow, compactTheme, DataTable, Tree, VariablePill } from "../../src";

interface Row {
    id: string;
}

/** A DataTable, a hover-revealed ActionRow, a tree with row actions and children, and two bound variables. */
function renderAll(): void {
    render(
        <MantineProvider theme={compactTheme}>
            <div style={{ width: 240 }}>
                <DataTable<Row>
                    columns={[{ id: "id", header: "Node", value: (row) => row.id, menu: <Menu.Item>Hide</Menu.Item> }]}
                    data={[{ id: "a" }]}
                    getRowId={(row) => row.id}
                    label="Nodes"
                />
                <ActionRow reveal="hover" actions={<button type="button">Rerun</button>} state="20 nodes" />
                <Tree
                    items={[
                        {
                            id: "frame",
                            name: "Frame",
                            children: [{ id: "child", name: "Child" }],
                            actions: <button type="button" aria-label="Hide" style={{ width: 24, height: 24 }} />,
                        },
                    ]}
                />
                <VariablePill name="radius-sm" value="4" onDetach={() => undefined} detachLabel="Detach field" />
                <VariablePill name="brand" swatch="#0d99ff" onDetach={() => undefined} detachLabel="Detach fill" />
            </div>
        </MantineProvider>,
    );
}

/**
 * Whether each hover-revealed control is drawn, read from the browser's computed style.
 * @returns name to drawn
 */
function drawn(): Record<string, boolean> {
    const shown = (el: Element): boolean => {
        const style = getComputedStyle(el);
        return style.opacity === "1" && style.visibility === "visible" && el.getBoundingClientRect().width > 0;
    };
    return {
        columnMenu: shown(screen.getByTestId("data-table-header-menu")),
        actionRow: shown(screen.getByRole("button", { name: "Rerun" }).parentElement as Element),
        treeAction: shown(screen.getByRole("button", { name: "Hide" })),
        treeCaret: shown(screen.getAllByTestId("tree-caret")[0]),
        detachField: shown(screen.getByRole("button", { name: "Detach field" })),
        detachFill: shown(screen.getByRole("button", { name: "Detach fill" })),
    };
}

describe("hover-revealed controls at rest (browser)", () => {
    it("are drawn on a touch screen and hidden under a mouse", async ({ task }) => {
        const touch = (task.file.projectName ?? "").startsWith("touch");
        // The project really is what it says: a touch screen cannot hover, a mouse can.
        expect(matchMedia("(hover: none)").matches).toBe(touch);
        expect(matchMedia("(pointer: coarse)").matches).toBe(touch);
        renderAll();
        await waitFor(() => {
            expect(drawn()).toEqual({
                columnMenu: touch,
                actionRow: touch,
                treeAction: touch,
                treeCaret: touch,
                detachField: touch,
                detachFill: touch,
            });
        });
    });
});
