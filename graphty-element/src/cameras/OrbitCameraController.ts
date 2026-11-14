// Babylon installs scene.createPickingRay only when this loads.
import "@babylonjs/core/Culling/ray.js";

import {
    Camera,
    Color4,
    Matrix,
    Quaternion,
    Scalar,
    Scene,
    type TransformNode,
    UniversalCamera,
    Vector3,
} from "@babylonjs/core";
import { raySphere } from "babylonjs-map/projection";

import { type FreeArea, freeArea, fullInsets, paddedArea } from "../camera/insets";
import type { ViewInsets } from "../camera/types";
import type { FitBounds, FitInsets } from "../config/GraphBehavior";
import { glideTowards } from "./CameraManager";
import { PivotController } from "./PivotController";

export interface OrbitConfig {
    trackballRotationSpeed: number;
    keyboardRotationSpeed: number;
    /**
     * The fraction of the camera's distance that W or S moves the camera each frame it is held,
     * so a held key zooms by the same factor per frame however far out the camera is.
     */
    keyboardZoomSpeed: number;
    keyboardYawSpeed: number;
    twistYawSensitivity: number;
    minZoomDistance: number;
    maxZoomDistance: number;
    inertiaDamping: number;
}

/**
 * Babylon's own default far plane. The derived far plane never goes below it, so a
 * small graph keeps exactly the picture and the depth precision it had before.
 */
const DEFAULT_FAR_PLANE = 10000;

/** Babylon's own near clip plane, kept everywhere but close to a globe. */
const DEFAULT_NEAR_PLANE = 1;

/** The nearest the near clip plane comes, close to a globe, so depth keeps its precision. */
const MIN_NEAR_PLANE = 0.01;

/** How squarely the line of sight must face a {@link OrbitCameraController.surfacePlane} to reach it. */
const MIN_PLANE_FACING = 0.01;

/** No room kept clear: framing uses the whole canvas. */
const NO_INSETS: FitInsets = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

/**
 * What every fit keeps clear at each edge, in CSS pixels: the larger of the view insets (what
 * something else covers) and the fit insets (`camera.fitInsets`), side by side.
 * @param viewInsets - The view insets.
 * @param fitInsets - The fit insets.
 * @returns Every side.
 */
export function framingInsets(viewInsets: ViewInsets, fitInsets: FitInsets): Required<ViewInsets> {
    const view = fullInsets(viewInsets);
    const fit = fullInsets(fitInsets);
    return {
        top: Math.max(view.top, fit.top),
        right: Math.max(view.right, fit.right),
        bottom: Math.max(view.bottom, fit.bottom),
        left: Math.max(view.left, fit.left),
    };
}

/** A point a fit must keep in view, and how far the thing drawn there reaches around it. */
export interface FramingSpot {
    readonly pos: Vector3;
    readonly half: number;
}

/**
 * How far from the center the camera must stand to keep every spot in view at every angle the
 * view turns to about the vertical axis through the center, for `camera.fitBounds` "turning".
 *
 * A spot `r` from that axis and `dy` above the center, seen from a camera `d` away, is drawn
 * highest when it has turned nearest the camera: it fits when `d >= dy / tan(halfFovY) + r`.
 * Sideways it sits at `r sin(a)` and `r cos(a)` nearer, and the worst angle needs
 * `d >= r * sqrt(1 + 1 / tan(halfFovX)^2)`. Spots near the axis, the top and bottom of most
 * graphs, ask for much less than the corners of the box around them would.
 * @param center - The center the view turns about.
 * @param spots - What must stay in view.
 * @param tanX - The tangent of half the horizontal field of view.
 * @param tanY - The tangent of half the vertical field of view.
 * @returns The distance.
 */
export function turningFitDistance(center: Vector3, spots: readonly FramingSpot[], tanX: number, tanY: number): number {
    const sideways = Math.sqrt(1 + 1 / (tanX * tanX));
    let distance = 0;
    for (const { pos, half } of spots) {
        const r = Math.hypot(pos.x - center.x, pos.z - center.z) + half;
        const dy = Math.abs(pos.y - center.y) + half;
        distance = Math.max(distance, dy / tanY + r, r * sideways);
    }

    return distance;
}

