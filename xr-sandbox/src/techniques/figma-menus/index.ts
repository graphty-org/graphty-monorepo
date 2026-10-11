// Figma-like menus (design section 9.4): a floating toolbar below the graph, a layer list to its
// left, an inspector to its right, and a context popover beside the selected node. It claims no
// input: every control is UI (rays and fingers reach it before any technique), and it changes the
// graph only through commands, so undo names each step. What it reuses and what it leaves to fix
// later is in README.md beside this file.

import { type AbstractMesh, type Mesh, MeshBuilder, type TransformNode, Vector3 } from "@babylonjs/core";
import type { AdvancedDynamicTexture } from "@babylonjs/gui";

import type { Technique, TechniqueContext } from "../../framework/technique";
import { createInspector, type Inspector } from "./inspector";
import { createLayerList, type LayerList } from "./layer-list";
import { createPopover, type Popover } from "./popover";
import { createToolbar, type Toolbar } from "./toolbar";

let ctx: TechniqueContext;
let toolbar: Toolbar;
let layers: LayerList;
let inspector: Inspector;
let popover: Popover;
let needPlace = true;
let recenterZone: TransformNode | null = null;
const zoneAt = new Vector3();
let stateKey = "";

/** Offsets from the head in its yaw frame, [right, up, forward] in meters, of each slate's top. */
const SPOTS = {
    toolbar: [0, -0.56, 0.66],
    layers: [-0.5, 0.1, 0.8],
    inspector: [0.5, 0.1, 0.8],
} as const;

const head = (): Vector3 => {
    const cam = ctx.xr()?.baseExperience.camera ?? ctx.scene.activeCamera;
    return cam ? cam.globalPosition.clone() : new Vector3(0, 1.6, 0);
};

/** Place the three panels around the head's current yaw, each facing the head. */
const place = (): void => {
    const cam = ctx.xr()?.baseExperience.camera ?? ctx.scene.activeCamera;
    const h = head();
    const fwd = cam ? cam.getDirection(Vector3.Forward()) : new Vector3(0, 0, 1);
    const yaw = Math.atan2(fwd.x, fwd.z);
    const f = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const r = new Vector3(f.z, 0, -f.x);
    const meshes: Record<keyof typeof SPOTS, Mesh> = {
        toolbar: toolbar.panel.mesh,
        layers: layers.slate.bar.mesh,
        inspector: inspector.slate.bar.mesh,
    };
    for (const [k, [x, y, z]] of Object.entries(SPOTS)) {
        const m = meshes[k as keyof typeof SPOTS];
        m.position.copyFrom(h).addInPlace(r.scale(x)).addInPlace(f.scale(z));
        m.position.y += y;
        m.rotationQuaternion = null;
        m.lookAt(m.position.scale(2).subtract(h));
        m.computeWorldMatrix(true);
    }
    ctx.log("place", { head: h.asArray().map((v) => Math.round(v * 100) / 100) });
};

/** Redraw what depends on the graph state, only when it changed. */
const refresh = (): void => {
    const s = ctx.state;
    const [first = -1] = s.selection;
    const key = [
        s.selection.size,
        first,
        s.colorBy,
        s.sizeBy,
        s.filter ? `${s.filter.result}${s.filter.op}${s.filter.value}` : "",
        s.hidden.size,
        s.notes.length,
        s.shown.size,
        toolbar.refresh(),
        ctx.settings.bool("popover"),
    ].join("|");
    if (key === stateKey) {
        return;
    }
    stateKey = key;
    layers.refresh();
    inspector.refresh();
    popover.setNode(ctx.settings.bool("popover") ? first : -1);
};

/**
 * The world-space corners of a mesh's bounds.
 * @param m - the mesh
 * @returns its name, whether it is enabled, and its world bounds
 */
const bounds = (m: AbstractMesh): { name: string; enabled: boolean; min: number[]; max: number[] } => {
    m.computeWorldMatrix(true);
    m.refreshBoundingInfo({});
    const b = m.getBoundingInfo().boundingBox;
    return { name: m.name, enabled: m.isEnabled(), min: b.minimumWorld.asArray(), max: b.maximumWorld.asArray() };
};

