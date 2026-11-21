// Small 3D vector helpers for camera math in the clips: points as { x, y, z }.
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const mul = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const len = (a) => Math.hypot(a.x, a.y, a.z);
export const unit = (a) => mul(a, 1 / (len(a) || 1));
export const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
