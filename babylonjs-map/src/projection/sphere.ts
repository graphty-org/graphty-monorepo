import type { Handedness, LatLon, XYZ } from "./types.js";

const DEG = Math.PI / 180;

/**
 * Where a point sits on a globe centered on the origin: north pole on +y, longitude 0 facing a
 * camera that looks at the origin from the default side (-z in a left-handed scene, +z in a
 * right-handed one), east to that camera's right.
 * @param point - The point in degrees.
 * @param radius - The globe's radius in scene units.
 * @param handedness - The scene's handedness (`scene.useRightHandedSystem` true is `right`). Default `left`.
 * @returns The scene position.
 */
export function latLonToSphere(point: LatLon, radius: number, handedness: Handedness = "left"): XYZ {
    const lat = point.lat * DEG;
    const lon = point.lon * DEG;
    const ring = radius * Math.cos(lat);
    const z = ring * Math.cos(lon);
    return { x: ring * Math.sin(lon), y: radius * Math.sin(lat), z: handedness === "left" ? -z : z };
}

/**
 * The point under a scene position on a globe centered on the origin (the inverse of
 * {@link latLonToSphere}); any distance from the center works.
 * @param position - The scene position.
 * @param handedness - The scene's handedness. Default `left`.
 * @returns The point in degrees; the origin itself returns latitude 0, longitude 0.
 */
export function sphereToLatLon(position: XYZ, handedness: Handedness = "left"): LatLon {
    const z = handedness === "left" ? -position.z : position.z;
    const ring = Math.hypot(position.x, z);
    return { lat: Math.atan2(position.y, ring) / DEG, lon: Math.atan2(position.x, z) / DEG };
}

/**
 * Where a ray first meets a sphere centered on the origin, for picking a point on a globe (a
 * drag that keeps the grabbed place under the pointer). Works in any handedness: it is plain
 * geometry in the globe's own space.
 * @param origin - Where the ray starts.
 * @param direction - Its direction; any length but zero.
 * @param radius - The sphere's radius.
 * @returns The nearest hit in front of the origin, or null when the ray misses.
 */
export function raySphere(origin: XYZ, direction: XYZ, radius: number): XYZ | null {
    const a = direction.x ** 2 + direction.y ** 2 + direction.z ** 2;
    const b = 2 * (origin.x * direction.x + origin.y * direction.y + origin.z * direction.z);
    const c = origin.x ** 2 + origin.y ** 2 + origin.z ** 2 - radius * radius;
    const disc = b * b - 4 * a * c;
    if (a === 0 || disc < 0) {
        return null;
    }
    const root = Math.sqrt(disc);
    const near = (-b - root) / (2 * a);
    const t = near >= 0 ? near : (-b + root) / (2 * a);
    if (t < 0) {
        return null;
    }
    return { x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: origin.z + direction.z * t };
}
