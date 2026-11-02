const ALPHABET = "23456789CFGHJMPQRVWX";
const PAIR_RESOLUTIONS = [20, 1, 0.05, 0.0025, 0.000125];
const FULL =
    /^[23456789CFGHJMPQRVWX]{8}\+(?:[23456789CFGHJMPQRVWX]{2,})?$|^(?=.{8}\+$)(?:[23456789CFGHJMPQRVWX]{2}){1,3}(?:00)+\+$/;
/** Longer than any plus code a person writes (the reference decodes at most 15 digits). */
const MAX_CODE_LENGTH = 32;
const SHORT = /^[23456789CFGHJMPQRVWX]{2,7}\+[23456789CFGHJMPQRVWX]*$/;

/**
 * The code's digits without the zeros that pad a code shorter than eight digits.
 * @param digits - The digits, without the separator.
 * @returns The digits up to the last one that is not "0".
 */
function withoutTrailingZeros(digits: string): string {
    let end = digits.length;
    while (end > 0 && digits[end - 1] === "0") {
        end--;
    }
    return digits.slice(0, end);
}

/**
 * Decodes a full Open Location Code (plus code) to the center of its area, following Google's
 * reference implementation (https://github.com/google/open-location-code).
 * @param value - The code, any case, with its "+" separator.
 * @returns The center in degrees, `"short"` for a short code (it needs a reference place), or null.
 */
export function decodePlusCode(value: string): { lat: number; lon: number } | "short" | null {
    const code = value.trim().toUpperCase();
    // A full code is at most 8 digits, "+" and 7 more; anything far longer is not a code, and the
    // cap keeps every regex below linear on hostile input.
    if (code.length > MAX_CODE_LENGTH) {
        return null;
    }
    if (!FULL.test(code)) {
        return SHORT.test(code) && code.indexOf("+") < 8 ? "short" : null;
    }
    const digits = withoutTrailingZeros(code.replace("+", ""));
    if (ALPHABET.indexOf(digits[0]) > 8 || ALPHABET.indexOf(digits[1]) > 17) {
        return null; // beyond 90 degrees north or 180 east
    }
    let lat = -90;
    let lon = -180;
    let latSize = 20;
    let lonSize = 20;
    for (let i = 0; i < Math.min(10, digits.length); i += 2) {
        latSize = lonSize = PAIR_RESOLUTIONS[i / 2];
        lat += ALPHABET.indexOf(digits[i]) * latSize;
        lon += ALPHABET.indexOf(digits[i + 1]) * lonSize;
    }
    for (const char of digits.slice(10)) {
        const index = ALPHABET.indexOf(char);
        latSize /= 5;
        lonSize /= 4;
        lat += Math.floor(index / 4) * latSize;
        lon += (index % 4) * lonSize;
    }
    return { lat: Math.min(lat + latSize / 2, 90), lon: Math.min(lon + lonSize / 2, 180) };
}
