const ALPHABET = "23456789CFGHJMPQRVWX";
const PAIR_RESOLUTIONS = [20, 1, 0.05, 0.0025, 0.000125];
const FULL =
    /^[23456789CFGHJMPQRVWX]{8}\+(?:[23456789CFGHJMPQRVWX]{2,})?$|^(?=.{8}\+$)(?:[23456789CFGHJMPQRVWX]{2}){1,3}(?:00)+\+$/;
const SHORT = /^[23456789CFGHJMPQRVWX]{2,7}\+[23456789CFGHJMPQRVWX]*$/;

/**
 * Decodes a full Open Location Code (plus code) to the center of its area, following Google's
 * reference implementation (https://github.com/google/open-location-code).
 * @param value - The code, any case, with its "+" separator.
 * @returns The center in degrees, `"short"` for a short code (it needs a reference place), or null.
 */
export function decodePlusCode(value: string): { lat: number; lon: number } | "short" | null {
    const code = value.trim().toUpperCase();
    if (!FULL.test(code)) {
        return SHORT.test(code) && code.indexOf("+") < 8 ? "short" : null;
    }
    const digits = code.replace("+", "").replace(/0+$/, ""); // NOSONAR(S5852): FULL passed, so the code holds at most 8 characters before "+" and no 0 after it
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
