// The `utm` package ships no types; this is the one function used.
declare module "utm" {
    export function toLatLon(
        easting: number,
        northing: number,
        zoneNum: number,
        zoneLetter: string,
    ): { latitude: number; longitude: number };
}
