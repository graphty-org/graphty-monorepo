/**
 * Three.js visualization utilities for 3D layout stories.
 * Provides consistent 3D graph rendering and animation support.
 */

import type { SampleGraph } from "@graphty/graph-samples";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { figure, type Positions } from "./visualization.js";

/** The radius of the sphere every drawing is scaled to fit. */
const FIT_RADIUS = 300;

/**
 * Color palette for consistent 3D styling.
 */
const COLORS_3D = {
    background: 0x0a0a1a,
    node: 0x6366f1,
    edge: 0x4444ff,
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
}

/**
 * Create a Three.js scene with camera, renderer, and controls.
 * Fixed camera angle for deterministic visual snapshots.
 */
function create3DScene(width: number = 500, height: number = 500, enableControls: boolean = true): Scene3D {
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
    // Draw only when something changed: a frame loop that never stops queues a WebGL frame on
    // every animation frame, and where those are timer-driven (Playwright's clock in the visual
    // capture) faster than a software GPU draws them, the backlog starves screenshots (#2114).
    controls.addEventListener("change", () => {
        renderer.render(scene, camera);
    });

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
    };
}

/**
 * Draws the graph at the layout's 3D positions, scaled and centered to fit a sphere of
 * `FIT_RADIUS` around the origin, each node colored by its index.
 */
function render3DGraph(scene3D: Scene3D, graph: SampleGraph, result: Positions): void {
    const { positions, dim } = result;
    const n = graph.nodeCount;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
        for (let a = 0; a < 3; a++) {
            const v = a < dim ? positions[i * dim + a] : 0;
            min[a] = Math.min(min[a], v);
            max[a] = Math.max(max[a], v);
        }
    }
    const range = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
    const k = (2 * FIT_RADIUS) / range;
    const at = (i: number): THREE.Vector3 =>
        new THREE.Vector3(
            ...[0, 1, 2].map((a) => ((a < dim ? positions[i * dim + a] : 0) - (min[a] + max[a]) / 2) * k),
        );

    const nodeGeometry = new THREE.SphereGeometry(8, 16, 16);
    for (let i = 0; i < n; i++) {
        const color = new THREE.Color();
        color.setHSL(i / n, 0.7, 0.5);
        const mesh = new THREE.Mesh(
            nodeGeometry,
            new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.3 }),
        );
        mesh.position.copy(at(i));
        scene3D.nodeGroup.add(mesh);
    }
    for (let e = 0; e < graph.src.length; e++) {
        const geometry = new THREE.BufferGeometry().setFromPoints([at(graph.src[e]), at(graph.dst[e])]);
        const material = new THREE.LineBasicMaterial({ color: COLORS_3D.edge, transparent: true, opacity: 0.6 });
        scene3D.edgeGroup.add(new THREE.Line(geometry, material));
    }
    scene3D.renderer.render(scene3D.scene, scene3D.camera);
}

/**
 * Clean up the scene's controls and resources.
 */
function cleanup3DScene(scene3D: Scene3D): void {
    scene3D.controls.dispose();

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
 * A 3D story: draws the graph at the layout's 3D positions in a scene the reader can rotate (drag)
 * and zoom (scroll), inside the story frame. The scene is disposed when the story is unmounted.
 * @param graph - the graph
 * @param result - the layout's positions, `dim` 3
 * @param call - the layout call
 * @param caption - the caption
 * @returns the story's root element
 */
export function show3D(graph: SampleGraph, result: Positions, call: string, caption: string): HTMLElement {
    const scene3D = create3DScene(600, 600);
    scene3D.container.setAttribute("role", "img");
    scene3D.container.setAttribute("aria-label", `${call}: ${graph.nodeCount} nodes in 3D`);
    render3DGraph(scene3D, graph, result);
    const root = figure(call, scene3D.container, `${caption} Drag to rotate, scroll to zoom.`);

    // Dispose the WebGL context once Storybook removes the story
    const observer = new MutationObserver(() => {
        if (!root.isConnected) {
            cleanup3DScene(scene3D);
            observer.disconnect();
        }
    });
    setTimeout(() => observer.observe(document.body, { childList: true, subtree: true }), 0);
    return root;
}