/**
 * How far from a sphere's center a perspective camera stands for the sphere's outline to touch the
 * edges of a view whose half field of view has this tangent: `radius / sin(atan(tan))`.
 * @param radius - The sphere's radius.
 * @param tan - The tangent of half the field of view, along the view's shorter side.
 * @returns The distance.
 */
export function sphereFitDistance(radius: number, tan: number): number {
    return (radius * Math.sqrt(1 + tan * tan)) / tan;
}

/**
 * Controls a 3D orbit camera with pivot-based rotation and distance-based zoom.
 * Provides trackball-style rotation and keyboard/touch controls.
 */
export class OrbitCameraController {
    public scene: Scene;
    public camera: UniversalCamera;
    public cameraDistance: number;
    public config: OrbitConfig;
    /** Room framing leaves clear at each edge, in CSS pixels; see `camera.fitInsets`. */
    public fitInsets: FitInsets = NO_INSETS;
    /** What a fit fits into view; see `camera.fitBounds`. */
    public fitBounds: FitBounds = "box";
    /** CSS pixels a fit keeps clear at each end of the free area's shorter side, in place of its margin. */
    public fitPadding: number | undefined = undefined;

    private readonly pivotController: PivotController;

    /**
     * Margins of the canvas something else covers, in CSS pixels. Every fit keeps the graph out
     * of them, and the camera is shifted sideways so the pivot sits at the center of what is
     * left -- a lens shift, so the graph still turns about its own center.
     */
    public viewInsets: ViewInsets = {};
    /** Told each time {@link rotate}, {@link spin} or {@link zoom} moves the camera: the reader's input. */
    public onReaderMove?: () => void;

    /** Half the diagonal of the last bounding box fitted by zoomToBoundingBox. */
    #sceneRadius = 0;

    readonly #canvas: Element;

    /**
     * Expose pivot TransformNode for compatibility with existing code.
     * This is the underlying pivot from PivotController.
     * @returns The pivot TransformNode used for rotation
     */
    public get pivot(): TransformNode {
        return this.pivotController.pivot;
    }

    /**
     * Creates a new OrbitCameraController instance.
     * @param canvas - The canvas element to attach the camera to
     * @param scene - The Babylon.js scene
     * @param config - Configuration options for the orbit camera
     */
    constructor(canvas: Element, scene: Scene, config: OrbitConfig) {
        this.config = config;
        this.#canvas = canvas;

        this.scene = scene;
        this.scene.clearColor = new Color4(0, 0, 0, 1);

        // Use shared PivotController instead of raw TransformNode
        this.pivotController = new PivotController(scene);

        this.cameraDistance = 10;

        this.camera = new UniversalCamera("camera", new Vector3(0, 0, -this.cameraDistance), this.scene);
        this.camera.inputs.clear();
        this.scene.activeCamera = this.camera;
        this.camera.attachControl(canvas, true);

        // Force initial update after camera is properly set up
        this.updateCameraPosition();
    }

    /**
     * Rotate the scene by dx (yaw) and dy (pitch) amounts.
     * Delegates to PivotController for consistent rotation behavior.
     * @param dx - Horizontal rotation delta in pixels
     * @param dy - Vertical rotation delta in pixels
     */
    public rotate(dx: number, dy: number): void {
        // Match XR rotation convention: drag right = rotate right (positive yaw)
        // Pitch follows "drag up = graph moves up" convention (not inverted)
        const yaw = dx * this.config.trackballRotationSpeed;
        const pitch = dy * this.config.trackballRotationSpeed;
        if (!this.#turnGlobe(yaw, pitch)) {
            this.pivotController.rotate(yaw, pitch);
        }
        this.updateCameraPosition();
        this.onReaderMove?.();
    }

    /**
     * Turn the scene about its vertical axis on its own, for `camera.autoRotate`.
     * @param radians - The angle.
     */
    public autoTurn(radians: number): void {
        this.pivotController.rotate(radians, 0);
        this.updateCameraPosition();
    }

