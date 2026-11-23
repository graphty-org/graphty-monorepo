/**
 * WebXR emulation setup using IWER (Immersive Web Emulation Runtime)
 *
 * `installIWER` makes the page's `navigator.xr` an emulated Meta Quest 3, so immersive-vr and
 * immersive-ar sessions really start, render and end in headless Chromium.
 */

import { metaQuest3, XRDevice } from "iwer";

/**
 * One immersive session the page asked for, and what happened to it.
 */
export interface RecordedXRSession {
    /** The mode passed to `navigator.xr.requestSession`. */
    mode: XRSessionMode;
    /** What the page asked the session for: its required and optional features. */
    init: XRSessionInit | undefined;
    /** The session the runtime returned. */
    session: XRSession;
    /** XR frames the session has delivered to the page so far. */
    frames: number;
    /** Whether the session has fired `end`. */
    ended: boolean;
}

/**
 * An installed IWER runtime.
 */
export interface IWERHandle {
    /** The emulated headset, for moving controllers, hands and the head. */
    device: XRDevice;
    /** Every session requested since install, oldest first. */
    sessions: RecordedXRSession[];
    /** Put the browser's own `navigator.xr` back. */
    uninstall: () => void;
}

/**
 * Install IWER as the page's WebXR runtime, emulating a Meta Quest 3, and record every session the
 * page starts: its mode, whether it ended, and how many XR frames it rendered.
 *
 * Install it BEFORE the graph initializes: the element asks the runtime which modes are supported
 * once, at init, and draws its VR / AR buttons from that answer.
 *
 * Chromium exposes its own `navigator.xr`, and IWER 2.5 declines to replace a native runtime unless
 * forced, so the install is forced. `uninstall` hands back everything IWER replaced: `navigator.xr`,
 * `navigator.userAgent`, the WebXR globals and `makeXRCompatible`.
 * @param refuse - Features, such as reference space types, the emulated headset does not support
 * @returns the device, the session record and the uninstall function
 */
export function installIWER(refuse: readonly string[] = []): IWERHandle {
    const device = new XRDevice({
        ...metaQuest3,
        supportedFeatures: metaQuest3.supportedFeatures.filter((feature) => !refuse.includes(feature)),
    });

    device.installRuntime({ forceInstall: true });

    const { xr } = navigator;

    if (!xr) {
        throw new Error("IWER installed no navigator.xr");
    }

    const sessions: RecordedXRSession[] = [];
    const requestSession = xr.requestSession.bind(xr);

    xr.requestSession = async (mode: XRSessionMode, init?: XRSessionInit): Promise<XRSession> => {
        const session = await requestSession(mode, init);
        const record: RecordedXRSession = { mode, init, session, frames: 0, ended: false };
        const requestFrame = session.requestAnimationFrame.bind(session);

        sessions.push(record);
        session.addEventListener("end", () => {
            record.ended = true;
        });
        session.requestAnimationFrame = (callback: XRFrameRequestCallback): number =>
            requestFrame((time, frame) => {
                record.frames++;
                callback(time, frame);
            });

        return session;
    };

    return {
        device,
        sessions,
        uninstall: () => {
            device.uninstallRuntime();
        },
    };
}
