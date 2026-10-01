import type { Graphty } from "@graphty/graphty-element";
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
                /* How the element drives its layout and draws its labels; the view half of it
                   (label declutter) records no undo step. */
                layoutBehavior?: Graphty["layoutBehavior"];
            };
        }
    }
}

export {};