    /**
     * Spin the scene around the Z-axis (roll).
     * Delegates to PivotController for consistent rotation behavior.
     * @param dz - Rotation delta around Z-axis in radians
     */
    public spin(dz: number): void {
        this.pivotController.spin(dz);
        this.updateCameraPosition();
        this.onReaderMove?.();
    }

    /**
     * Zoom by adjusting camera distance.
     * Note: This uses camera-distance based zoom (not scale-based like XR).
     * This feels more natural for desktop interaction.
     * @param delta - Distance delta to adjust camera by
     */
    public zoom(delta: number): void {
        // The configured ceiling suits a small graph. A fitted large graph already sits
        // beyond it, so the ceiling follows the graph and a reader can still pull back.
        const ceiling = Math.max(this.config.maxZoomDistance, this.cameraDistance + this.#sceneRadius * 2);
        this.cameraDistance = Scalar.Clamp(this.cameraDistance + delta, this.#floor(), ceiling);
        this.onReaderMove?.();
    }

    /**
     * Zoom like {@link zoom}, keeping the point under a spot on the screen where it is: the pivot
     * slides toward that spot by the share of the distance the zoom took away.
     *
     * Exact for a point on the plane through the pivot that faces the camera, and close for a
     * node in front of or behind it.
     * ponytail: plane through the pivot, not the picked depth; pick the node under the pointer if
     * a deep 3D layout drifts noticeably.
     * @param delta - Distance delta to adjust the camera by; negative zooms in.
     * @param x - The spot's horizontal position, -1 (left edge) to 1 (right edge).
     * @param y - The spot's vertical position, -1 (bottom edge) to 1 (top edge).
     */
    public zoomToward(delta: number, x: number, y: number): void {
        const before = this.cameraDistance;
        this.zoom(delta);
        const taken = before - this.cameraDistance;
        const { tanX, tanY } = this.#halfFovTangents();
        const free = this.#freeArea();
        const slide = new Vector3((x - free.x) * tanX * taken, (y - free.y) * tanY * taken, 0);
        this.pivot.position.addInPlace(Vector3.TransformNormal(slide, this.pivot.computeWorldMatrix(true)));
        this.pivot.computeWorldMatrix(true);
        this.updateCameraPosition();
    }

    /**
     * Zoom by a factor of the current distance, within the same limits as `zoom`. Over a globe the
     * factor scales the camera's height above its surface instead; see {@link zoomDelta}.
     * @param factor - The distance multiplier (< 1 zooms in, > 1 zooms out)
     */
    public zoomBy(factor: number): void {
        this.zoom(this.zoomDelta(factor));
    }

    /**
     * How far a zoom by a factor moves the camera: that share of its distance from the pivot, or,
     * over a globe ({@link grabSphere} or {@link surfaceFloor}), of its height above the surface
     * along the view. The camera turns about the globe's center, so its distance is the radius
     * plus its height, and a share of that moved it near the surface by most of its height in one
     * step; a share of the height slows as the surface nears and never jumps onto it.
     * @param factor - The multiplier (< 1 zooms in, > 1 zooms out).
     * @returns The distance delta for {@link zoom}.
     */
    public zoomDelta(factor: number): number {
        const sphere = this.grabSphere ?? this.surfaceFloor;
        const span = sphere === null ? this.cameraDistance : this.cameraDistance - this.#outside(sphere.radius);
        return Math.max(0, span) * (factor - 1);
    }

    /**
     * The distance rule every programmatic writer of `cameraDistance` follows: floored at
     * `minZoomDistance`, never capped. The ceiling is a zoom-out limit for a reader, not a
     * framing limit -- a saved state for a large graph can sit beyond it, and `zoom` accepts that
     * -- while a distance under the floor would make the next zoom IN jump the camera outwards.
     * @param distance - The distance asked for.
     * @returns The distance to use.
     */
    public clampDistance(distance: number): number {
        return Math.max(distance, this.#floor());
    }

    /**
     * A sphere at the origin the camera never enters (a globe under a map layout), as its radius;
     * null for none.
     */
    public surfaceFloor: { readonly radius: number } | null = null;

    /**
     * A sphere at the origin a drag turns as a globe (the globe under a map layout), as its
     * radius: the point grabbed stays under the pointer. Null for the ordinary turn.
     */
    public grabSphere: { readonly radius: number } | null = null;

    /**
     * A sphere at the origin the far clip plane reaches past wherever the camera is (a flat map
     * under a map layout, which can be far larger than the graph), as its radius; null for none.
     */
    public farReach: { readonly radius: number } | null = null;

    /**
     * The plane z = 0 of a flat map under a map layout: the pivot stays on it, so a turn is about
     * a point of the map and the camera's distance from the pivot is its distance from the map,
     * however far framing or a zoom toward the pointer put the pivot off it. `floor` is the least
     * distance from the map. Null for none.
     */
    public surfacePlane: { readonly floor: number } | null = null;

    /**
     * Turn the view so the point of the {@link grabSphere} under one spot of the canvas moves to
     * another, as a hand turns a globe.
     * @param from - The pointer's last spot, CSS pixels from the canvas's top-left corner.
     * @param from.x - Its x.
     * @param from.y - Its y.
     * @param to - Its spot now.
     * @param to.x - Its x.
     * @param to.y - Its y.
     * @returns False when there is no sphere or a spot misses it, so the drag turns as usual.
     */
    public dragOnSphere(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
        const sphere = this.grabSphere;
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (sphere === null || canvas === null || canvas.clientWidth === 0) {
            return false;
        }

        const ratio = this.scene.getEngine().getRenderWidth() / canvas.clientWidth;
        const hit = (spot: { x: number; y: number }): Vector3 | null => {
            const ray = this.scene.createPickingRay(spot.x * ratio, spot.y * ratio, Matrix.Identity(), this.camera);
            const at = raySphere(ray.origin, ray.direction, sphere.radius);
            return at === null ? null : new Vector3(at.x, at.y, at.z).normalize();
        };
        const a = hit(from);
        const b = hit(to);
        if (a === null || b === null) {
            return false;
        }

        // atan2, not acos of the dot: a move of a few pixels near the surface turns the globe by
        // less than a millionth of a radian, which acos loses.
        const axis = Vector3.Cross(a, b);
        const angle = Math.atan2(axis.length(), Vector3.Dot(a, b));
        if (angle > 0) {
            // The camera turns the other way about the globe's center, so the globe seems to turn a to b.
            this.#turnAboutOrigin(axis, -angle);
            this.updateCameraPosition();
        }

        this.onReaderMove?.();
        return true;
    }

    /**
     * Turn the camera, the pivot with it, about the world's origin: the center of a globe. About the
     * center, not the pivot: a camera framed on data looks at a point near the surface. Every angle
     * counts, however small: close to the surface a drag or a key turns the globe by millionths of a
     * radian, below the dead zone `PivotController` keeps for hand jitter.
     * @param axis - The axis, in world space; need not be normalized.
     * @param angle - The angle, in radians.
     */
    #turnAboutOrigin(axis: Vector3, angle: number): void {
        if (angle === 0 || axis.lengthSquared() === 0) {
            return;
        }

        const turn = Quaternion.RotationAxis(axis.normalizeToNew(), angle);
        this.pivot.rotationQuaternion = turn.multiply(this.pivot.rotationQuaternion ?? Quaternion.Identity());
        this.pivot.position.applyRotationQuaternionInPlace(turn);
        this.pivot.computeWorldMatrix(true);
    }

    /**
     * Over a {@link grabSphere}, turn the globe for a key or a drag that missed it: about its center,
     * by the angle scaled by the camera's height as a share of its distance from the center. Far out
     * that is almost the whole angle; near the surface the ground moves by about the same share of
     * the view at any height, and the camera keeps its height, never sinking into the globe. Turning
     * about the pivot, a key swept the camera over hundreds of kilometres a frame at street level.
     * @param yaw - The turn about the view's vertical axis, in radians.
     * @param pitch - The turn about the view's horizontal axis, in radians.
     * @returns False with no globe, so the caller turns about the pivot as usual.
     */
    #turnGlobe(yaw: number, pitch: number): boolean {
        const sphere = this.grabSphere;
        if (sphere === null) {
            return false;
        }

        const world = this.pivot.computeWorldMatrix(true);
        const eye = Vector3.TransformCoordinates(this.camera.position, world).length();
        const share = eye === 0 ? 1 : Math.max(0, eye - sphere.radius) / eye;
        const up = Vector3.TransformNormal(Vector3.Up(), world);
        const right = Vector3.TransformNormal(Vector3.Right(), world);
        this.#turnAboutOrigin(up, yaw * share);
        this.#turnAboutOrigin(right, pitch * share);
        return true;
    }

    /**
     * The least distance from the pivot: `minZoomDistance`, and, with a {@link surfaceFloor}, the
     * distance that keeps the camera outside it, looking the way it looks now.
     * @returns The floor.
     */
    #floor(): number {
        const floor = this.surfaceFloor;
        if (floor === null) {
            return Math.min(this.config.minZoomDistance, this.surfacePlane?.floor ?? Infinity);
        }

        return Math.max(this.config.minZoomDistance, this.#outside(floor.radius));
    }

    /**
     * The least distance from the pivot, looking the way the camera looks now, that keeps the
     * camera outside a sphere at the origin; 0 when its line of sight misses the sphere.
     * @param radius - The sphere's radius.
     * @returns The distance.
     */
    #outside(radius: number): number {
        // The camera stands at pivot - forward * distance; solve |q - f d| >= R for d.
        const world = this.pivot.computeWorldMatrix(true);
        const forward = Vector3.TransformNormal(Vector3.Forward(), world).normalize();
        const q = this.pivot.position;
        const along = Vector3.Dot(q, forward);
        const disc = along * along - q.lengthSquared() + radius * radius;
        return disc < 0 ? 0 : Math.max(0, along + Math.sqrt(disc));
    }

