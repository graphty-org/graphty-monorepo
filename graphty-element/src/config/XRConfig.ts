/**
 * XR (VR/AR) Configuration
 *
 * This configuration controls the behavior of WebXR features in graphty-element.
 */

import type { XRReferenceSpaceType } from "../xr/XRSessionManager";

/**
 * UI configuration for XR buttons
 */
export interface XRUIConfig {
    /**
     * Enable or disable the XR UI buttons
     * @default true
     */
    enabled: boolean;

    /**
     * Position of the XR buttons on screen
     * @default "bottom-left"
     */
    position: "bottom-left" | "bottom-right" | "top-left" | "top-right";

    /**
     * Duration in milliseconds to show "not available" message
     * Set to 0 to keep message visible permanently
     * @default 5000
     */
    unavailableMessageDuration: number;

    /**
     * Show "VR / AR NOT AVAILABLE" warning when XR is not available
     * When false, no message is displayed if AR/VR aren't available
     * @default false
     */
    showAvailabilityWarning: boolean;
}

/**
 * Configuration for VR or AR mode
 */
export interface XRModeConfig {
    /**
     * Enable this XR mode
     * @default true
     */
    enabled: boolean;

    /**
     * Reference space type for WebXR session
     * @default "local-floor"
     */
    referenceSpaceType: XRReferenceSpaceType;

    /**
     * Optional WebXR features to request
     * @example ["hand-tracking", "hit-test"]
     * @default []
     */
    optionalFeatures?: string[];
}

/**
 * Configuration for XR input handling
 */
export interface XRInputConfig {
    /**
     * Enable hand tracking
     * @default true
     */
    handTracking: boolean;

    /**
     * Enable controller input
     * @default true
     */
    controllers: boolean;

    /**
     * Enable near interaction (touching objects with hands)
     * @default true
     */
    nearInteraction: boolean;

    /**
     * Enable physics for hand joints
     * @default false
     */
    physics: boolean;

    /**
     * Z-axis movement amplification factor in XR mode
     * Multiplies Z-axis delta to make depth manipulation more practical
     * @default 10.0
     */
    zAxisAmplification?: number;

    /**
     * Enable Z-axis amplification in desktop mode
     * @default false
     */
    enableZAmplificationInDesktop?: boolean;
}

/**
 * Configuration for XR teleportation
 */
export interface XRTeleportationConfig {
    /**
     * Enable teleportation feature
     * @default false
     */
    enabled: boolean;

    /**
     * Duration of teleportation animation in milliseconds
     * @default 200
     */
    easeTime: number;
}

/** A face button of a Quest Touch controller: A and B on the right, X and Y on the left. */
export type XRControllerButton = "a" | "b" | "x" | "y";

/**
 * The codes of the controls the assistant draws in an immersive session, which `XRAiConfig.labels`
 * may give words to: approve and deny a held change, and the reader's own words as heard. The
 * cards that show a held change, a question or an answer are keyed by their result code
 * (`AI_CONFIRMATION_NEEDED`, `AI_QUESTION_ASKED`, the answer's code). OPEN UNION.
 */
export type XRAiControlCode = "XR_APPROVE" | "XR_DENY" | "XR_TRANSCRIPT" | (string & {}); // NOSONAR(S4335): the open-union idiom

/**
 * The assistant in an immersive session (with `AiManagerConfig.voice`). Every part is on by
 * default; an empty button list switches that binding off. Never the trigger or the thumbsticks.
 */
export interface XRAiConfig {
    /** Holding talk. */
    pushToTalk?: {
        /** The buttons held to talk. @default ["b", "y"] */
        buttons?: readonly XRControllerButton[];
        /** With hands, pinch and hold a microphone orb on the wrist to talk. @default true */
        wristOrb?: boolean;
    };
    /** The buttons that answer a pending approval. */
    pendingButtons?: {
        /** @default ["a"] */
        approve?: readonly XRControllerButton[];
        /** @default ["x"] */
        deny?: readonly XRControllerButton[];
    };
    /** Draw approve and deny, or one control per question choice, in the scene. @default true */
    pendingControl?: boolean;
    /** Draw the transcript and the answer in the scene. @default true */
    panel?: boolean;
    /**
     * The words drawn in the scene, keyed by code (a result code, or a control's own code:
     * {@link XRAiControlCode}). A code with no label is drawn as its icon only: the element draws
     * no words of its own, only the reader's and the model's text and catalog names.
     * @default {}
     */
    labels?: Readonly<Record<string, string>>;
}

/**
 * Complete XR configuration
 */
export interface XRConfig {
    /**
     * Enable XR features globally
     * @default true
     */
    enabled: boolean;

    /**
     * UI button configuration
     */
    ui: XRUIConfig;

    /**
     * VR mode configuration
     */
    vr: XRModeConfig;

    /**
     * AR mode configuration
     */
    ar: XRModeConfig;

    /**
     * Input handling configuration
     */
    input: XRInputConfig;

    /**
     * Teleportation configuration
     */
    teleportation: XRTeleportationConfig;

    /** The assistant in an immersive session; absent, every default. */
    ai?: XRAiConfig;
}

/**
 * Default XR configuration
 *
 * Note: XR is disabled by default to avoid issues with navigator.xr.isSessionSupported()
 * hanging in headless browser environments (CI, tests). Users who want XR should
 * explicitly enable it by setting xr.enabled: true in their configuration.
 */
export const defaultXRConfig: XRConfig = {
    enabled: false,
    ui: {
        enabled: true,
        position: "bottom-right",
        unavailableMessageDuration: 5000,
        showAvailabilityWarning: false,
    },
    vr: {
        enabled: true,
        referenceSpaceType: "local-floor",
        optionalFeatures: [],
    },
    ar: {
        enabled: true,
        referenceSpaceType: "local-floor",
        optionalFeatures: ["hit-test"],
    },
    input: {
        handTracking: true,
        controllers: true,
        nearInteraction: true,
        physics: false,
        zAxisAmplification: 10,
        enableZAmplificationInDesktop: false,
    },
    teleportation: {
        enabled: false,
        easeTime: 200,
    },
};
