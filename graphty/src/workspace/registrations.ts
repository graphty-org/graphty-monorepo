/**
 * Every package's registration, collected. Each package edits only its own `commands.ts`; this
 * list is the Frame's and names every package directory once.
 */

import { registration as analyze } from "./analyze/commands";
import { registration as canvas } from "./canvas/commands";
import type { WorkspaceRegistration } from "./commands/registry";
import { registration as dataPage } from "./data-page/commands";
import { registration as dataPlace } from "./data-place/commands";
import { registration as exportDialog } from "./export/commands";
import { registration as frame } from "./frame/commands";
import { registration as graphPlace } from "./graph-place/commands";
import { registration as inspector } from "./inspector/commands";
import { registration as layout } from "./layout/commands";
import { registration as privacy } from "./privacy/commands";
import { registration as project } from "./project/commands";
import { registration as settings } from "./settings/commands";
import { registration as start } from "./start/commands";
import { registration as style } from "./style/commands";
import { registration as table } from "./table/commands";
import { registration as toolbar } from "./toolbar/commands";

export const REGISTRATIONS: readonly WorkspaceRegistration[] = [
    frame,
    start,
    settings,
    privacy,
    canvas,
    toolbar,
    analyze,
    layout,
    graphPlace,
    dataPlace,
    inspector,
    style,
    table,
    exportDialog,
    dataPage,
    project,
];
