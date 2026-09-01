import { createContext, useContext } from "react";
import type Lenis from "lenis";

export const LenisContext = createContext<Lenis | null>(null);

/** The active Lenis instance, or null under prefers-reduced-motion (where
 *  Lenis never initializes and native scrolling is used instead). */
export function useLenis() {
  return useContext(LenisContext);
}
