import { prefersReducedMotion } from 'svelte/motion';

/** Animation length in ms, or 0 when the system asks for reduced motion. */
export function duration(ms: number): number {
	return prefersReducedMotion.current ? 0 : ms;
}
