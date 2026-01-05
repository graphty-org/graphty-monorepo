declare module "@graphty/graphty-element" {
    /**
     * Graphty is the LitElement-based web component class for graph visualization.
     */
    export class Graphty extends HTMLElement {}

    export interface GraphtyElementAttributes {
        layout?: string;
        layout2d?: boolean;
        "layout-config"?: string;
        "node-data"?: string;
        "edge-data"?: string;
        "data-source"?: string;
        algorithms?: string;
        "run-algorithms-on-load"?: boolean;
        "style-template"?: string;
        "node-path-styles"?: string;
        "edge-path-styles"?: string;
        width?: number;
        height?: number;
    }

    export interface GraphtyElement extends HTMLElement {
        layout: string;
        layout2d: boolean;
        layoutConfig: Record<string, unknown>;
        nodeData: unknown[];
        edgeData: unknown[];
        dataSource: string;
        algorithms: string[];
        runAlgorithmsOnLoad: boolean;
        styleTemplate: string;
        nodePathStyles: string;
        edgePathStyles: string;
        width: number;
        height: number;
    }

    // Algorithm types
    export interface OptionsSchema {
        [key: string]: OptionDefinition;
    }

    export interface OptionDefinition {
        schema: unknown;
        meta: {
            label: string;
            description: string;
            advanced?: boolean;
            group?: string;
            step?: number;
        };
    }

    export interface AlgorithmClass {
        namespace: string;
        type: string;
        getZodOptionsSchema(): OptionsSchema;
        hasZodOptions(): boolean;
        hasSuggestedStyles(): boolean;
    }

    export const Algorithm: {
        getClass(namespace: string, type: string): AlgorithmClass | null;
        register(algoClass: AlgorithmClass): void;
    };

    global {
        interface HTMLElementTagNameMap {
            "graphty-element": GraphtyElement;
        }
    }
}
