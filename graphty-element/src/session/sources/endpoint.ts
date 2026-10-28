/**
 * @file What a recorded endpoint is: whether a project file's endpoint has a form a load may run
 * against, and whether it is on the reader's own machine or local network, which a reader's
 * "don't ask again" never covers (sources.md, "Reopening" rule 4).
 */

/** The schemes a network load's endpoint may use. */
const SCHEMES = new Set(["http:", "https:", "bolt:", "bolt+s:", "bolt+ssc:"]);

/** Host name endings that name this machine or a local network. */
const LOCAL_SUFFIXES = [".local", ".localhost", ".internal", ".home.arpa", ".lan"];

/**
 * Whether an endpoint as a file records it has the form sources.md, "Network loads" rule 2, asks:
 * an absolute URL of a known scheme, with no user name, password, query or fragment.
 * @param endpoint - The endpoint.
 * @returns True when a load may run against it.
 */
export function isRecordableEndpoint(endpoint: string): boolean {
    let url: URL;
    try {
        url = new URL(endpoint);
    } catch {
        return false;
    }

    return (
        SCHEMES.has(url.protocol) &&
        url.host !== "" &&
        url.username === "" &&
        url.password === "" &&
        url.search === "" &&
        url.hash === "" &&
        !endpoint.includes("?") &&
        !endpoint.includes("#")
    );
}

/**
 * The four octets of a dotted IPv4 address.
 * @param host - The host.
 * @returns The octets, or undefined for anything else.
 */
function octetsOf(host: string): number[] | undefined {
    const parts = host.split(".");
    if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part))) {
        return undefined;
    }

    const octets = parts.map(Number);
    return octets.every((octet) => octet <= 255) ? octets : undefined;
}

/**
 * Whether an IPv4 address is on this machine, a private network or link-local: 0/8, 10/8,
 * 100.64/10 (shared address space), 127/8, 169.254/16 (link-local, cloud metadata), 172.16/12 and
 * 192.168/16.
 * @param octets - The address.
 * @returns True when it is.
 */
function isLocalV4(octets: readonly number[]): boolean {
    const [a, b] = octets;
    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && (b ?? 0) >= 64 && (b ?? 0) <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && (b ?? 0) >= 16 && (b ?? 0) <= 31) ||
        (a === 192 && b === 168)
    );
}

/**
 * Whether an IPv6 address, as the URL parser writes it, is local: the unspecified and loopback
 * addresses and every other `::`-prefixed form (IPv4-mapped `::ffff:` included), unique local
 * fc00::/7 and link-local fe80::/10.
 * @param host - The address, without brackets.
 * @returns True when it is.
 */
function isLocalV6(host: string): boolean {
    return host.startsWith("::") || /^f[cd][0-9a-f]{0,2}:/.test(host) || /^fe[89ab][0-9a-f]?:/.test(host);
}

/**
 * Whether an endpoint is on this machine or a local network: loopback, private, shared and
 * link-local addresses, a single-label host name (`localhost`, an intranet name), and names under
 * `.local`, `.localhost`, `.internal`, `.home.arpa` or `.lan`. An endpoint that does not parse
 * counts as local, so it is asked about every time.
 * @param endpoint - The endpoint, or null for a source's public default.
 * @returns True when it is local.
 */
export function isLocalNetwork(endpoint: string | null): boolean {
    if (endpoint === null) {
        return false;
    }

    let hostname: string;
    try {
        hostname = new URL(endpoint).hostname.toLowerCase();
    } catch {
        return true;
    }

    const host = hostname.replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "");
    if (host.includes(":")) {
        return isLocalV6(host);
    }

    const octets = octetsOf(host);
    if (octets !== undefined) {
        return isLocalV4(octets);
    }

    return !host.includes(".") || LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
