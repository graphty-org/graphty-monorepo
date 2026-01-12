/**
 * Three.js visualization utilities for 3D layout stories.
 * Provides consistent 3D graph rendering and animation support.
 */

import type { PositionMap } from "@graphty/layout";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { GeneratedGraph, GraphEdge, GraphNode } from "./graph-generators.js";

/**
 * Color palette for consistent 3D styling.
 */
const COLORS_3D = {
    background: 0x0a0a1a,
    node: 0x6366f1,
    nodeHighlight: 0x22c55e,
    edge: 0x4444ff,
    edgeHighlight: 0x22c55e,
    ambient: 0xffffff,
    directional: 0xffffff,
} as const;

/**
 * 3D scene context containing all Three.js objects.
 */
interface Scene3D {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    nodeGroup: THREE.Group;
    edgeGroup: THREE.Group;
    container: HTMLDivElement;
    animationId: number | null;
}

/**
 * Create a Three.js scene with camera, renderer, and controls.
 * Fixed camera angle for deterministic Chromatic snapshots.
 */
export function create3DScene(
    width: number = 500,
    height: number = 500,
    enableControls: boolean = true,
): Scene3D {
    // Create container
    const container = document.createElement("div");
    container.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        position: relative;
        background: #0a0a1a;
        border-radius: 8px;
        overflow: hidden;
    `;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS_3D.background);

    // Camera setup - fixed position for deterministic snapshots
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    camera.position.set(400, 300, 500);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(COLORS_3D.ambient, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(COLORS_3D.directional, 0.4);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Controls - disabled damping for deterministic snapshots
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enabled = enableControls;

    // Groups for nodes and edges
    const nodeGroup = new THREE.Group();
    const edgeGroup = new THREE.Group();
    scene.add(nodeGroup);
    scene.add(edgeGroup);

    return {
        scene,
        camera,
        renderer,
        controls,
        nodeGroup,
        edgeGroup,
        container,
        animationId: null,
    };
}

/**
 * Calculate the bounding box of 3D positions.
 */
function getPositionBounds3D(positions: PositionMap): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
} {
    const posValues = Object.values(positions);
    if (posValues.length === 0) {
        return { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const pos of posValues) {
        if (pos[0] < minX) minX = pos[0];
        if (pos[0] > maxX) maxX = pos[0];
        if (pos[1] < minY) minY = pos[1];
        if (pos[1] > maxY) maxY = pos[1];
        const z = pos[2] ?? 0;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
    }

    // Handle case where all positions are the same
    if (minX === maxX) {
        minX -= 0.5;
        maxX += 0.5;
    }
    if (minY === maxY) {
        minY -= 0.5;
        maxY += 0.5;
    }
    if (minZ === maxZ) {
        minZ -= 0.5;
        maxZ += 0.5;
    }

    return { minX, maxX, minY, maxY, minZ, maxZ };
}

/**
 * Normalize 3D positions to fit within a target radius.
 */
function normalizePositions3D(
    positions: PositionMap,
    targetRadius: number = 200,
): PositionMap {
    const bounds = getPositionBounds3D(positions);
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;
    const rangeZ = bounds.maxZ - bounds.minZ;
    const maxRange = Math.max(rangeX, rangeY, rangeZ);
    const scale = maxRange > 0 ? (2 * targetRadius) / maxRange : 1;

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;

    const normalized: PositionMap = {};
    for (const [nodeId, pos] of Object.entries(positions)) {
        const z = pos[2] ?? 0;
        normalized[nodeId] = [
            (pos[0] - centerX) * scale,
            (pos[1] - centerY) * scale,
            (z - centerZ) * scale,
        ];
    }

    return normalized;
}

/**
 * Render a 3D graph to a Three.js scene.
 */
export function render3DGraph(
    scene3D: Scene3D,
    graph: GeneratedGraph,
    positions: PositionMap,
    nodeRadius: number = 8,
    normalizeRadius: number = 200,
): void {
    // Clear existing
    scene3D.nodeGroup.clear();
    scene3D.edgeGroup.clear();

    // Normalize positions
    const normalizedPositions = normalizePositions3D(positions, normalizeRadius);

    // Create node geometry (shared)
    const nodeGeometry = new THREE.SphereGeometry(nodeRadius, 16, 16);

    // Create nodes
    const nodeMeshes: Map<number, THREE.Mesh> = new Map();
    for (let i = 0; i < graph.nodes.length; i++) {
        const node = graph.nodes[i];
        const pos = normalizedPositions[node.id];
        if (!pos) continue;

        // Color based on node index for variety
        const color = new THREE.Color();
        color.setHSL(i / graph.nodes.length, 0.7, 0.5);

        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
        });

        const mesh = new THREE.Mesh(nodeGeometry, material);
        mesh.position.set(pos[0], pos[1], pos[2] ?? 0);
        mesh.userData.nodeId = node.id;
        scene3D.nodeGroup.add(mesh);
        nodeMeshes.set(node.id, mesh);
    }

    // Create edges
    for (const edge of graph.edges) {
        const sourcePos = normalizedPositions[edge.source];
        const targetPos = normalizedPositions[edge.target];
        if (!sourcePos || !targetPos) continue;

        const points = [
            new THREE.Vector3(sourcePos[0], sourcePos[1], sourcePos[2] ?? 0),
            new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2] ?? 0),
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: COLORS_3D.edge,
            transparent: true,
            opacity: 0.6,
        });

        const line = new THREE.Line(geometry, material);
        line.userData.source = edge.source;
        line.userData.target = edge.target;
        scene3D.edgeGroup.add(line);
    }
}

/**
 * Update 3D node and edge positions with animation.
 */
export function update3DPositions(
    scene3D: Scene3D,
    graph: GeneratedGraph,
    targetPositions: PositionMap,
    normalizeRadius: number = 200,
    duration: number = 1000,
    onComplete?: () => void,
): void {
    const normalizedPositions = normalizePositions3D(targetPositions, normalizeRadius);

    // Store current positions
    const startPositions: Map<number, THREE.Vector3> = new Map();
    scene3D.nodeGroup.children.forEach((mesh) => {
        const nodeId = mesh.userData.nodeId as number;
        startPositions.set(nodeId, (mesh as THREE.Mesh).position.clone());
    });

    const startTime = performance.now();

    function animate(): void {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease in-out cubic
        const eased =
            progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        // Update node positions
        scene3D.nodeGroup.children.forEach((mesh) => {
            const nodeId = mesh.userData.nodeId as number;
            const startPos = startPositions.get(nodeId);
            const targetPos = normalizedPositions[nodeId];
            if (startPos && targetPos) {
                (mesh as THREE.Mesh).position.set(
                    startPos.x + (targetPos[0] - startPos.x) * eased,
                    startPos.y + (targetPos[1] - startPos.y) * eased,
                    startPos.z + ((targetPos[2] ?? 0) - startPos.z) * eased,
                );
            }
        });

        // Update edge positions
        scene3D.edgeGroup.children.forEach((line) => {
            const sourceId = line.userData.source as number;
            const targetId = line.userData.target as number;

            const sourceMesh = scene3D.nodeGroup.children.find(
                (m) => m.userData.nodeId === sourceId,
            ) as THREE.Mesh | undefined;
            const targetMesh = scene3D.nodeGroup.children.find(
                (m) => m.userData.nodeId === targetId,
            ) as THREE.Mesh | undefined;

            if (sourceMesh && targetMesh) {
                const geometry = (line as THREE.Line).geometry;
                const positions = geometry.attributes.position;
                positions.setXYZ(
                    0,
                    sourceMesh.position.x,
                    sourceMesh.position.y,
                    sourceMesh.position.z,
                );
                positions.setXYZ(
                    1,
                    targetMesh.position.x,
                    targetMesh.position.y,
                    targetMesh.position.z,
                );
                positions.needsUpdate = true;
            }
        });

        // Render
        scene3D.renderer.render(scene3D.scene, scene3D.camera);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            onComplete?.();
        }
    }

    animate();
}

/**
 * Start the animation loop for the 3D scene.
 */
export function startAnimationLoop(scene3D: Scene3D): void {
    function animate(): void {
        scene3D.animationId = requestAnimationFrame(animate);
        scene3D.controls.update();
        scene3D.renderer.render(scene3D.scene, scene3D.camera);
    }
    animate();
}

/**
 * Stop the animation loop and clean up resources.
 */
export function cleanup3DScene(scene3D: Scene3D): void {
    if (scene3D.animationId !== null) {
        cancelAnimationFrame(scene3D.animationId);
        scene3D.animationId = null;
    }

    // Dispose of geometries and materials
    scene3D.nodeGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (obj.material instanceof THREE.Material) {
                obj.material.dispose();
            }
        }
    });

    scene3D.edgeGroup.traverse((obj) => {
        if (obj instanceof THREE.Line) {
            obj.geometry.dispose();
            if (obj.material instanceof THREE.Material) {
                obj.material.dispose();
            }
        }
    });

    // Dispose of renderer
    scene3D.renderer.dispose();
    scene3D.renderer.domElement.remove();
}

/**
 * Create control buttons for 3D stories.
 */
export function create3DControls(
    onApply: () => void,
    onReset: () => void,
    applyLabel: string = "Apply Layout",
): HTMLDivElement {
    const container = document.createElement("div");
    container.style.cssText = `
        display: flex;
        gap: 8px;
        margin-top: 16px;
        justify-content: center;
    `;

    const buttonStyle = `
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
        transition: opacity 0.2s;
    `;

    const applyBtn = document.createElement("button");
    applyBtn.textContent = applyLabel;
    applyBtn.style.cssText = `${buttonStyle}background: #22c55e; color: white;`;
    applyBtn.onclick = onApply;

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";
    resetBtn.style.cssText = `${buttonStyle}background: #ef4444; color: white;`;
    resetBtn.onclick = onReset;

    container.appendChild(applyBtn);
    container.appendChild(resetBtn);

    return container;
}

