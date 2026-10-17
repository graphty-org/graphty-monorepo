/**
 * The REST mapping format and the parameters of the `rest` source and its `openalex` preset (design
 * sections 13.2 and 13.3). Experimental: the mapping carries `version: 1`. The REST work may add
 * optional fields only.
 */

import { type SourceParamDescriptor } from "../types.js";

/**
 * How a paged request moves to its next page. Experimental.
 * @category Network sources
 */
export type RestPaging =
    | {
          /** The paging style. */
          readonly style: "cursor";
          /** The query parameter that carries the position. */
          readonly param: string;
          /** The position of the first page. */
          readonly first: string;
          /** The selector of the next position in the body. */
          readonly next: string;
      }
    | {
          /** The paging style. */
          readonly style: "offset";
          /** The query parameter that carries the position. */
          readonly param: string;
          /** The page size and its query parameter. */
          readonly size: {
              /** The query parameter that carries the page size. */
              readonly param: string;
              /** The page size. */
              readonly value: number;
          };
          /** Whether the offset counts items or pages. */
          readonly unit?: "items" | "pages" | undefined;
          /** The first offset. */
          readonly base?: 0 | 1 | undefined;
      }
    | {
          /** The paging style. */
          readonly style: "link-header";
          /** The link relation of the next page. */
          readonly rel?: string | undefined;
      }
    | {
          /** The paging style. */
          readonly style: "next-url";
          /** The selector of the next position in the body. */
          readonly next: string;
      };

/**
 * One named request of a mapping. Experimental.
 * @category Network sources
 */
export interface RestRequest {
    /** GET (default) or POST. */
    readonly method?: "GET" | "POST" | undefined;
    /** A path template: "/works/{id}". */
    readonly path: string;
    /** Query templates: `{ filter: "cites:{work}" }`. */
    readonly query?: Readonly<Record<string, string>> | undefined;
    /** A POST body; templates in string leaves. */
    readonly body?: unknown;
    /** The selector of the record array, "." for one record. */
    readonly records: string;
    /** Which entity the records are. */
    readonly entity: string;
    /** How it pages. */
    readonly paging?: RestPaging | undefined;
    /** `{ids}` holds up to `max` ids joined by `join`. */
    readonly batch?:
        | {
              /** At most this many ids per request. */
              readonly max: number;
              /** What joins the ids. */
              readonly join: string;
          }
        | undefined;
}

/**
 * One rule that makes edges from a record. Experimental.
 * @category Network sources
 */
export type RestEdgeRule =
    | {
          /** A selector the rule repeats over. */
          readonly each?: string | undefined;
          /** The selector of the edge's source; the record's id by default. */
          readonly from?: string | undefined;
          /** The selector of the edge's target ids. */
          readonly to: string;
          /** The edge type. */
          readonly type: string;
          /** The entity the target or record is. */
          readonly entity?: string | undefined;
          /** Attribute name to selector. */
          readonly fields?: Readonly<Record<string, string>> | undefined;
      }
    | {
          /** A selector the rule repeats over. */
          readonly each?: string | undefined;
          /** A selector of ids joined pairwise, undirected. */
          readonly pairs: string;
          /** The edge type. */
          readonly type: string;
      };

/**
 * How records of one kind become nodes and edges. Experimental.
 * @category Network sources
 */
export interface RestEntity {
    /** The id selector within the record. */
    readonly id: string;
    /** A prefix stripped from ids ("https://openalex.org/"). */
    readonly stripPrefix?: string | undefined;
    /** Attribute name to selector; without it every top-level scalar is kept. */
    readonly fields?: Readonly<Record<string, string>> | undefined;
    /** The edge rules. */
    readonly edges?: readonly RestEdgeRule[] | undefined;
    /** Nested records that are nodes of their own entity. */
    readonly embedded?:
        | readonly {
              /** The selector of the nested records. */
              readonly at: string;
              /** The entity the target or record is. */
              readonly entity: string;
          }[]
        | undefined;
}

/**
 * A declarative mapping from a REST API to a graph, as JSON data. Experimental.
 * @category Network sources
 */
export interface RestMapping {
    /** The format version. */
    readonly version: 1;
    /** Every request must stay on this origin. */
    readonly endpoint: string;
    /** The named requests. */
    readonly requests: Readonly<Record<string, RestRequest>>;
    /** How records become nodes and edges. */
    readonly entities: Readonly<Record<string, RestEntity>>;
    /** The request a load runs. */
    readonly load: string;
    /** The request an expansion runs per batch of seeds. */
    readonly expand?:
        | string
        | {
              /** The request for incoming edges. */
              readonly in?: string | undefined;
              /** The request for outgoing edges. */
              readonly out?: string | undefined;
          }
        | undefined;
    /** The request that fetches stub nodes' full records. */
    readonly hydrate?: string | undefined;
    /** What credential a form should ask for. */
    readonly auth?:
        | {
              /** The credential kind. */
              readonly kind: "bearer";
          }
        | {
              /** The credential kind. */
              readonly kind: "api-key";
              /** The request header the key goes in. */
              readonly header?: string | undefined;
              /** The query parameter the key goes in. */
              readonly query?: string | undefined;
          }
        | undefined;
    /** Paces requests. */
    readonly rateLimit?:
        | {
              /** At most this many requests per period. */
              readonly requests: number;
              /** The period, in milliseconds. */
              readonly perMs: number;
              /** At most this many requests at once. */
              readonly concurrent?: number;
          }
        | undefined;
    /** Response headers telling what budget is left. */
    readonly budgetHeaders?:
        | {
              /** What the service says is left. */
              readonly remaining: string;
              /** The header naming when the budget resets. */
              readonly reset?: string | undefined;
          }
        | undefined;
    /** What a form asks for. */
    readonly params?: readonly SourceParamDescriptor[] | undefined;
}

/**
 * The params of the generic `rest` source: the mapping and the values its templates use.
 * Experimental.
 * @category Network sources
 */
export type RestParams = {
    /** The mapping. */
    readonly mapping: RestMapping;
} & Readonly<Record<string, unknown>>;

/**
 * The params of the `openalex` preset. Experimental.
 * @category Network sources
 */
export interface OpenAlexParams {
    /** The seed work ("W2112090702"). */
    readonly work?: string | undefined;
    /** The seed author. */
    readonly author?: string | undefined;
    /** "citation" (default) or "coauthorship". */
    readonly graph?: "citation" | "coauthorship" | undefined;
    /** What else becomes nodes. @defaultValue [] */
    readonly include?: readonly ("authors" | "institutions" | "topics")[] | undefined;
}
