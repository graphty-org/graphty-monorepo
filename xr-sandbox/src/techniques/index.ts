// The registry: every technique, in the priority order of the input map (design section 5.8).

import type { Technique } from "../framework/technique";
import { technique as densePicking } from "./dense-picking";
import { technique as example } from "./example";
import { technique as figmaMenus } from "./figma-menus";
import { technique as gestures } from "./gestures";
import { technique as handling } from "./handling";
import { technique as hoverTag } from "./hover-tag";
import { technique as nodeMenus } from "./node-menus";
import { technique as palette } from "./palette";
import { technique as physicalTools } from "./physical-tools";
import { technique as pullToGrow } from "./pull-to-grow";
import { technique as textEntry } from "./text-entry";
import { technique as visibleUndo } from "./visible-undo";
import { technique as voice } from "./voice";
import { technique as wristMenu } from "./wrist-menu";

export const TECHNIQUES: readonly Technique[] = [
    physicalTools,
    densePicking,
    voice,
    palette,
    pullToGrow,
    nodeMenus,
    handling,
    gestures,
    example,
    hoverTag,
    wristMenu,
    figmaMenus,
    visibleUndo,
    textEntry,
];
