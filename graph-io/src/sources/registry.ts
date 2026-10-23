/**
 * The source registry (design section 3): sources by id, in their own name space beside the
 * formats. Lazy sources are registered by descriptor and load their code on first use, so listing
 * sources loads none. A FormatRegistry holds one, so one object holds formats and sources.
 */

import { type GraphBuilder, type GraphSink } from "@graphty/graph-format";

import { type FormatRegistry, type ImportGraphResult } from "../registry.js";
import { type ImportReport } from "../types.js";
import { checkLazySource, checkSource } from "./define.js";
import { failAlone } from "./fail.js";
import { runIntoSink, runMethod, sourceFormat, stopAtLimit, withSource, wrapCursor, wrapSink } from "./run.js";
import {
    type ExpandRequest,
    type GraphSource,
    type LazySource,
    type LoadFromSourceOptions,
    type SourceDescriptor,
    type SourceFreshness,
    type SourceInfo,
    type SourceListing,
    type SourceListQuery,
    type SourceProbe,
    type SourceValidators,
} from "./types.js";

/** A registered source: loaded, or a lazy one with its descriptor. */
interface Entry {
    /** The descriptor known without loading. */
    readonly descriptor: SourceDescriptor;
    /** The lazy registration, if any. */
    readonly lazy: LazySource | null;
    /** The loaded source. */
    source: GraphSource<never> | null;
    /** The load in flight. */
    loading: Promise<GraphSource<never>> | null;
}

/**
 * Whether a registration is a lazy source rather than a source.
 * @param value - the registration
 * @returns true for a LazySource
 */
function isLazy(value: GraphSource<never> | LazySource): value is LazySource {
    const v = value as { load?: unknown; records?: unknown; file?: unknown; import?: unknown };
    return typeof v.load === "function" && v.records === undefined && v.file === undefined && v.import === undefined;
}

/** What a SourceRegistry borrows from its FormatRegistry: building and freezing a graph. */
interface SourceBuilding {
    /**
     * A builder seeded from the load options.
     * @param options - the options
     * @param format - the report format name
     * @returns the builder
     */
    readonly newBuilder: (options: LoadFromSourceOptions, format: string) => GraphBuilder;
    /**
     * Freeze a filled builder into a load result.
     * @param format - the result's format
     * @param builder - the builder
     * @param report - the report
     * @param options - the options
     * @returns the result
     */
    readonly freeze: (
        format: string,
        builder: GraphBuilder,
        report: ImportReport,
        options: LoadFromSourceOptions,
    ) => ImportGraphResult;
}

/**
 * The sources of one FormatRegistry. Experimental.
 * @category Network sources
 */
export class SourceRegistry {
    private readonly entries = new Map<string, Entry>();

    /**
     * Create one for a format registry, whose importers read `file` sources.
     * @param formats - the format registry
     * @param building - how it builds and freezes graphs
     */
    constructor(
        private readonly formats: FormatRegistry,
        private readonly building: SourceBuilding,
    ) {}

    /**
     * Register a source or a lazy source. A malformed one, or an id already taken, throws an
     * ImportError with E_SOURCE_INVALID.
     * @param source - the source
     */
    register(source: GraphSource<never> | LazySource): void {
        if (isLazy(source)) {
            checkLazySource(source);
        } else {
            checkSource(source);
        }
        if (this.entries.has(source.id)) {
            failAlone("E_SOURCE_INVALID", `a source with id ${source.id} is already registered`, {
                id: source.id,
                reason: "duplicate",
            });
        }
        const lazy = isLazy(source) ? source : null;
        this.entries.set(source.id, {
            descriptor: source.descriptor ?? { plainName: source.id, params: [] },
            lazy,
            source: lazy === null ? (source as GraphSource<never>) : null,
            loading: null,
        });
    }

    /**
     * Whether a source id is registered.
     * @param id - the id
     * @returns true when registered
     */
    has(id: string): boolean {
        return this.entries.has(id);
    }

    /**
     * Every registered source, without loading any code.
     * @returns one entry per source, in registration order
     */
    list(): readonly SourceInfo[] {
        return Object.freeze(
            [...this.entries].map(([id, e]) =>
                Object.freeze({ id, descriptor: e.descriptor, loaded: e.source !== null }),
            ),
        );
    }

    /**
     * A source by id, loading a lazy one; a source object passes through after its checks.
     * @param source - the id or the source
     * @returns the loaded source
     */
    async resolve(source: string | GraphSource<never>): Promise<GraphSource<never>> {
        if (typeof source !== "string") {
            checkSource(source);
            return source;
        }
        const entry = this.entries.get(source);
        if (entry === undefined) {
            return failAlone(
                "E_SOURCE_UNKNOWN",
                `no source has id ${JSON.stringify(source)}`,
                { id: source, known: [...this.entries.keys()] },
                sourceFormat(source),
            );
        }
        if (entry.source !== null) {
            return entry.source;
        }
        const lazy = entry.lazy as LazySource;
        entry.loading ??= lazy.load().then(
            (loaded) => {
                if (loaded.id !== lazy.id) {
                    failAlone("E_SOURCE_INVALID", `lazy source ${lazy.id} loaded a source with id ${loaded.id}`, {
                        id: lazy.id,
                        reason: "lazy",
                    });
                }
                checkSource(loaded, lazy.descriptor);
                entry.source = loaded.descriptor === undefined ? { ...loaded, descriptor: lazy.descriptor } : loaded;
                return entry.source;
            },
            (err: unknown) => {
                entry.loading = null;
                throw err;
            },
        );
        return entry.loading;
    }

