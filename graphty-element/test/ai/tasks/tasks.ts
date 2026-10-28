/**
 * @file Every task of the behavior suite, in workflow order.
 */

import { CENTRALITY_TASKS, COMMUNITY_TASKS, PATH_TASKS } from "./analysis.tasks";
import { EXPLORE_TASKS } from "./explore.tasks";
import { FIRST_LOOK_TASKS } from "./first-look.tasks";
import type { AssistantTask } from "./kit";
import { SAFETY_TASKS, STYLE_TASKS } from "./style-and-safety.tasks";
import { BIOLOGY_TASKS, COMMUNICATION_TASKS, INVESTIGATION_TASKS } from "./work.tasks";

export const TASKS: readonly AssistantTask[] = [
    ...FIRST_LOOK_TASKS,
    ...EXPLORE_TASKS,
    ...COMMUNITY_TASKS,
    ...PATH_TASKS,
    ...CENTRALITY_TASKS,
    ...INVESTIGATION_TASKS,
    ...BIOLOGY_TASKS,
    ...COMMUNICATION_TASKS,
    ...STYLE_TASKS,
    ...SAFETY_TASKS,
];