    /**
     * Glide the pivot to a point, turning about that point meanwhile, so the camera ends up
     * looking at it and orbits, spins and zooms about it.
     * @param point - The point, in world space.
     * @param frames - How many nominal 60 Hz frames this pass stands for; see `glideTowards`.
     * @returns Whether the pivot moved.
     */
    public followPoint(point: Vector3, frames = 1): boolean {
        // The point's own place on a map's plane: what stands above the map, the pivot never reaches.
        const target = this.#onPlane(point);
        this.pivotController.center = target;
        const moved = glideTowards(this.pivot.position, target, frames);
        this.updateCameraPosition();
        return moved;
    }

    /**
     * Update camera position relative to the pivot.
     * Parents camera to pivot and positions at negative Z distance.
     */
    public updateCameraPosition(): void {
        this.#settleOnPlane();

        // Parent the camera to the pivot for proper transformation
        this.camera.parent = this.pivot;

        // Set local position relative to pivot, shifted sideways so the pivot lands at the
        // center of the part of the canvas the view insets leave free. The shift is a share of
        // the distance, so the pivot stays at that point on screen as the reader zooms.
        const { tanX, tanY } = this.#halfFovTangents();
        const free = this.#freeArea();
        this.camera.position.set(
            -free.x * tanX * this.cameraDistance,
            -free.y * tanY * this.cameraDistance,
            -this.cameraDistance,
        );

        // Reset camera rotation - when parented, the camera inherits the pivot's rotation
        this.camera.rotation.set(0, 0, 0);

        // Every writer of cameraDistance passes through here, so this is the one place the
        // far plane has to follow the graph. A layout that settles tens of thousands of units
        // across would otherwise be clipped away by Babylon's default 10000.
        // A map under the graph reaches past it: the far plane reaches the map's farthest point
        // from wherever the camera stands, or a tilted view cuts the map off along a line.
        const reach =
            this.farReach === null
                ? 0
                : this.camera.position.length() + this.pivot.position.length() + this.farReach.radius;
        this.camera.maxZ = Math.max(DEFAULT_FAR_PLANE, this.cameraDistance + this.#sceneRadius * 2, reach);
        this.camera.minZ = this.#nearPlane();
    }

    /**
     * The near clip plane: Babylon's 1 unit, or, over a globe, a quarter of the camera's height
     * above its surface when that is less, so zooming down to the surface never cuts it away, and a
     * sixteenth of that height when that is more. A globe seen from far away is hundreds of
     * thousands of units off, and with the near plane at 1 almost all of the depth range lies in
     * front of it: what is left cannot hold the map's stacking offsets, which are clamped at the
     * range's end, so the globe's far side ties with its near side and shows through in bands.
     * @returns The distance.
     */
    #nearPlane(): number {
        const sphere = this.grabSphere ?? this.surfaceFloor;
        if (sphere === null) {
            return this.surfacePlane === null
                ? DEFAULT_NEAR_PLANE
                : Scalar.Clamp(this.cameraDistance / 4, MIN_NEAR_PLANE, DEFAULT_NEAR_PLANE);
        }

        const eye = Vector3.TransformCoordinates(this.camera.position, this.pivot.computeWorldMatrix(true));
        const height = eye.length() - sphere.radius;
        return Math.max(Scalar.Clamp(height / 4, MIN_NEAR_PLANE, DEFAULT_NEAR_PLANE), height / 16);
    }

