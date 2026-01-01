declare module "@graphty/graphty-element" {
    // Graphty is the LitElement-based web component class
    /**
     *
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

    global {
        interface HTMLElementTagNameMap {
            "graphty-element": GraphtyElement;
        }
    }
}
