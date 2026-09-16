import onChange from "on-change";
import * as z4 from "zod/v4/core";

import { CalculatedValue } from "./CalculatedValue";
import { AdHocData } from "./config";

/**
 * Manages reactive data changes and calculated values.
 */
export class ChangeManager {
    readonly watchedInputs = new Map<string, Set<CalculatedValue>>();
    readonly dataObjects: Record<string, AdHocData | undefined> = {};
    readonly calculatedValues = new Set<CalculatedValue>();
    readonly schemas: Record<string, z4.$ZodType | undefined> = {};

    /**
     * Creates a reactive proxy for data that triggers calculated values on changes.
     * @param dataType - Type identifier for the data
     * @param data - Data object to watch for changes
     * @param schema - Optional Zod schema for validation
     * @returns Proxied data object that triggers calculated values on changes
     */
    watch(dataType: string, data: AdHocData, schema?: z4.$ZodType): AdHocData {
        const watchedData = onChange(data, (path, value, prevVal /* applyData */) => {
            // ignore all the intermediate steps of setting a new deep path on
            // an object
            if (
                typeof value === "object" &&
                value !== null &&
                Object.keys(value).length === 0 &&
                prevVal === undefined
            ) {
                return;
            }

            // see if this data change triggers calculated values,
            // and run the calculated values if it does
            const cvs = this.watchedInputs.get(`${dataType}.${path}`);
            if (cvs) {
                // Run ALL calculated values watching this input path
                for (const cv of cvs) {
                    // find schema for validation, if it exists
                    const s = getSchema(this.schemas, cv.output);
                    cv.run(this.dataObjects as unknown as AdHocData, s);
                }
            }
        });

        // TODO: Consider whether schema should be passed here or obtained from local context
        return this.addData(dataType, watchedData, schema);
    }

    /**
     * Registers a data object with the change manager.
     * @param dataType - Type identifier for the data
     * @param data - Data object to register
     * @param schema - Optional Zod schema for validation
     * @returns The registered data object
     */
    addData(dataType: string, data: AdHocData, schema?: z4.$ZodType): AdHocData {
        if (this.dataObjects[dataType] !== undefined) {
            throw new TypeError(`data type: ${dataType} already exists in change manager`);
        }

        this.dataObjects[dataType] = data;
        if (schema) {
            this.schemas[dataType] = schema;
        }

        return data;
    }

    /**
     * Registers a calculated value to watch for input changes.
     * @param cv - Calculated value to register
     */
    addCalculatedValue(cv: CalculatedValue): void {
        this.calculatedValues.add(cv);

        // Add this calculated value to the set of CVs watching each input
        cv.inputs.forEach((i) => {
            let cvSet = this.watchedInputs.get(i);
            if (!cvSet) {
                cvSet = new Set<CalculatedValue>();
                this.watchedInputs.set(i, cvSet);
            }

            cvSet.add(cv);
        });
    }

    /**
     * Registers multiple calculated values at once.
     * @param cvs - Array of calculated values to register
     */
    addCalculatedValues(cvs: CalculatedValue[]): void {
        cvs.forEach((cv) => {
            this.addCalculatedValue(cv);
        });
    }

