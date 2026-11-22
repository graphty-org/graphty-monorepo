import type { Mesh, Nullable, Observer, Scene, WebXRDefaultExperience } from "@babylonjs/core";

import type { CameraManager } from "../cameras/CameraManager";
import type { XRPivotCameraController } from "../cameras/XRPivotCameraController";
import type { LabelDeclutter } from "../managers/LabelDeclutter";
import type { NodeGlowLayer } from "../meshes/NodeEffects";

/**
 * What graphty-element keeps in a Babylon.js `scene.metadata`, which Babylon.js types as `any`.
 * Read it as `scene.metadata as GraphSceneMetadata | null` (the scene starts with `null`); write it
 * after `scene.metadata ??= {}`.
 */
export interface GraphSceneMetadata {
    /** Whether the scene is drawn flat; the edge, label and row meshes read it. */
    twoD?: boolean;
    /** The view the scene is in. */
    viewMode?: "2d" | "3d" | "vr" | "ar";
    /** The scene's label declutterer, made on first use. */
    labelDeclutter?: LabelDeclutter;
    /** The camera manager, which pointer behaviors read. */
    cameraManager?: CameraManager;
    /** The WebXR helper while a session is open; its presence is what XR mode checks. */
    xrHelper?: Nullable<WebXRDefaultExperience>;
    /** The camera controller of the open XR session. */
    xrCameraController?: XRPivotCameraController;
    /** The per-frame XR update, kept to remove it when the session ends. */
    xrUpdateObserver?: Nullable<Observer<Scene>>;
    /** Whether the stencil main pass is on, shared by every outlined node. */
    stencilMainPass?: { on: boolean };
    /** The outline width every outlined node shares. */
    outlineWidth?: number;
    /** The glow layer every glowing node shares. */
    glowLayer?: NodeGlowLayer;
    /** Each glowing mesh's glow strength and alpha. */
    glowStrengths?: Map<Mesh, { strength: number; alpha: number }>;
}

/** What graphty-element keeps in a line or arrow mesh's `metadata`. */
export interface LineMeshMetadata {
    /** Marked on a mesh drawn for a 2D scene. */
    is2D?: boolean;
    /** Marked on an edge drawn as a flat 2D line. */
    is2DLine?: boolean;
    /** Marked on a 2D line drawn as one joined strip. */
    joinedLine?: boolean;
    /** The line's width. */
    lineWidth?: number;
    /** The line's opacity. */
    lineOpacity?: number;
}