/**
 * Create a status message panel for 3D stories.
 */
export function create3DStatusPanel(): HTMLDivElement {
    const panel = document.createElement("div");
    panel.style.cssText = `
        margin-top: 8px;
        padding: 8px 12px;
        background: #1e293b;
        border-radius: 4px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        color: #94a3b8;
        min-height: 24px;
    `;
    panel.setAttribute("data-status", "");
    panel.textContent = "Click 'Apply Layout' to see the 3D transformation";
    return panel;
}

/**
 * Update status message for 3D stories.
 */
export function update3DStatus(panel: HTMLDivElement, message: string): void {
    panel.textContent = message;
}

/**
 * Create info panel for 3D stories.
 */
export function create3DInfoPanel(title: string): HTMLDivElement {
    const panel = document.createElement("div");
    panel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #1e293b;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        max-width: 500px;
        width: 100%;
    `;
    panel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #f1f5f9;">${title}</div>
        <div data-info style="font-size: 12px; color: #94a3b8;"></div>
    `;
    return panel;
}

/**
 * Update info panel content for 3D stories.
 */
export function update3DInfoPanel(panel: HTMLDivElement, content: string): void {
    const infoEl = panel.querySelector("[data-info]");
    if (infoEl) {
        infoEl.textContent = content;
    }
}

/**
 * Create the main 3D story container.
 */
export function create3DStoryContainer(): HTMLDivElement {
    const container = document.createElement("div");
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px;
        font-family: system-ui, sans-serif;
        background: #0f172a;
        min-height: 100%;
    `;
    return container;
}
