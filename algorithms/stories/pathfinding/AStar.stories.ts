/**
 * A* Pathfinding Algorithm Stories
 *
 * Demonstrates A* pathfinding algorithm with step-by-step animation
 * showing path discovery with heuristic guidance.
 *
 * IMPORTANT: This story uses the actual astar implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { astar } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    type GeneratedGraph,
    generateGraph,
    type GraphType,
} from "../utils/graph-generators.js";
import {
    createAnimationControls,
    createStatusPanel,
    createStoryContainer,
    highlightEdge,
    highlightNode,
    renderGraph,
    resetHighlights,
    updateStatus,
} from "../utils/visualization.js";

/**
 * Story arguments interface.
 */
interface AStarArgs {
    nodeCount: number;
    graphType: GraphType;
    startNode: number;
    goalNode: number;
    animationSpeed: number;
    seed: number;
}

/**
 * Convert GeneratedGraph to adjacency Map for astar algorithm.
 */
function toAdjacencyMap(generatedGraph: GeneratedGraph): Map<number, Map<number, number>> {
    const adjacency = new Map<number, Map<number, number>>();

    for (const node of generatedGraph.nodes) {
        adjacency.set(node.id, new Map());
    }

    for (const edge of generatedGraph.edges) {
        adjacency.get(edge.source)?.set(edge.target, edge.weight ?? 1);
        adjacency.get(edge.target)?.set(edge.source, edge.weight ?? 1);
    }

    return adjacency;
}

/**
 * Animation step for A* visualization.
 */
interface AStarStep {
    type: "start" | "explore" | "expand" | "path" | "complete";
    nodeId?: number;
    source?: number;
    target?: number;
    fScore?: number;
    gScore?: number;
    description: string;
}

/**
 * Run A* and create animation steps.
 */
function runAStarAndCreateSteps(
    generatedGraph: GeneratedGraph,
    startNode: number,
    goalNode: number,
): AStarStep[] {
    const steps: AStarStep[] = [];
    const adjacency = toAdjacencyMap(generatedGraph);

    // Create heuristic function based on Euclidean distance
    const nodePositions = new Map<number, { x: number; y: number }>();
    for (const node of generatedGraph.nodes) {
        nodePositions.set(node.id, { x: node.x, y: node.y });
    }

    function heuristic(node: number, goal: number): number {
        const nodePos = nodePositions.get(node);
        const goalPos = nodePositions.get(goal);
        if (!nodePos || !goalPos) {
            return 0;
        }
        const dx = nodePos.x - goalPos.x;
        const dy = nodePos.y - goalPos.y;
        return Math.sqrt(dx * dx + dy * dy) / 50; // Scale down for reasonable weights
    }

    // Run actual A* algorithm
    const result = astar(adjacency, startNode, goalNode, heuristic);

    // Simulate A* for animation
    const openSet = new Set<number>([startNode]);
    const closedSet = new Set<number>();
    const gScore = new Map<number, number>();
    const fScore = new Map<number, number>();
    const cameFrom = new Map<number, number>();

    for (const node of generatedGraph.nodes) {
        gScore.set(node.id, Infinity);
        fScore.set(node.id, Infinity);
    }
    gScore.set(startNode, 0);
    fScore.set(startNode, heuristic(startNode, goalNode));

    steps.push({
        type: "start",
        nodeId: startNode,
        gScore: 0,
        fScore: fScore.get(startNode),
        description: `Start A* from node ${startNode} to goal ${goalNode}`,
    });

    while (openSet.size > 0) {
        // Find node with lowest fScore in open set
        let current = -1;
        let lowestF = Infinity;
        for (const node of openSet) {
            const f = fScore.get(node) ?? Infinity;
            if (f < lowestF) {
                lowestF = f;
                current = node;
            }
        }

        if (current === -1) {
            break;
        }

        steps.push({
            type: "expand",
            nodeId: current,
            gScore: gScore.get(current),
            fScore: fScore.get(current),
            description: `Expanding node ${current} (f=${lowestF.toFixed(1)})`,
        });

        if (current === goalNode) {
            break;
        }

        openSet.delete(current);
        closedSet.add(current);

        const neighbors = adjacency.get(current);
        if (!neighbors) {
            continue;
        }

        for (const [neighbor, weight] of neighbors) {
            if (closedSet.has(neighbor)) {
                continue;
            }

            const tentativeG = (gScore.get(current) ?? Infinity) + weight;

            steps.push({
                type: "explore",
                source: current,
                target: neighbor,
                gScore: tentativeG,
                fScore: tentativeG + heuristic(neighbor, goalNode),
                description: `Exploring edge ${current}→${neighbor} (g=${tentativeG.toFixed(1)}, h=${heuristic(neighbor, goalNode).toFixed(1)})`,
            });

            if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
                cameFrom.set(neighbor, current);
                gScore.set(neighbor, tentativeG);
                fScore.set(neighbor, tentativeG + heuristic(neighbor, goalNode));
                openSet.add(neighbor);
            }
        }
    }

    // Highlight the path if found
    if (result) {
        for (const nodeId of result.path) {
            steps.push({
                type: "path",
                nodeId: nodeId,
                description: `Path includes node ${nodeId}`,
            });
        }

        steps.push({
            type: "complete",
            description: `A* complete! Path found with cost ${result.cost.toFixed(1)}`,
        });
    } else {
        steps.push({
            type: "complete",
            description: `A* complete! No path found from ${startNode} to ${goalNode}`,
        });
    }

    return steps;
}