    /**
     * Loads the calculated values the CURRENT style layers ask for, replacing whatever was
     * loaded before, and optionally running all of them once immediately.
     *
     * Both collections are cleared here, not only `watchedInputs`. That is the whole point of
     * the method: "load" means load, not accumulate.
     *
     * THE DEFECT THIS FIXES. `calculatedValues` used to survive this call, so a style layer the
     * user had REMOVED kept painting for the life of the loaded graph. The chain:
     * `DataManager.applyStylesToExistingNodes` installs the new layer's static style through
     * `Node.updateStyle`, then calls this method, then calls `Node.update`. Every CalculatedValue
     * still sitting in the set was re-run by `runAllCalculatedValues`, and `CalculatedValue.run`
     * ends in an unconditional `deepSet` into the node's `styleUpdates`. `Node.update` then merges
     * with `_.defaultsDeep(plainStyleUpdates, style)` (Node.ts:150-151), and lodash's FIRST
     * argument wins -- so the dead layer's calculated output beat the live layer's static style on
     * the SAME repaint, not merely the next one. Concretely: run "Most connected" (a viridis ramp
     * over `algorithmResults.graphty.degree.degreePct`), then run "Groups". Removing the metric
     * layer does not remove the algorithm results its expression reads, so it recomputed the
     * identical colour and the canvas stayed byte-identical viridis while the legend said groups.
     * The set is per-Node, which is why the stain never crossed a dataset boundary -- new Nodes get
     * fresh ChangeManagers -- but was permanent for the life of one loaded graph. `SelectionManager`
     * calls this method too, so the dead layer re-applied on every selection change as well.
     *
     * WHY CLEARING IS SAFE. `Styles.getCalculatedStylesForNode` (and its edge sibling) rebuilds the
     * whole list fresh from the CURRENT layers on every call and constructs new CalculatedValue
     * objects each time, so after the clear the set holds exactly the live layers. Two live layers
     * that share one output path -- both writing `style.texture.color`, say -- both still register
     * and both still run, and the later one still wins.
     *
     * THE ONE CONTRACT THIS NARROWS is `Node.addCalculatedStyle` / `Edge.addCalculatedStyle`: a
     * value added through those is dropped by the next load. It never fully survived one anyway --
     * the pre-existing `watchedInputs.clear()` above already unhooked it from its data-change
     * triggers -- and neither method is called anywhere in this repository.
     * @param cvs - Calculated values the current style layers ask for. REPLACES the loaded set.
     * @param runImmediately - Whether to execute all calculated values immediately. Needed when the
     * values are loaded after their input data is already populated.
     */
    loadCalculatedValues(cvs: CalculatedValue[], runImmediately = false): void {
        this.watchedInputs.clear();
        this.calculatedValues.clear();
        this.addCalculatedValues(cvs);

        // Optionally run all calculated values immediately
        // This is needed when calculated values are loaded after their input data is already populated
        if (runImmediately) {
            this.runAllCalculatedValues();
        }
    }

    /**
     * Run all calculated values immediately
     * This is needed when calculated values are loaded after their input data is already populated
     */
    runAllCalculatedValues(): void {
        for (const cv of this.calculatedValues) {
            const s = getSchema(this.schemas, cv.output);
            cv.run(this.dataObjects as unknown as AdHocData, s);
        }
    }
}

function getSchema(schemas: Record<string, z4.$ZodType | undefined>, output: string): z4.$ZodType | undefined {
    const outputPath = output.split(".");
    const outputDataType = outputPath.shift();
    if (!outputDataType) {
        throw new Error("error getting data type of output for calculated value");
    }

    const topSchema = schemas[outputDataType];
    if (!topSchema) {
        return undefined;
    }

    return getSchemaItemFromPath(topSchema, outputPath);
}

/**
 * Peels off every Zod wrapper that decorates a schema without changing the shape
 * underneath it. Each of these wrappers keeps the real schema in `_zod.def.innerType`
 * (see `$ZodOptionalDef` and friends in zod/v4/core), so a walker that stops at the
 * first one cannot reach the branch it wraps: `NodeStyle.label` is
 * `RichTextStyle.prefault({...}).optional()`, which put `style.label.*` out of reach of
 * calculated values until this unwrapped both layers.
 * @param schema - A schema that may be wrapped any number of times
 * @returns The innermost schema, with the transparent wrappers removed
 */
function unwrapSchema(schema: z4.$ZodType): z4.$ZodType {
    let current = schema;

    while (
        current instanceof z4.$ZodOptional ||
        current instanceof z4.$ZodNullable ||
        current instanceof z4.$ZodDefault ||
        current instanceof z4.$ZodPrefault ||
        current instanceof z4.$ZodNonOptional ||
        current instanceof z4.$ZodReadonly ||
        current instanceof z4.$ZodCatch
    ) {
        current = current._zod.def.innerType;
    }

    return current;
}

function getSchemaItemFromPath(schema: z4.$ZodType | undefined, path: string[]): z4.$ZodType | undefined {
    // a wrapped schema (optional, prefault, default, ...) is the same schema for the
    // purpose of walking an output path, so look through the wrappers before descending
    const unwrapped = schema === undefined ? undefined : unwrapSchema(schema);

    const currentItem = path.shift();
    if (!currentItem) {
        return unwrapped;
    }

    if (unwrapped instanceof z4.$ZodObject) {
        const schemaItem = unwrapped._zod.def.shape[currentItem];
        // note: an unknown key yields undefined here, and the recursion rejects it below
        return getSchemaItemFromPath(schemaItem, path);
    }

    throw new Error(`don't know how to retreive path for: ${currentItem}.${path.join(".")}`);
}
