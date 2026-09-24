/**
 * @file An algorithm that returns its result instead of writing it.
 *
 * A subclass implements {@link DeclaredAlgorithm.compute}, which is handed a run context and
 * returns everything the run produced. The 1.x `run()` entry point stays beside it and builds the
 * result object, which is where the fields a shape declares and the element can derive get
 * filled. `compute()` is what the run executor calls, and it is the half worth reading.
 */

import { resolveOptionValues } from "../../catalog/options";
import type { AlgorithmDescriptor, FieldDescriptor, RunId } from "../../catalog/types";
import { createRunResult, resultPath, type RunResult } from "../../session/results";
import { Algorithm } from "../Algorithm";
import { nodeLabelReader } from "./labels";
import { type AlgorithmOutput, type AlgorithmRunContext, detachedRunContext, type ResultFieldSpec } from "./types";

/**
 * Turn a run's own account of a field into the descriptor the result object carries.
 *
 * The plain and technical names are the catalogue's to state, and the catalogue cannot be
 * imported here without a cycle -- it reads these classes to publish their options. So the 1.x
 * adapter fills them from the field name, and the run executor, which does hold the descriptor,
 * passes the catalogue's own. Nothing published to a consumer comes from this path.
 * @param spec - What the run says it filled.
 * @param runId - The run the field belongs to.
 * @param declared - The catalogue's descriptors for this algorithm, when the caller holds them.
 * @returns The descriptor.
 */
function toFieldDescriptor(
    spec: ResultFieldSpec,
    runId: string,
    declared?: readonly FieldDescriptor[],
): FieldDescriptor {
    const published = declared?.find((candidate) => candidate.name === spec.name && candidate.kind === spec.kind);
    const descriptor: FieldDescriptor = {
        name: spec.name,
        plainName: published?.plainName ?? spec.name,
        technicalName: published?.technicalName ?? spec.name,
        kind: spec.kind,
        type: spec.type,
        path: resultPath(runId, spec.name),
        ...(published?.unit === undefined ? {} : { unit: published.unit }),
    };

    return spec.normalization === undefined ? descriptor : { ...descriptor, normalization: spec.normalization };
}

/**
 * An algorithm whose result is a value it returns.
 * @template TOptions - The options type this algorithm resolves from its schema.
 */
export abstract class DeclaredAlgorithm<
    TOptions extends Record<string, unknown> = Record<string, unknown>,
