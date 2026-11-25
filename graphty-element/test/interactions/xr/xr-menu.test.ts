/**
 * The in-headset menu (`xr.menu`) in a real immersive session on an emulated Quest 3 (IWER): the
 * element draws one card per item the host gave, the reader points the right controller at one and
 * pulls the trigger, and `xr-menu-select` reports that item's id, once. With no items, nothing is
 * drawn; leaving VR takes the menu down.
 */
import "../../../src/graphty-element";

import { Quaternion, Ray, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, test, vi } from "vitest";

import type { Graphty } from "../../../index.js";
import type { XRMenuItem } from "../../../src/config/XRConfig";
import { operationQueueOf } from "../../../src/Graph";
import { installIWER, type IWERHandle } from "../helpers/iwer-setup";

const ITEMS: XRMenuItem[] = [
    { id: "layout", label: "Layout" },
    { id: "legend", label: "Legend" },
];

let iwer: IWERHandle;
let element: Graphty;

beforeEach(() => {
    iwer = installIWER();
});

afterEach(() => {
    element.remove();
    iwer.uninstall();
});

/**
 * Mount an element with XR on and the given menu.
 * @param menu - The menu's items; undefined for none.
 * @param path - A render path set before the nodes load; the default when absent.
 */
async function mount(menu?: XRMenuItem[], path?: "objects" | "batched"): Promise<void> {
    element = document.createElement("graphty-element");
    if (path !== undefined) {
        element.renderPath = path;
    }

    element.style.cssText = "display:block;width:400px;height:300px";
    element.xr = { enabled: true, ui: { enabled: true }, ...(menu === undefined ? {} : { menu }) };
    document.body.append(element);
    await vi.waitFor(() => {
        assert.isNotNull(element.shadowRoot?.querySelector('[data-xr-mode="immersive-vr"]') ?? null, "no VR button");
    });
    await element.session.data.addNodes([{ id: "a" }, { id: "b" }]);
    await operationQueueOf(element.graph).waitForCompletion();
}

/**
 * Let the session render more frames.
 * @param count - How many.
 */
async function frames(count = 5): Promise<void> {
    const session = iwer.sessions.at(-1);
    assert.exists(session, "no XR session");
    const target = session.frames + count;
    await vi.waitFor(() => {
        assert.isAtLeast(session.frames, target, "the session stopped rendering");
    });
}

/** Enter VR through the element, and wait until both controllers are tracked. */
async function enterVR(): Promise<void> {
    await element.setViewMode("vr");
    await vi.waitFor(() => {
        const controllers = element.getXRSessionManager()?.getXRHelper()?.input.controllers ?? [];
        assert.lengthOf(controllers, 2, "the emulated controllers are not tracked");
    });
    await frames();
}

/**
 * The menu's card meshes in the scene, top first.
 * @returns Their names.
 */
function menuMeshes(): string[] {
    return element.graph.scene.meshes.map((mesh) => mesh.name).filter((name) => name.startsWith("graphty-xr-menu-"));
}

/**
 * Turn the right controller, where it stands, so its ray points at a mesh's center.
 * @param name - The mesh's name.
 */
async function pointRightAt(name: string): Promise<void> {
    const mesh = element.graph.scene.getMeshByName(name);
    assert.exists(mesh, `no mesh ${name}`);
    const helper = element.getXRSessionManager()?.getXRHelper();
    const controller = helper?.input.controllers.find((source) => source.inputSource.handedness === "right");
    assert.exists(controller, "no right controller");
    const ray = new Ray(Vector3.Zero(), Vector3.Forward());
    controller.getWorldPointerRayToRef(ray);
    const to = mesh.getBoundingInfo().boundingSphere.centerWorld.subtract(ray.origin).normalize();
    // The scene's z runs opposite to WebXR's; a controller points down its -z.
    const along = new Vector3(to.x, to.y, -to.z);
    const turn = new Quaternion(along.y, -along.x, 0, 1 - along.z).normalize();
    iwer.device.controllers.right?.quaternion.set(turn.x, turn.y, turn.z, turn.w);
    await frames();
    await vi.waitFor(() => {
        controller.getWorldPointerRayToRef(ray);
        assert.isTrue(ray.intersectsMesh(mesh).hit, `the right ray does not reach ${name}`);
    });
}

