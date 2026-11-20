/* eslint-disable */
import "../../src/graphty-element";
import { describe, it, vi } from "vitest";
import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { NodeBatches } from "../../src/meshes/NodeBatch";
const SPAN = 5;
async function settle(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
    await element.graph.getSession().styles.settled();
    await element.waitForStableFrame();
}
async function mount(size: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.layout = "fixed";
    element.style.width = "400px"; element.style.height = "300px"; element.style.display = "block";
    document.body.appendChild(element);
    await element.waitForStableFrame();
    await element.session.config.set({ startingRows: true });
    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
    const turn = (2 * Math.PI) / size;
    await element.session.data.addNodes(ids.map((id, at) => ({ id, group: at % 3, position: { x: 50 * Math.cos(at * turn), y: 50 * Math.sin(at * turn), z: 0 } })));
    await element.session.data.addEdges(ids.flatMap((id, at) => Array.from({ length: SPAN }, (_, step) => ({ source: id, target: ids[(at + step + 1) % size] }))));
    await settle(element);
    return element;
}
const st = (from: number, to: number) => new Error().stack!.split("\n").slice(from, to).map((l) => l.trim().replace(/https?:\/\/[^/]+/, "").replace(/\?[^:)]*/, "").replace(/^at /, "")).join(" < ");
async function trace(name: string, element: Graphty, edit: () => Promise<unknown>) {
    const stacks = new Map<string, number>();
    let busy = false;
    const note = (k: string) => { if (busy) return; busy = true; set0.call(stacks, k, (stacks.get(k) ?? 0) + 1); busy = false; };
    const set0 = Map.prototype.set;
    const { set } = Map.prototype;
    Map.prototype.set = function (this: any, k: any, v: any) { if (!busy) note("MAP " + st(3, 9)); return set.call(this, k, v); };
    const eu = Edge.prototype.update;
    Edge.prototype.update = function (this: any, ...a: any[]) { note("EDGEUPD " + st(3, 12)); return (eu as any).apply(this, a); };
    const pr = NodeBatches.prototype.paintRow;
    NodeBatches.prototype.paintRow = function (this: any, ...a: any[]) { note("PAINTROW " + st(3, 10)); return (pr as any).apply(this, a); };
    const sp: any = element.graph.getStylePainter();
    const proto = Object.getPrototypeOf(sp.pendingNodes);
    const padd = proto.add;
    proto.add = function (this: any, ...a: any[]) { note((this === sp.pendingNodes ? "QN " : "QE ") + st(3, 12)); return padd.apply(this, a); };
    const dm: any = element.graph.getDataManager();
    const built = dm.edgeMap.built;
    dm.edgeMap.built = function (this: any) { note("BUILT " + st(3, 14)); return built.call(this); };
    try { await edit(); await settle(element); } finally {
        Map.prototype.set = set; Edge.prototype.update = eu; NodeBatches.prototype.paintRow = pr; dm.edgeMap.built = built; proto.add = padd;
    }
    for (const [k, n] of [...stacks].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`PROBE ${name} ${n} ${k}`);
}
describe("probe", () => {
    it("traces", async () => {
        const element = await mount(400);
        const { data } = element.session;
        const firstEdge = () => data.edgePage({ offset: 3, limit: 1 }).records[0].id;
        await data.updateNodes([{ id: "n0", values: { group: 1 } }]); await settle(element);
        await data.removeEdges([firstEdge()]); await settle(element);
        await data.updateNodes([{ id: "n7", values: { group: 9 } }]); await settle(element);
        await trace("undoUpdateNode", element, () => element.session.undo());
        return void document.body.replaceChildren();
        await trace("undoRemoveNode", element, () => element.session.undo());
        await trace("redoRemoveNode", element, () => element.session.redo());
        await trace("undoRemoveEdge", element, async () => { await data.removeEdges([firstEdge()]); await settle(element); await element.session.undo(); });
        document.body.replaceChildren();
    });
});
