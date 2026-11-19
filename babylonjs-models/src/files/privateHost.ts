/**
 * @file Whether a host is private, loopback or link-local: the addresses a model fetched from a
 * public address is never redirected to, and a page never reaches without asking.
 */

/**
 * Whether dotted IPv4 octets are private, loopback, link-local, shared, benchmarking, reserved,
 * multicast or broadcast.
 * @param a - The first octet.
 * @param b - The second.
 * @param c - The third.
 * @returns True for such an address.
 */
function privateV4(a: number, b: number, c: number): boolean {
    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 0 && c === 0) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19))
    );
}

/**
 * An IPv6 address as its eight 16-bit groups.
 * @param name - The address, without brackets, as the URL parser writes it (no dotted tail).
 * @returns The groups, or undefined when it is not one.
 */
function v6Groups(name: string): number[] | undefined {
    const halves = name.split("::");
    if (halves.length > 2) {
        return undefined;
    }

    const read = (half: string): number[] => (half === "" ? [] : half.split(":").map((g) => Number.parseInt(g, 16)));
    const head = read(halves[0]);
    const tail = halves.length === 2 ? read(halves[1]) : [];
    const groups =
        halves.length === 2 ? [...head, ...new Array<number>(8 - head.length - tail.length).fill(0), ...tail] : head;
    return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff)
        ? groups
        : undefined;
}

/**
 * Whether an IPv6 address is private: loopback, unspecified, IPv4-compatible or mapped, unique
 * local, link-local, site-local or multicast, or a NAT64 or 6to4 address whose IPv4 is private.
 * @param name - The address, without brackets.
 * @returns True for such an address.
 */
function privateV6(name: string): boolean {
    const g = v6Groups(name);
    if (g === undefined) {
        return true; // Not readable as an address: refused rather than guessed.
    }

    const v4 = (high: number, low: number): boolean => privateV4(high >> 8, high & 0xff, low >> 8);
    return (
        g.slice(0, 5).every((x) => x === 0) ||
        (g[0] & 0xfe00) === 0xfc00 ||
        (g[0] & 0xffc0) === 0xfe80 ||
        (g[0] & 0xffc0) === 0xfec0 ||
        (g[0] & 0xff00) === 0xff00 ||
        (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0) && v4(g[6], g[7])) ||
        (g[0] === 0x2002 && v4(g[1], g[2]))
    );
}

/**
 * Whether a host is private, loopback or link-local, which a fetch not from the page's code never
 * reaches. It reads the host as written: a public name that resolves to a private address is not
 * seen here, and only the reader's per-host answer stands in its way.
 * @param host - The URL's host name.
 * @returns True for such a host.
 */
export function isPrivateHost(host: string): boolean {
    const name = host
        .replaceAll(/(?:^\[)|(?:\]$)/g, "")
        .toLowerCase()
        .replace(/\.$/, "");
    // A trailing dot (`localhost.`) names the same host.
    if (name === "localhost" || name.endsWith(".localhost") || name.endsWith(".local") || name === "0.0.0.0") {
        return true;
    }

    const v4 = /^(\d+)\.(\d+)\.(\d+)\.\d+$/.exec(name);
    if (v4 !== null) {
        return privateV4(Number(v4[1]), Number(v4[2]), Number(v4[3]));
    }

    return name.includes(":") && privateV6(name);
}