    /**
     * Load a graph from a source.
     * @param source - the id or the source
     * @param params - its params
     * @param options - endpoint, credential, cursor, caps and the import options
     * @returns the graph and the report
     */
    async load(
        source: string | GraphSource<never>,
        params: Readonly<Record<string, unknown>>,
        options: LoadFromSourceOptions = {},
    ): Promise<ImportGraphResult> {
        const resolved = await this.resolve(source);
        const builder = this.building.newBuilder(options, sourceFormat(resolved.id));
        const { report, format } = await runIntoSink(resolved, params, builder, options, this.formats);
        return this.building.freeze(format, builder, report, options);
    }

    /**
     * Load from a source into a sink you own.
     * @param source - the id or the source
     * @param params - its params
     * @param sink - where to write
     * @param options - the options
     * @returns the report
     */
    async import(
        source: string | GraphSource<never>,
        params: Readonly<Record<string, unknown>>,
        sink: GraphSink,
        options: LoadFromSourceOptions = {},
    ): Promise<ImportReport> {
        const resolved = await this.resolve(source);
        return (await runIntoSink(resolved, params, sink, options, this.formats)).report;
    }

    /**
     * Fetch the neighborhood of some nodes: a snapshot of only what was fetched.
     * @param source - the id or the source
     * @param request - the seeds and how far to go
     * @param options - the options
     * @returns the fetched part and the report
     */
    async expand(
        source: string | GraphSource<never>,
        request: ExpandRequest<Readonly<Record<string, unknown>>>,
        options: LoadFromSourceOptions = {},
    ): Promise<ImportGraphResult> {
        const resolved = await this.resolve(source);
        const builder: GraphBuilder = this.building.newBuilder(options, sourceFormat(resolved.id));
        const report = await runMethod(resolved, "expand", request.params, options, async (prepared) => {
            const sink = wrapSink(builder, prepared, options.idPrefix);
            const run = resolved.expand?.({ ...request, params: prepared.params } as never, sink, prepared.created.ctx);
            const out = await stopAtLimit(run as Promise<ImportReport>, prepared);
            return withSource(
                out,
                prepared,
                wrapCursor(prepared.created.state.finish?.next, resolved.descriptor?.version ?? 1),
            );
        });
        return this.building.freeze(sourceFormat(resolved.id), builder, report, options);
    }

    /**
     * Check params and credential without loading.
     * @param source - the id or the source
     * @param params - its params
     * @param options - the options
     * @returns what the service said
     */
    async probe(
        source: string | GraphSource<never>,
        params: Readonly<Record<string, unknown>>,
        options: LoadFromSourceOptions = {},
    ): Promise<SourceProbe> {
        const resolved = await this.resolve(source);
        return runMethod(
            resolved,
            "probe",
            params,
            options,
            (prepared) => resolved.probe?.(prepared.params as never, prepared.created.ctx) as Promise<SourceProbe>,
        );
    }

    /**
     * Search what a source holds.
     * @param source - the id or the source
     * @param query - the search
     * @param options - the options
     * @returns one page of results
     */
    async search(
        source: string | GraphSource<never>,
        query: SourceListQuery<Readonly<Record<string, unknown>>>,
        options: LoadFromSourceOptions = {},
    ): Promise<SourceListing> {
        const resolved = await this.resolve(source);
        // a search narrows by some params, so required ones are not checked
        const partial: SourceDescriptor | undefined =
            resolved.descriptor === undefined
                ? undefined
                : {
                      ...resolved.descriptor,
                      params: resolved.descriptor.params.map((p) => ({ ...p, required: false })),
                  };
        return runMethod(
            { ...resolved, descriptor: partial },
            "list",
            query.params,
            options,
            (prepared) =>
                resolved.list?.(
                    { ...query, params: prepared.params } as never,
                    prepared.created.ctx,
                ) as Promise<SourceListing>,
        );
    }

    /**
     * Tell whether data loaded earlier changed.
     * @param source - the id or the source
     * @param params - the params it was loaded with
     * @param seen - the validators recorded then
     * @param options - the options
     * @returns whether it changed
     */
    async validate(
        source: string | GraphSource<never>,
        params: Readonly<Record<string, unknown>>,
        seen: SourceValidators,
        options: LoadFromSourceOptions = {},
    ): Promise<SourceFreshness> {
        const resolved = await this.resolve(source);
        return runMethod(
            resolved,
            "validate",
            params,
            options,
            (prepared) =>
                resolved.validate?.(prepared.params as never, seen, prepared.created.ctx) as Promise<SourceFreshness>,
        );
    }
}