/**
 * Pull and release the right trigger.
 */
async function pullRightTrigger(): Promise<void> {
    iwer.device.controllers.right?.updateButtonValue("trigger", 1);
    await frames(3);
    iwer.device.controllers.right?.updateButtonValue("trigger", 0);
    await frames(3);
}

test("a pressed item emits xr-menu-select with its id, once", async () => {
    await mount(ITEMS);
    const selected: string[] = [];
    element.addEventListener("xr-menu-select", (event) => {
        selected.push(event.detail.id);
    });
    await enterVR();
    await vi.waitFor(() => {
        assert.deepEqual(menuMeshes(), ["graphty-xr-menu-0", "graphty-xr-menu-1"], "the menu is not drawn");
    });

    await pointRightAt("graphty-xr-menu-1");
    await pullRightTrigger();
    await vi.waitFor(() => {
        assert.deepEqual(selected, ["legend"]);
    });

    await element.setViewMode("3d");
    assert.deepEqual(menuMeshes(), [], "the menu stayed after leaving VR");
});

test("items set during a session redraw the menu; none takes it down", async () => {
    await mount();
    await enterVR();
    assert.deepEqual(menuMeshes(), [], "a menu was drawn with no items");

    element.xr = { ...element.xr, menu: ITEMS.slice(0, 1) };
    await vi.waitFor(() => {
        assert.deepEqual(menuMeshes(), ["graphty-xr-menu-0"], "the menu was not drawn");
    });

    element.xr = { ...element.xr, menu: [] };
    await vi.waitFor(() => {
        assert.deepEqual(menuMeshes(), [], "the menu stayed with no items");
    });
    await element.setViewMode("3d");
});

test.each(["objects", "batched"] as const)(
    "a press on an item in front of a node picks the item, not the node behind it, %s path",
    async (path) => {
        await mount(ITEMS, path);
        const selected: string[] = [];
        element.addEventListener("xr-menu-select", (event) => {
            selected.push(event.detail.id);
        });
        await enterVR();
        await vi.waitFor(() => {
            assert.deepEqual(menuMeshes(), ["graphty-xr-menu-0", "graphty-xr-menu-1"], "the menu is not drawn");
        });
        await pointRightAt("graphty-xr-menu-0");

        // A node on the same ray, two meters past the card.
        const card = element.graph.scene.getMeshByName("graphty-xr-menu-0");
        assert.exists(card);
        const controller = element
            .getXRSessionManager()
            ?.getXRHelper()
            ?.input.controllers.find((source) => source.inputSource.handedness === "right");
        assert.exists(controller);
        const ray = new Ray(Vector3.Zero(), Vector3.Forward());
        controller.getWorldPointerRayToRef(ray);
        const past = Vector3.Distance(ray.origin, card.getBoundingInfo().boundingSphere.centerWorld) + 2;
        const behind = ray.origin.add(ray.direction.scale(past));
        await element.session.data.addNodes([{ id: "behind", position: { x: behind.x, y: behind.y, z: behind.z } }]);
        // At the data's place: no spread.
        await element.graph.setLayout("fixed", { dim: 3, spacing: 0 });
        await operationQueueOf(element.graph).waitForCompletion();
        await frames();

        await pullRightTrigger();
        await vi.waitFor(() => {
            assert.deepEqual(selected, ["layout"]);
        });
        assert.deepEqual(element.session.selection.nodes, [], "the press also selected the node behind the card");

        // With the menu down the same press takes the node: it was on the ray, behind the card.
        element.xr = { ...element.xr, menu: [] };
        await vi.waitFor(() => {
            assert.deepEqual(menuMeshes(), [], "the menu stayed with no items");
        });
        await pullRightTrigger();
        assert.deepEqual(element.session.selection.nodes, ["behind"], "the node was not on the ray");
        await element.setViewMode("3d");
    },
);
