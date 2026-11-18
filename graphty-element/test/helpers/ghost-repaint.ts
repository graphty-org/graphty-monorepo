/**
 * @file Nodes on a NullEngine scene, and the repaint a filter or a time window gives them: the
 * same style at another fill opacity, asked about and drawn the way `UpdateManager.paintNodes`
 * does it. Shared by node-ghost-repaint.test.ts (counted work) and its benchmark.
 */
import { NullEngine, Scene } from "@babylonjs/core";
import { cloneDeep } from "lodash";

import { SimpleLayoutEngine } from "../../src/layout/LayoutEngine";
import { DataManager, dataManagerInternals } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext } from "../../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { bootstrapNodePaint, type NodePaint } from "../../src/managers/StylePainter";
import { MeshCache } from "../../src/meshes/MeshCache";
import { collectResizedNodes, Node, nodeRebuildsFor } from "../../src/Node";
import { Styles } from "../../src/Styles";

class StillLayout extends SimpleLayoutEngine {
    static override type = "still-ghost-repaint";
    override scalingFactor = 1;

    doLayout(): void {
        this.stale = false;
    }
}

/** Nodes drawn in the plain style, and how to let go of their scene. */
export interface GhostNodes {
    nodes: Node[];
    dispose(): void;
}

/**
 * A fresh paint, as `StylePainter` builds one per node: the plain style at a fill opacity.
 * @param opacity - The fill's opacity, or undefined for none.
 * @returns The paint.
 */
export function paintAt(opacity: number | undefined): NodePaint {
    const base = bootstrapNodePaint();
    const style = cloneDeep(base.style);
    if (opacity !== undefined) {
        style.texture = { ...style.texture, color: { colorType: "solid", value: "#808080", opacity } };
    }

    return { meshKey: opacity === undefined ? "s0" : `s0o${String(opacity)}`, style, color: base.color };
}

/**
 * Build nodes drawn in the plain style.
 * @param count - How many.
 * @returns The nodes.
 */
export function ghostNodes(count: number): GhostNodes {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const styles = Styles.default();
    const eventManager = new EventManager();
    const dataManager = new DataManager(eventManager, styles);
    const layoutManager = new LayoutManager(eventManager, dataManager, styles);
    const layout = new StillLayout();
    layoutManagerInternals.setEngine(layoutManager, layout);
    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        layoutManager,
        new MeshCache(),
        scene,
        new StatsManager(eventManager),
        {},
    );
    const nodes: Node[] = [];
    for (let at = 0; at < count; at++) {
        const id = `n${String(at)}`;
        const node = new Node(context, id, bootstrapNodePaint(), { id });
        dataManagerInternals.adoptNode(dataManager, node);
        dataManager.nodeCache.set(id, node);
        layout.addNode(node);
        node.update();
        node.applySessionPaint(paintAt(undefined));
        nodes.push(node);
    }

    return {
        nodes,
        dispose(): void {
            scene.dispose();
            engine.dispose();
        },
    };
}

/**
 * Repaint every node, as `UpdateManager.paintNodes` does: ask each whether its mesh is rebuilt,
 * then draw them all.
 * @param nodes - The nodes.
 * @param opacity - The fill opacity of the new paint, or undefined for none.
 * @returns How many meshes the paint said it rebuilds.
 */
export function repaint(nodes: readonly Node[], opacity: number | undefined): number {
    const paints = nodes.map(() => paintAt(opacity));
    let rebuilt = 0;
    nodes.forEach((node, at) => {
        rebuilt += nodeRebuildsFor(node, paints[at]) ? 1 : 0;
    });
    collectResizedNodes(() => {
        nodes.forEach((node, at) => {
            node.applySessionPaint(paints[at]);
        });
    });
    return rebuilt;
}
