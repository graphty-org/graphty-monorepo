/**
 * @file Recipes: a session's analysis (filters, sets, runs, layout) and its style layers as one
 * file, applied to other data. `session.recipes`, behind the `save-files-v2` experiment; a thin
 * door onto `project.save` and `project.open`, which do the work.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type EnabledFeatures, featureOff } from "../../features/resolve";
import type { ProjectApi, ProjectOpenReport, ProjectSource, SavedProject } from "../projectFile";

/**
 * Recipes: `session.recipes`. Needs the `save-files-v2` experiment; without it each method
 * rejects with `E_FEATURE_OFF`.
 *
 * ```ts
 * const { text } = await first.recipes.export();
 * await second.data.import({ type: "csv", config: { data: otherCsv } });
 * await second.recipes.apply(text);
 * ```
 * @since 3.40.0
 * @experimental save-files-v2
 * @beta
 */
export interface RecipesApi {
    /**
     * The session's filters, sets, runs, layout and style layers as one recipe file: a graphty
     * document holding a recipe section and a style section, naming columns and never a node or
     * an edge. What names an element is left out and listed in `report.leftOut`.
     * @returns The file's text and its report.
     */
    export(): Promise<SavedProject>;
    /**
     * Apply a recipe to the data open now: its filters, sets, runs and layout in order, then its
     * style layers, as one undoable step. Reads a file `export` wrote, a recipe or style section
     * file, or a full file (only its recipe and style are applied); a version 1 file is migrated.
     * @param recipe - The file, its bytes or its text.
     * @returns What was applied and what could not be (`problems`).
     */
    apply(recipe: ProjectSource): Promise<ProjectOpenReport>;
}

/**
 * The session's recipes API.
 * @param project - The session's project API, which saves and opens.
 * @param features - The session's experiments, read at each call.
 * @returns The API.
 */
export function recipesOf(project: ProjectApi, features: () => EnabledFeatures): RecipesApi {
    const gate = (key: string): Promise<never> | undefined =>
        features().has("save-files-v2") ? undefined : Promise.reject(featureOff("save-files-v2", key));
    return Object.freeze<RecipesApi>({
        export() {
            return (
                gate("recipes.export") ??
                project.save({ format: 2, sections: ["recipe", "style"], rewriteRecipe: true, markSaved: false })
            );
        },
        apply(recipe) {
            return (
                gate("recipes.apply") ??
                project.open(recipe, { sections: ["recipe", "style"], applyRecipe: true, migrate: true })
            );
        },
    });
}
