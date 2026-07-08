import { COLORS } from '../data/machinesConfig';

/**
 * Print-safe series inks for the brochure. The on-screen brand hues (sky
 * blue / light amber) blow out on paper — too light for a 3 px stroke on
 * white. Each screen hue maps to a darker ink of the SAME family (validated
 * for lightness, chroma, CVD separation and 3:1 contrast on paper); series
 * identity is also carried by direct end labels, the legend and the
 * sampled-points table on the same page.
 */
const PRINT_INK = {
  [COLORS.electricAccent]: '#2278B8', // electric — print blue
  [COLORS.dieselAccent]: '#C9821B', // first diesel — print amber
  [COLORS.dieselAccentDark]: '#8F5C10', // second diesel — deep amber
};

/** The ink a machine's series prints in — shared by lines, legend and labels. */
export function printSeriesInk(machine) {
  return PRINT_INK[machine.chartColor] ?? machine.chartColor;
}