> extends Algorithm<TOptions> {
    /**
     * What the catalogue publishes about this algorithm.
     *
     * DECLARED HERE, ON THE PUBLISHED BASE, so a plugin author reads one class to learn what a
     * subclass must carry. It is also what turns the descriptor into the single declaration:
     * `descriptor.options` is what a form renders, what the catalogue publishes, what the run
     * path validates a caller's parameters against, and -- through
     * `resolveOptions` below -- what the running code receives. An
     * algorithm used to say all of that twice, in two vocabularies that did not correspond, with
     * nothing cross-checking them.
     *
     * Absent, the class stays exactly as capable as it was: registered, callable through the
     * 1.10 address, and invisible to the catalogue.
     */
    static descriptor?: AlgorithmDescriptor;

    /** What the last run published, kept so a caller holding the algorithm can read the result. */
    #result: RunResult | undefined;

    /**
     * Fill in what the caller did not pass, and refuse what this algorithm does not declare.
     *
     * ONE DECLARATION, NOT TWO. `descriptor.options` is the only list a declared algorithm
     * writes, and this is what makes that true at the point the values reach the running code:
     * the same descriptors the catalogue hands a picker are what the caller's values are checked
     * against. The older `static optionsSchema` remains the answer for a class that declares no
     * descriptor, which is every algorithm the element itself ships.
     *
     * It also fixes the failure vocabulary on the way in. The older schema throws an uncoded
     * `Error` for a bad value and SILENTLY DROPS a name it does not know, where the run path
     * refuses the same name with `E_UNKNOWN_OPTION` -- so the same mistake produced three
     * different outcomes depending on which door the caller came through.
     * @param options - What the caller asked for.
     * @returns Every declared option, with the caller's values where they were given and the
     *   declared defaults everywhere else.
     * @throws A `GraphtyError` with `E_UNKNOWN_OPTION` for a name this algorithm does not
     *   declare, or `E_OPTION_RANGE` for a value it would not accept.
     */
    protected override resolveOptions(options?: Partial<TOptions>): TOptions {
        const {descriptor} = this.constructor as typeof DeclaredAlgorithm;

        if (descriptor === undefined) {
            return super.resolveOptions(options);
        }

        return resolveOptionValues(descriptor.options, options ?? {}, {
            kind: "algorithm",
            id: descriptor.key,
        }) as TOptions;
    }

    /**
     * What the last run published.
     *
     * THE REPLACEMENT FOR `algorithmResults`. The 1.x entry point used to scatter its numbers onto
     * the render objects under names it chose for itself, and the only way back to them was to
     * walk the graph. It returns a result object now, and this is where the 1.x `run()` leaves it,
     * so the old call shape still has somewhere to read from.
     * @returns The result, or undefined when nothing has run or there was nothing to compute.
     */
    get result(): RunResult | undefined {
        return this.#result;
    }

    /**
     * Compute this algorithm's result.
     *
     * Report progress and yield through the context rather than running to completion in one
     * block, and honour its signal: an analysis that cannot be watched or stopped is unusable on
     * a graph big enough to be worth analysing.
     * @param context - What the element gave the run.
     * @returns Everything the run produced, or null when there was nothing to compute.
     */
    abstract compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null>;

    /**
     * Run the algorithm and publish what it produced on the 1.x result paths.
     *
     * The 1.x entry point: it returns nothing, and it publishes under the algorithm's own type
     * rather than under a run id, because there is no run behind it. Whoever wants the result
     * calls {@link DeclaredAlgorithm.computeRun}, which is the same work with a run in front of
     * it.
     * @returns A promise that settles when the result has been published.
     */
    async run(): Promise<void> {
        await this.computeRun(detachedRunContext(), this.type);
    }

    /**
     * Compute on behalf of a run, and hand the result back.
     *
     * The run machinery's entry point, which is {@link DeclaredAlgorithm.computeRun} under the
     * name every algorithm answers to.
     * @param context - A signal, a progress channel and a yield.
     * @param runId - The id the result is published under.
     * @param fields - The catalogue's descriptors for this algorithm's fields.
     * @returns The result, or undefined when there was nothing to compute.
     * @throws Whatever the context's signal throws once the run has been cancelled.
     */
    publishResult(
        context: AlgorithmRunContext,
        runId: RunId,
        fields?: readonly FieldDescriptor[],
    ): Promise<RunResult | undefined> {
        return this.computeRun(context, runId, fields);
    }

    /**
     * Compute this algorithm's result, publish it under a run id, and project the 1.x view of it.
     *
     * This is what the run executor calls. The catalogue's own field descriptors are passed in
     * because the catalogue states what a reader sees a field called and cannot be imported here
     * without a cycle -- it reads these classes to publish their options.
     * @param context - What the element gave the run: a signal, a progress channel and a yield.
     * @param runId - The id the result is published under, which is the `<runId>` in
     *   `results.<runId>`.
     * @param declared - The catalogue's descriptors for this algorithm's fields, when the caller
     *   holds them.
     * @returns The result, or undefined when there was nothing to compute.
     * @throws Whatever the context's signal throws once the run has been cancelled, which is a
     *   `DOMException` named `AbortError`.
     */
    async computeRun(
        context: AlgorithmRunContext,
        runId: RunId,
        declared?: readonly FieldDescriptor[],
    ): Promise<RunResult | undefined> {
        const startedAt = Date.now();
        const output = await this.compute(context);

        if (output === null) {
            return undefined;
        }

        const dataManager = this.graph.getDataManager();
        /* WHAT TO CALL A NODE, as distinct from how to address it. A summary row and the
           sentence the element writes from it are read by a person, and an id is only sometimes
           a name -- a GML file keys its nodes by integer and carries the name beside it. Read
           through the shared reader rather than inline, because the metric pipeline needs the
           same answer and a second copy is how the two would come to disagree about it. */
        const labelOf = nodeLabelReader(this.graph);
        const result: RunResult = createRunResult({
            ...(labelOf === undefined ? {} : { labelOf }),
            runId,
            shape: output.shape,
            fields: output.fields.map((spec) => toFieldDescriptor(spec, runId, declared)),
            measured: { nodes: dataManager.nodes.size, edges: dataManager.edges.size },
            graph: output.graph,
            nodes: output.nodes,
            edges: output.edges,
            caveats: output.caveats,
            durationMs: Date.now() - startedAt,
        });

        this.#result = result;

        return result;
    }
}
