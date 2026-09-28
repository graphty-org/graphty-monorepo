/**
 * Camera extension point. NORMATIVE for shapes; behaviour in design/extensions/camera.md.
 * Entry point: @graphty/graphty-element/extend. Serialised form of the descriptor:
 * design/extensions/descriptors.schema.json#/$defs/CameraDescriptor.
 */
import type { OptionDescriptor, RegisterOptions } from "./common";

// =============================================================================================
// Published (graphty-element 2.6.1)
// =============================================================================================

/** The built-in view ids. Reserved. */
export declare const KNOWN_CAMERA_IDS: readonly ["fitToGraph", "topView", "sideView", "frontView", "isometric"];

/** A view id: a built-in name or a registered one. OPEN UNION. */
export type CameraId = (typeof KNOWN_CAMERA_IDS)[number] | (string & {});

/** The drawing modes. CLOSED for writers; a reader MUST treat an unknown mode as unsupported. */
export type DrawingMode = "2d" | "3d";

/** A point or extent in scene units. */
export interface Vec3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

/** The box a view frames. CALLED BY EXTENSIONS. */
export interface GraphBounds {
    readonly min: Vec3;
    readonly max: Vec3;
    readonly center: Vec3;
    readonly size: Vec3;
    /** max(size.x, size.y, size.z). */
    readonly maxDimension: number;
    /** How many nodes the box was measured over. 0 means the box is empty (see camera.md 4.4). */
    readonly measured: number;
}

/**
 * Where the camera is. What a view RETURNS. IMPLEMENTED BY EXTENSIONS (as a return value).
 * 3D views set position and target (and MAY set fov); 2D views set zoom and pan (and MAY set
 * rotation). Members a view leaves out keep their current values.
 */
export interface CameraState {
    type?: "arcRotate" | "free" | "universal" | "orthographic";
    position?: { x: number; y: number; z: number };
    target?: { x: number; y: number; z: number };
    alpha?: number;
    beta?: number;
    radius?: number;
    fov?: number;
    zoom?: number;
    pan?: { x: number; y: number };
    rotation?: number;
    orthoLeft?: number;
    orthoRight?: number;
    orthoTop?: number;
    orthoBottom?: number;
    pivotRotation?: { x: number; y: number; z: number };
    cameraDistance?: number;
}

/** What a view is computed from. CALLED BY EXTENSIONS. */
export interface CameraViewInput {
    /** The box to frame: the whole graph, or the scope the caller named. */
    readonly bounds: GraphBounds;
    /** One of the descriptor's declared modes; never another. */
    readonly mode: DrawingMode;
    /** viewport.width / viewport.height. */
    readonly aspect: number;
    /** The render size in CSS pixels; a 2D view needs it for pixels per scene unit. */
    readonly viewport: { readonly width: number; readonly height: number };
    /** The camera's vertical field of view in radians, when it has one. */
    readonly fov?: number;
    /** Where the camera is now. */
    readonly current: CameraState;
    /** The view's options, already validated and defaulted against descriptor.options. */
    readonly options: Readonly<Record<string, unknown>>;
}

/** One view. IMPLEMENTED BY EXTENSIONS. */
export interface CameraDescriptor {
    id: CameraId;
    plainName: string;
    description: string;
    /** At least one. The element refuses the others with E_UNSUPPORTED before calling compute. */
    modes: readonly DrawingMode[];
    options: readonly OptionDescriptor[];
}

/** What registerCameraView accepts. IMPLEMENTED BY EXTENSIONS. */
export interface CameraViewRegistration {
    readonly descriptor: CameraDescriptor;
    /** A PURE, SYNCHRONOUS function of its input. See camera.md section 3. */
    readonly compute: (input: CameraViewInput) => CameraState;
}

/**
 * Register a view. Throws GraphtyError E_BAD_COMMAND (details.field: descriptor, id, modes,
 * options, compute) or E_DUPLICATE_PLUGIN. Sameness is decided by the compute function.
 */
export declare function registerCameraView(registration: CameraViewRegistration, options?: RegisterOptions): void;

export declare function registeredCameraDescriptors(): readonly CameraDescriptor[];
export declare function clearRegisteredCamerasForTesting(): void;

// =============================================================================================
// Proposed (NOT built)
// =============================================================================================

/**
 * PROPOSED -- open decision "Persisting camera views and layout choices" (README.md section 12,
 * item 8). What a saved view or recipe records about a named camera view, so that it can be
 * applied again. Plain JSON.
 */
export interface CameraViewReference {
    readonly view: CameraId;
    readonly options?: Readonly<Record<string, unknown>>;
    /** The npm package and the extension's own version when it declared them, as provenance. */
    readonly package?: string;
    readonly version?: string;
    /** The scope the view framed (the element's ScopeInput, as plain JSON), or absent for the whole graph. */
    readonly scope?: unknown;
    /**
     * The resulting state at the time of saving, so a reader without the extension installed can
     * still restore the camera exactly, and a reader with it can tell whether the view changed.
     */
    readonly resolved?: CameraState;
}
