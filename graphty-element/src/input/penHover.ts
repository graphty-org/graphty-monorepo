import type { Scene } from "@babylonjs/core/scene.js";

/**
 * Let a hovering pen hover, as a mouse does.
 *
 * Babylon.js 9 takes a pen for a touch pointer and drops every pen move made with no button
 * pressed ("hover-only touch pointers", DeviceInput/webDeviceInputSystem.js), so the scene never
 * heard a pen hovering: no node or edge hover, no Hovered row, no hover cursor (issue #10199).
 * Babylon 8 forwarded those moves. Each such move is handed back to Babylon here as the move of a
 * mouse with no button held, which Babylon delivers through its whole move path -- the pointer
 * position, both pointer observables, its own picks and cursor -- exactly as it delivers a mouse's.
 * A pen pressed down is left to Babylon, which hears it.
 *
 * Should Babylon forward pen hover again, every hover move would be heard twice; remove this then.
 * @param scene - The scene whose input element the pen moves over.
 */
export function hearPenHover(scene: Scene): void {
    const element = scene.getEngine().getInputElement();
    if (!element) {
        return;
    }

    const forward = (evt: PointerEvent): void => {
        if (evt.pointerType !== "pen" || evt.buttons !== 0) {
            return;
        }

        element.dispatchEvent(
            new PointerEvent("pointermove", {
                pointerType: "mouse",
                pointerId: evt.pointerId,
                isPrimary: evt.isPrimary,
                clientX: evt.clientX,
                clientY: evt.clientY,
                screenX: evt.screenX,
                screenY: evt.screenY,
                movementX: evt.movementX,
                movementY: evt.movementY,
                button: -1,
                buttons: 0,
                altKey: evt.altKey,
                ctrlKey: evt.ctrlKey,
                metaKey: evt.metaKey,
                shiftKey: evt.shiftKey,
            }),
        );
    };
    element.addEventListener("pointermove", forward);
    scene.onDisposeObservable.addOnce(() => {
        element.removeEventListener("pointermove", forward);
    });
}
