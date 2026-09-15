import type { FloorModel, FloorPolicy } from "./types";
import { fixedFloorPolicy } from "./fixed";
import { floatingFloorPolicy } from "./floating";
import { ratchetFloorPolicy } from "./ratchet";

export type { FloorModel, FloorPolicy } from "./types";
export { fixedFloorPolicy } from "./fixed";
export { floatingFloorPolicy } from "./floating";
export { ratchetFloorPolicy } from "./ratchet";

const registry: Record<FloorModel, FloorPolicy> = {
  fixed: fixedFloorPolicy,
  floating: floatingFloorPolicy,
  ratchet: ratchetFloorPolicy,
};

/** Config-driven lookup — this is the one function that should read the
 *  `FLOOR_MODEL` environment/config value. Swapping the platform's floor
 *  model is changing that one config value, never a code change here. */
export function getFloorPolicy(model: FloorModel): FloorPolicy {
  return registry[model];
}

export const DEFAULT_FLOOR_MODEL: FloorModel = "ratchet";