/**
 * Hooks for the dry run (`dryrun/checks/figma-menus.mjs`): read-only facts, plus a marker it can
 * aim the emulated input at, placed on any of this module's GUI controls.
 */
const installHooks = (): void => {
    const textures: [Mesh, AdvancedDynamicTexture][] = [
        toolbar.panel,
        layers.slate.bar,
        layers.slate.body,
        inspector.slate.bar,
        inspector.slate.body,
        popover.panel,
    ].map((p) => [p.mesh, p.adt]);
    let marker: Mesh | null = null;
    const api = {
        bounds: () => ({
            mine: {
                toolbar: [bounds(toolbar.panel.mesh)],
                layers: [bounds(layers.slate.bar.mesh), bounds(layers.slate.body.mesh)],
                inspector: [bounds(inspector.slate.bar.mesh), bounds(inspector.slate.body.mesh)],
            },
            framework: ["gear-button", "gear-panel", "steps-panel", "log-panel"]
                .map((n) => ctx.scene.getMeshByName(n))
                .filter((m): m is AbstractMesh => m !== null)
                .map(bounds),
        }),
        textureSizes: () => textures.map(([m, adt]) => ({ name: m.name, ...adt.getSize() })),
        rows: () => layers.rows(),
        inspector: () => inspector.lines(),
        popover: () => ({ visible: popover.panel.visible, verbs: popover.verbs() }),
        toolReason: (tool: string) => toolbar.reason(tool),
        inspectorBar: () => ({
            name: inspector.slate.bar.mesh.name,
            position: inspector.slate.bar.mesh.getAbsolutePosition().asArray(),
            right: inspector.slate.bar.mesh.getDirection(Vector3.Right()).asArray(),
        }),
        /**
         * Put the marker mesh on a GUI control's center, so `__sandbox.aim(hand, mesh)` aims at it.
         * @param control - the control's name
         * @returns the marker's mesh name and world position, or null when no such control shows
         */
        mark(control: string): { mesh: string; at: number[] } | null {
            for (const [m, adt] of textures) {
                const c = adt.getControlByName(control);
                if (!c || !m.isEnabled()) {
                    continue;
                }
                const { width, height } = adt.getSize();
                const ext = m.getBoundingInfo().boundingBox.extendSize;
                const local = new Vector3(
                    (c.centerX / width - 0.5) * ext.x * 2,
                    (0.5 - c.centerY / height) * ext.y * 2,
                    0,
                );
                marker ??= MeshBuilder.CreateBox("figma-menus-marker", { size: 0.002 }, ctx.scene);
                marker.isPickable = false;
                marker.setEnabled(false);
                marker.position.copyFrom(Vector3.TransformCoordinates(local, m.computeWorldMatrix(true)));
                return { mesh: marker.name, at: marker.position.asArray() };
            }
            return null;
        },
    };
    (globalThis as unknown as { __figmaMenus: typeof api }).__figmaMenus = api;
};

export const technique: Technique = {
    id: "figma-menus",
    name: "Figma-like menus",
    color: "#89ddff",
    claims: [],
    settings: [{ key: "popover", label: "Context popover", kind: "bool", default: true }],
    prepare(c) {
        ctx = c;
        toolbar = createToolbar(c);
        layers = createLayerList(c);
        inspector = createInspector(c);
        popover = createPopover(c);
        // ponytail: no "recentered" event reaches techniques, so watch a framework zone node move;
        // a framework seam (ctx.onRecenter) would replace this.
        recenterZone = c.scene.getTransformNodeByName("zone-log");
        c.onFrame(() => {
            const z = recenterZone?.getAbsolutePosition();
            if (z && !z.equalsWithEpsilon(zoneAt, 1e-4)) {
                zoneAt.copyFrom(z);
                needPlace = true;
            }
            if (needPlace) {
                needPlace = false;
                place();
            }
            refresh();
            popover.follow(head());
        });
        if (new URLSearchParams(location.search).has("emulate")) {
            installHooks();
        }
    },
    activate() {
        needPlace = true;
        stateKey = "";
        toolbar.panel.show();
        layers.slate.show();
        inspector.slate.show();
        refresh();
    },
    deactivate() {
        toolbar.panel.hide();
        layers.slate.hide();
        inspector.slate.hide();
        popover.setNode(-1);
    },
};
