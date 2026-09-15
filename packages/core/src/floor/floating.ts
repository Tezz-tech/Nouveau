import { half } from "../money";
import type { FloorPolicy } from "./types";

/** Floor is always 50% of current total equity — recomputed fresh on every
 *  tick, moving up when equity rises and down when it falls. See fixed.ts
 *  for the "equity means total (custody + at-risk)" assumption this shares. */
export const floatingFloorPolicy: FloorPolicy = {
  model: "floating",
  initialFloor(depositCents) {
    return half(depositCents);
  },
  recalculate(_currentFloor, currentEquityCents) {
    return half(currentEquityCents);
  },
};