    /**
     * The way the camera looks, in world space.
     * @returns The unit vector.
     */
    #forward(): Vector3 {
        // Not forced: a forced rebuild stamps the pivot's matrix as new, the camera's view matrix
        // follows it, and a scene asked every frame never reads as still, so it never freezes.
        return Vector3.TransformNormal(Vector3.Forward(), this.pivot.computeWorldMatrix()).normalize();
    }

    /**
     * How far along the line of sight a point is from the {@link surfacePlane}. Edge on, the line
     * of sight meets the plane too far away to move to.
     * @param point - The point, in world space.
     * @returns The distance, signed; 0 with no plane, or edge on.
     */
    #alongToPlane(point: Vector3): number {
        if (this.surfacePlane === null) {
            return 0;
        }

        const facing = this.#forward().z;
        return Math.abs(facing) < MIN_PLANE_FACING ? 0 : -point.z / facing;
    }

    /**
     * Where the line of sight through a point meets the {@link surfacePlane}. Its z is exactly 0,
     * not the last bits of a tilted view's sum: a glide ends when the pivot equals its target.
     * @param point - The point, in world space.
     * @returns The place on the plane, or the point itself with no plane, or edge on.
     */
    #onPlane(point: Vector3): Vector3 {
        const along = this.#alongToPlane(point);
        if (along === 0) {
            return point;
        }

        const place = point.add(this.#forward().scale(along));
        place.z = 0;
        return place;
    }

    /**
     * Slide the pivot along the line of sight onto the {@link surfacePlane}, the camera staying
     * where it is.
     */
    #settleOnPlane(): void {
        const along = this.#alongToPlane(this.pivot.position);
        if (along === 0) {
            return;
        }

        this.pivot.position.copyFrom(this.#onPlane(this.pivot.position));
        this.pivot.computeWorldMatrix(true);
        this.cameraDistance = this.clampDistance(this.cameraDistance + along);
    }

    /**
     * Slide the pivot along the line from the camera through it to where it passes nearest a point,
     * the camera staying where it is, so the view does not move. Framed on a globe's data, the pivot
     * sat among the arcs above the surface and the camera stopped short of the surface, at
     * `minZoomDistance` from the pivot; slid to near the globe's center, the camera comes down to
     * the surface floor along its line of sight, as it does from a whole-sphere framing.
     * @param point - The point, in world space.
     */
    public slidePivotNear(point: Vector3): void {
        // The camera stands at pivot - shifted * distance, where shifted carries the lens shift, so
        // moving the pivot by shifted * a and the distance by a leaves the camera where it is.
        const { tanX, tanY } = this.#halfFovTangents();
        const free = this.#freeArea();
        const world = this.pivot.computeWorldMatrix(true);
        const shifted = Vector3.TransformNormal(new Vector3(free.x * tanX, free.y * tanY, 1), world);
        const a = Vector3.Dot(point.subtract(this.pivot.position), shifted) / shifted.lengthSquared();
        this.pivot.position.addInPlace(shifted.scale(a));
        this.pivot.computeWorldMatrix(true);
        this.cameraDistance = this.clampDistance(this.cameraDistance + a);
        this.updateCameraPosition();
    }

    /**
     * Take new view insets without moving what is drawn. The lens shift follows the insets, so
     * the pivot moves by the change in the shift and the camera stays where it is; the next fit
     * centers the graph on the new free area.
     * ponytail: until that fit the graph turns about a point off its center by up to half the
     * inset change; re-center the pivot on the next turn if that ever reads as wrong.
     * @param insets - CSS pixels per side.
     */
    public setViewInsets(insets: ViewInsets): void {
        const before = this.camera.position.clone();
        this.viewInsets = insets;
        this.updateCameraPosition();
        const moved = before.subtract(this.camera.position);
        this.pivot.position.addInPlace(Vector3.TransformNormal(moved, this.pivot.computeWorldMatrix(true)));
        this.pivot.computeWorldMatrix(true);
    }

    /**
     * Stand where another orbit camera stands.
     * @param from - The camera.
     */
    public takeView(from: OrbitCameraController): void {
        this.pivot.position.copyFrom(from.pivot.position);
        this.pivot.rotationQuaternion = from.pivot.rotationQuaternion?.clone() ?? null;
        this.cameraDistance = from.cameraDistance;
        this.pivot.computeWorldMatrix(true);
        this.updateCameraPosition();
    }

    /**
     * Called when the canvas resizes: the shift that centers the free area depends on its aspect.
     */
    public onResize(): void {
        this.updateCameraPosition();
    }

    /**
     * The part of the canvas the view insets leave free.
     * @returns The free area in normalized device coordinates.
     */
    #freeArea(): FreeArea {
        const { clientWidth, clientHeight } = this.#canvas;
        return freeArea(framingInsets(this.viewInsets, this.fitInsets), clientWidth, clientHeight);
    }

    /**
     * The part of the canvas a fit fills: the free area less the fit padding.
     * @returns The area in normalized device coordinates.
     */
    #fitArea(): FreeArea {
        const { clientWidth, clientHeight } = this.#canvas;
        return paddedArea(this.#freeArea(), this.fitPadding, clientWidth, clientHeight);
    }

    /**
     * The tangents of half the horizontal and the vertical field of view.
     * @returns Both tangents.
     */
    #halfFovTangents(): { tanX: number; tanY: number } {
        const engine = this.scene.getEngine();
        const aspectRatio = engine.getRenderWidth() / engine.getRenderHeight() || 1;

        let verticalFov = 0.8; // default ~45.8 degrees
        if (this.camera.fovMode === Camera.FOVMODE_VERTICAL_FIXED) {
            verticalFov = this.camera.fov;
        } else if (this.camera.fovMode === Camera.FOVMODE_HORIZONTAL_FIXED && this.camera.fov) {
            // Convert horizontal to vertical
            verticalFov = 2 * Math.atan(Math.tan(this.camera.fov / 2) / aspectRatio);
        }

        const tanY = Math.tan(verticalFov / 2);
        return { tanX: tanY * aspectRatio, tanY };
    }

    /**
     * Frame a sphere so it fills the free area's shorter side: the camera stands where the sphere's
     * outline touches the view's edges, `radius / sin(half the field of view)` from its center.
     * A box around the sphere would leave it about a quarter smaller: the box's near corners stand
     * in front of the sphere and out to the side of it.
     * @param center - The sphere's center, in world space.
     * @param radius - Its radius.
     */
    public zoomToSphere(center: Vector3, radius: number): void {
        this.#sceneRadius = radius;
        this.pivot.position.copyFrom(center);
        this.pivot.computeWorldMatrix(true);
        this.scene.getEngine().resize();
        const { tanX, tanY } = this.#halfFovTangents();
        const free = this.#fitArea();
        const tan = Math.min(tanX * free.width, tanY * free.height);
        this.cameraDistance = this.clampDistance(sphereFitDistance(radius, tan));
        this.updateCameraPosition();
    }

    /**
     * Zoom the camera to fit a bounding box in view.
     * Positions the pivot at the center and adjusts camera distance.
     * @param min - The minimum corner of the bounding box
     * @param max - The maximum corner of the bounding box
     * @param spots - What the box holds; with `fitBounds` "turning", what is fitted.
     */
    public zoomToBoundingBox(min: Vector3, max: Vector3, spots?: readonly FramingSpot[]): void {
        const center = min.add(max).scale(0.5);
        const size = max.subtract(min);
        const turning = this.fitBounds === "turning" && spots !== undefined && spots.length > 0;

        this.#sceneRadius = size.length() / 2;

        // Position pivot at center of bounding box
        this.pivot.position.copyFrom(center);
        this.pivot.computeWorldMatrix(true);

        const engine = this.scene.getEngine();
        engine.resize(); // Ensure we have current dimensions
        const { tanX, tanY } = this.#halfFovTangents();
        const free = this.#fitArea();

        // For 3D scenes, we need to account for perspective projection.
        // Objects at different Z depths will project differently on screen.
        // The camera is positioned at (0, 0, -distance) relative to pivot,
        // so objects closer to the camera (negative Z relative to center) appear larger.
        //
        // To properly fit all 8 corners of the bounding box, we need to find
        // the minimum distance that ensures all corners project within the viewport.
        //
        // For a point at (x, y, z) relative to center, when viewed from distance d:
        // - The point is at depth (d - z) from the camera
        // - It projects to screen_x = x * focal / (d - z)
        // - It projects to screen_y = y * focal / (d - z)
        //
        // To fit within FOV: |screen_x| < tan(fovX/2) * (d - z), etc.
        //
        // With view insets the box must fit the free area instead: half as wide as the free share
        // (`free.width` in NDC) and centered on it. The camera is shifted so the center lands
        // there, and a corner at depth z then sits (x / tanX - free.x * z) / (d + z) from that
        // center, so d >= |x / tanX - free.x * z| / free.width - z. No insets gives the old rule.

        const halfWidth = size.x / 2;
        const halfHeight = size.y / 2;
        const halfDepth = size.z / 2;

        let maxRequiredDistance = 0;

        if (turning) {
            maxRequiredDistance = turningFitDistance(center, spots, tanX * free.width, tanY * free.height);
        }

        for (const sx of turning ? [] : [-1, 1]) {
            for (const sy of [-1, 1]) {
                for (const sz of [-1, 1]) {
                    const x = sx * halfWidth;
                    const y = sy * halfHeight;
                    const z = sz * halfDepth;

                    const distanceForX = Math.abs(x / tanX - free.x * z) / free.width - z;
                    const distanceForY = Math.abs(y / tanY - free.y * z) / free.height - z;

                    maxRequiredDistance = Math.max(maxRequiredDistance, distanceForX, distanceForY);
                }
            }
        }

        // Apply a reasonable padding factor
        // Since we already include labels in the bounding box, we only need
        // a small padding for visual comfort and edge arrows
        // The turning fit is already met only at the worst angle, so it gets no more room.
        const PADDING_PERCENT = turning || this.fitPadding !== undefined ? 0 : 5;
        const targetDistance = maxRequiredDistance * (1 + PADDING_PERCENT / 100);

        // Only the floor applies: a fit that the configured ceiling cut short would put the
        // camera inside the graph. The ceiling stays a zoom-out limit, not a framing limit.
        this.cameraDistance = this.clampDistance(targetDistance);

        // Apply the new camera position immediately
        this.updateCameraPosition();
    }
}
