import type { Scene } from "@babylonjs/core";

import type { XRConfig } from "../config/XRConfig";
import type { MeshCache } from "../meshes/MeshCache";
import type { Styles } from "../Styles";
import type { XRSessionManager } from "../xr/XRSessionManager";
import type { DataManager } from "./DataManager";
import type { EventManager } from "./EventManager";
import type { LayoutManager } from "./LayoutManager";
import type { SelectionManager } from "./SelectionManager";
import type { StatsManager } from "./StatsManager";
import type { StylePainter } from "./StylePainter";

/**
 * GraphContext provides controlled access to graph services
 * This interface allows Node and Edge classes to access required services
 * without direct dependency on the Graph class, eliminating circular dependencies
 */
export interface GraphContext {
    /**
     * Get the style layer stack and the element's configuration document.
     */
    getStyles(): Styles;

    /**
     * Get the painter that answers what the session's style stack resolved for one element.
     *
     * Absent, or present and not owning, means the legacy stack paints this graph. Node and Edge
     * ask it first and fall back to their style id, which is what keeps exactly one of the two
     * systems writing an element's style -- see StylePainter for the rule it answers.
     */
    getStylePainter?(): StylePainter | undefined;

    /**
     * Get the DataManager for node/edge operations
     */
    getDataManager(): DataManager;

    /**
     * Get the LayoutManager for layout operations
     */
    getLayoutManager(): LayoutManager;

    /**
     * Get the MeshCache for mesh creation and caching
     */
    getMeshCache(): MeshCache;

    /**
     * Get the Babylon.js Scene
     */
    getScene(): Scene;

    /**
     * Get the StatsManager for performance monitoring
     */
    getStatsManager(): StatsManager;

    /**
     * Check if the graph is in 2D mode
     */
    is2D(): boolean;

    /**
     * Check if ray updates are needed (for edge arrows)
     */
    needsRayUpdate(): boolean;

    /**
     * Get graph-level configuration options
     */
    getConfig(): GraphContextConfig;

    /**
     * Check if the layout is running
     */
    isRunning(): boolean;

    /**
     * Set the running state
     */
    setRunning(running: boolean): void;

    /**
     * Get XR configuration
     * Optional method for XR-specific functionality
     */
    getXRConfig?(): XRConfig | undefined;

    /**
     * Get XR session manager
     * Optional method for XR-specific functionality
     */
    getXRSessionManager?(): XRSessionManager | undefined;

    /**
     * Get SelectionManager for node selection operations
     * Optional method for selection functionality
     */
    getSelectionManager?(): SelectionManager | undefined;

    /**
     * Get EventManager for emitting events
     * Optional method for event emission
     * @since 1.5.0
     */
    getEventManager?(): EventManager | undefined;
}

/**
 * Configuration options accessible through GraphContext
 */
export interface GraphContextConfig {
    /**
     * Whether to pin nodes when dragged
     */
    pinOnDrag?: boolean;

    /**
     * Enable detailed performance profiling
     * Adds hierarchical timing and advanced statistics
     * Default: false (use existing StatsManager only)
     */
    enableDetailedProfiling?: boolean;

    /**
     * XR (VR/AR) configuration
     */
    xr?: XRConfig;

    /**
     * Other graph-level configuration options can be added here
     */
}

/**
 * Default implementation of GraphContext
 * This can be used by Graph to provide services to Node/Edge
 */
export class DefaultGraphContext implements GraphContext {
    /**
     * Creates an instance of DefaultGraphContext
     * @param styles - Reads the current style stack. A function rather than the instance, because
     *     loading a style template REPLACES it and a captured one would answer for the template
     *     that was in force when the context was built.
     * @param dataManager - DataManager instance for node/edge operations
     * @param layoutManager - LayoutManager instance for layout operations
     * @param meshCache - MeshCache instance for mesh creation and caching
     * @param scene - Babylon.js Scene instance
     * @param statsManager - StatsManager instance for performance monitoring
     * @param config - Graph-level configuration options
     * @param rayUpdateNeeded - Whether ray updates are needed for edge arrows
     * @param stylePainter - Painter answering what the session's style stack resolved, when one
     *     is bound
     */
    constructor(
        private styles: () => Styles,
        private dataManager: DataManager,
        private layoutManager: LayoutManager,
        private meshCache: MeshCache,
        private scene: Scene,
        private statsManager: StatsManager,
        private config: GraphContextConfig,
        private rayUpdateNeeded = true,
        private stylePainter?: StylePainter,
    ) {}

    /**
     * Get the painter that answers what the session's style stack resolved for one element.
     * @returns The painter, or undefined when this context was built without one.
     */
    getStylePainter(): StylePainter | undefined {
        return this.stylePainter;
    }

    /**
     * Get the style layer stack and the element's configuration document.
     * @returns The stack as it stands now.
     */
    getStyles(): Styles {
        return this.styles();
    }

    /**
     * Get the DataManager for node/edge operations
     * @returns DataManager instance
     */
    getDataManager(): DataManager {
        return this.dataManager;
    }

    /**
     * Get the LayoutManager for layout operations
     * @returns LayoutManager instance
     */
    getLayoutManager(): LayoutManager {
        return this.layoutManager;
    }

    /**
     * Get the MeshCache for mesh creation and caching
     * @returns MeshCache instance
     */
    getMeshCache(): MeshCache {
        return this.meshCache;
    }

    /**
     * Get the Babylon.js Scene
     * @returns Scene instance
     */
    getScene(): Scene {
        return this.scene;
    }

    /**
     * Get the StatsManager for performance monitoring
     * @returns StatsManager instance
     */
    getStatsManager(): StatsManager {
        return this.statsManager;
    }

    /**
     * Check if the graph is in 2D mode
     * @returns True if in 2D mode, false otherwise
     */
    is2D(): boolean {
        const config = this.styles().config.graph;
        // Support both new viewMode and deprecated twoD for backward compatibility
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        return config.viewMode === "2d" || config.twoD;
    }

    /**
     * Check if ray updates are needed for edge arrows
     * @returns True if ray updates are needed, false otherwise
     */
    needsRayUpdate(): boolean {
        return this.rayUpdateNeeded;
    }

    /**
     * Set whether ray updates are needed for edge arrows
     * @param needed - Whether ray updates are needed
     */
    setRayUpdateNeeded(needed: boolean): void {
        this.rayUpdateNeeded = needed;
    }

    /**
     * Get graph-level configuration options
     * @returns GraphContextConfig instance
     */
    getConfig(): GraphContextConfig {
        return this.config;
    }

    /**
     * Update configuration
     * @param config - Partial configuration to merge with existing config
     */
    updateConfig(config: Partial<GraphContextConfig>): void {
        Object.assign(this.config, config);
    }

    /**
     * Check if the layout is running
     * @returns True if layout is running, false otherwise
     */
    isRunning(): boolean {
        return this.layoutManager.running;
    }

    /**
     * Set the running state
     * @param running - Whether layout should be running
     */
    setRunning(running: boolean): void {
        this.layoutManager.running = running;
    }
}
