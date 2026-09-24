import type { AccelerationPolicy } from "@graphty/graphty-element/session";
import type React from "react";

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "graphty-element": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                layout?: string;
                layout2d?: boolean;
                "node-data"?: string;
                "edge-data"?: string;
                algorithms?: string;
                "style-template"?: string;
                /* Written as a JSX prop rather than in an effect: React 19 assigns it before the
                   node is inserted, so the element's policy is in force before its
                   connectedCallback starts probing for an accelerator. */
                acceleration?: AccelerationPolicy;
            };
        }
    }
}

export {};
