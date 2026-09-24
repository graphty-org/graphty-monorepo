import { assert, describe, it, vi } from "vitest";

import type { AdHocData } from "../../src/config";
import { EventManager } from "../../src/managers/EventManager";
import { SelectionManager } from "../../src/managers/SelectionManager";
import type { Node, NodeIdType } from "../../src/Node";

/**
 * The smallest thing that behaves like a selected node for these two getters.
 * @param id - The node id.
 * @returns A stand-in node.
 */
function nodeCalled(id: string): Node {
    let selected = false;

    return {
        id,
        data: {} as AdHocData,
        algorithmResults: {} as AdHocData,
        updateStyle: vi.fn(),
        isSelected: () => selected,
        setSelected: (next: boolean) => {
            selected = next;
        },
    } as unknown as Node;
}

/**
 * The smallest thing that answers like a bound session selection.
 * @param ids - The node ids the session reports as selected.
 * @returns Something carrying the two members these getters read.
 */
function sessionSelecting(ids: readonly NodeIdType[]): { nodes: readonly NodeIdType[]; has: (id: NodeIdType) => boolean } {
    return { nodes: ids, has: (id: NodeIdType) => ids.includes(id) };
}

// This lives here rather than beside the manager's other tests because those run only in the
// browser project, and nothing below needs a renderer.
describe("the selection manager agrees with the session's selection", () => {
    // A caller can change the selection without coming through this manager: Graph.select() goes
    // straight to the session. While these getters answered from the manager's own map instead,
    // the two disagreed -- after select({ nodes: [1] }) the highlight drew and
    // Graph.isNodeSelected(1) was true, while getSelectedNode() returned null.
    it("reports what the session selected, even when this manager never wrote it", () => {
        const manager = new SelectionManager(new EventManager());
        const node = nodeCalled("from-the-session");
        manager.setDataManager({ getNode: (id: NodeIdType) => (id === node.id ? node : undefined) } as never);
        manager.bindSelection(sessionSelecting([node.id]) as never);

        assert.strictEqual(manager.getSelectedNode(), node);
        assert.isTrue(manager.isSelected(node));
    });

    it("reports nothing selected when the session says so", () => {
        const manager = new SelectionManager(new EventManager());
        const node = nodeCalled("cleared-elsewhere");
        manager.bindSelection(sessionSelecting([]) as never);

        assert.isNull(manager.getSelectedNode());
        assert.isFalse(manager.isSelected(node));
    });

    it("falls back to its own index when no session selection is bound", () => {
        const manager = new SelectionManager(new EventManager());
        const node = nodeCalled("view-only");
        manager.select(node);

        assert.strictEqual(manager.getSelectedNode(), node);
        assert.isTrue(manager.isSelected(node));
    });
});
