import type React from "react";

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "graphty-element": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                "layout"?: string;
                "layout2d"?: boolean;
                "node-data"?: string;
                "edge-data"?: string;
                "algorithms"?: string;
                "style-template"?: string;
            };
        }
    }
}

export {};