/**
 * Create the A* visualization story.
 */
function createAStarStory(args: AStarArgs): HTMLElement {
    const { nodeCount, graphType, startNode, goalNode, animationSpeed, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);

    // Validate nodes
    const validStartNode = Math.min(Math.max(startNode, 0), nodeCount - 1);
    const validGoalNode = Math.min(Math.max(goalNode, 0), nodeCount - 1);

    // Create animation steps
    const steps = runAStarAndCreateSteps(generatedGraph, validStartNode, validGoalNode);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph
    renderGraph(svg, generatedGraph);

    // Mark start and goal nodes with special styling
    const startCircle = svg.querySelector(`[data-node-id="${validStartNode}"]`);
    const goalCircle = svg.querySelector(`[data-node-id="${validGoalNode}"]`);
    if (startCircle) {
        startCircle.setAttribute("stroke", "#22c55e");
        startCircle.setAttribute("stroke-width", "4");
    }
    if (goalCircle) {
        goalCircle.setAttribute("stroke", "#ef4444");
        goalCircle.setAttribute("stroke-width", "4");
    }

    // Create info panel
    const infoPanel = document.createElement("div");
    infoPanel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
    `;
    infoPanel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">A* Pathfinding</div>
        <div style="display: flex; gap: 16px; margin-bottom: 8px;">
            <span style="color: #22c55e;">● Start: ${validStartNode}</span>
            <span style="color: #ef4444;">● Goal: ${validGoalNode}</span>
        </div>
        <div data-scores style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Ready to find path using A*");

    // Animation state
    let currentStep = 0;
    let isPlaying = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const nodeScores = new Map<number, { g: number; f: number }>();
    const pathNodes = new Set<number>();

    /**
     * Update scores display.
     */
    function updateScoresDisplay(): void {
        const scoresEl = infoPanel.querySelector("[data-scores]");
        if (!scoresEl) {
            return;
        }

        scoresEl.innerHTML = "";
        for (const node of generatedGraph.nodes) {
            const scores = nodeScores.get(node.id);
            const isPath = pathNodes.has(node.id);
            const badge = document.createElement("span");
            let bgColor = "#94a3b8";
            if (isPath) {
                bgColor = "#f59e0b";
            } else if (scores) {
                bgColor = "#6366f1";
            }
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 60px;
                padding: 4px 6px;
                background: ${bgColor};
                color: white;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
            `;
            if (scores) {
                badge.textContent = `${node.id}: f=${scores.f.toFixed(1)}`;
            } else {
                badge.textContent = `${node.id}: —`;
            }
            scoresEl.appendChild(badge);
        }
    }

    /**
     * Execute a single step.
     */
    function executeStep(): boolean {
        if (currentStep >= steps.length) {
            return false;
        }

        const step = steps[currentStep];

        switch (step.type) {
            case "start":
                if (step.nodeId !== undefined && step.gScore !== undefined && step.fScore !== undefined) {
                    highlightNode(svg, step.nodeId, "current");
                    nodeScores.set(step.nodeId, { g: step.gScore, f: step.fScore });
                    updateScoresDisplay();
                }
                break;

            case "explore":
                if (step.source !== undefined && step.target !== undefined) {
                    highlightEdge(svg, step.source, step.target, "current");
                    highlightNode(svg, step.target, "queued");
                    if (step.gScore !== undefined && step.fScore !== undefined) {
                        nodeScores.set(step.target, { g: step.gScore, f: step.fScore });
                        updateScoresDisplay();
                    }
                }
                break;

            case "expand":
                if (step.nodeId !== undefined) {
                    highlightNode(svg, step.nodeId, "visited");
                }
                break;

            case "path":
                if (step.nodeId !== undefined) {
                    pathNodes.add(step.nodeId);
                    highlightNode(svg, step.nodeId, "current");
                    updateScoresDisplay();
                }
                break;

            case "complete":
                break;

            default:
                break;
        }

        updateStatus(statusPanel, step.description);
        currentStep++;
        return currentStep < steps.length;
    }

    /**
     * Play animation continuously.
     */
    function play(): void {
        if (isPlaying) {
            return;
        }
        isPlaying = true;

        function tick(): void {
            if (!isPlaying) {
                return;
            }

            const hasMore = executeStep();
            if (hasMore) {
                timeoutId = setTimeout(tick, animationSpeed);
            } else {
                isPlaying = false;
            }
        }

        tick();
    }

    /**
     * Pause animation.
     */
    function pause(): void {
        isPlaying = false;
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }

    /**
     * Reset animation.
     */
    function reset(): void {
        pause();
        currentStep = 0;
        nodeScores.clear();
        pathNodes.clear();
        resetHighlights(svg);

        // Restore start/goal styling
        const startCircleReset = svg.querySelector(`[data-node-id="${validStartNode}"]`);
        const goalCircleReset = svg.querySelector(`[data-node-id="${validGoalNode}"]`);
        if (startCircleReset) {
            startCircleReset.setAttribute("stroke", "#22c55e");
            startCircleReset.setAttribute("stroke-width", "4");
        }
        if (goalCircleReset) {
            goalCircleReset.setAttribute("stroke", "#ef4444");
            goalCircleReset.setAttribute("stroke-width", "4");
        }

        updateScoresDisplay();
        updateStatus(statusPanel, "Ready to find path using A*");
    }

    // Initialize display
    updateScoresDisplay();

    // Add controls
    const controls = createAnimationControls(play, pause, executeStep, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<AStarArgs> = {
    title: "Pathfinding",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 12, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["random", "grid", "tree"] as GraphType[],
            description: "Type of graph to generate",
        },
        startNode: {
            control: { type: "number", min: 0 },
            description: "Starting node",
        },
        goalNode: {
            control: { type: "number", min: 0 },
            description: "Goal node",
        },
        animationSpeed: {
            control: { type: "range", min: 100, max: 2000, step: 100 },
            description: "Animation speed in milliseconds",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 8,
        graphType: "grid",
        startNode: 0,
        goalNode: 7,
        animationSpeed: 500,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<AStarArgs>;

/**
 * A* pathfinding algorithm story with step-by-step animation.
 *
 * This story uses the actual `astar()` function from @graphty/algorithms.
 * Watch as A* uses heuristics to efficiently find the shortest path.
 */
export const AStar: Story = {
    render: (args) => createAStarStory(args),
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);

        // Click play button to start animation
        const playButton = canvas.getByRole("button", { name: /play/i });
        await userEvent.click(playButton);

        // Wait for animation to complete
        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("complete");
            },
            { timeout: (args.nodeCount * 5 + 10) * args.animationSpeed },
        );
    },
};
