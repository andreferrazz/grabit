import { invalidateAll, replaceState } from '$app/navigation';
import type { SubmitFunction } from '$app/forms';
import type { Sync } from './sync.svelte.ts';

type SubmitInput = Parameters<SubmitFunction>[0];

/**
 * Makes enhanced form submissions feel instant. Each form applies its change to
 * local state before the request leaves; the server's answer then either
 * confirms it (the page reloads its data) or the change is undone.
 */
export class OptimisticForms {
	/** Requests in flight from this page. */
	pending = 0;

	/** Resolves when the request before the next one has been answered. */
	#queue: Promise<void> = Promise.resolve();

	#revert: () => void;
	#onError: (message: string) => void;
	#sync: Sync;

	constructor(options: { revert: () => void; onError: (message: string) => void; sync: Sync }) {
		this.#revert = options.revert;
		this.#onError = options.onError;
		this.#sync = options.sync;
	}

	/**
	 * `apply` changes local state for this submission; returning false cancels it.
	 * `after` runs once the server has confirmed.
	 */
	submit(apply?: (input: SubmitInput) => boolean | void, after?: () => void): SubmitFunction {
		return async (input) => {
			if (apply?.(input) === false) {
				input.cancel();
				return;
			}
			this.pending += 1;
			this.#sync.pending += 1;

			// Requests leave one at a time, in the order the changes were made. Sent
			// together, the server could apply them out of order (two quick reorders, or
			// a check and an uncheck) and keep the older state.
			const previous = this.#queue;
			let answered = () => {};
			this.#queue = new Promise((resolve) => (answered = resolve));
			await previous;

			return async ({ result, update }) => {
				answered();
				this.pending -= 1;
				this.#sync.pending -= 1;

				// Redirect targets here are always site-relative paths such as /lists/<id>.
				const samePage =
					result.type === 'redirect' && result.location.split('?')[0] === location.pathname;

				if (result.type === 'redirect' && !samePage) {
					await update({ reset: false });
				} else if (result.type === 'success' || samePage) {
					// A redirect back to this page only leaves ?edit=... behind. It is handled
					// like a success rather than as a navigation: a navigation would reset
					// scroll and focus, and SvelteKit discards data reloads that overlap one.
					if (samePage && location.search) replaceState(result.location, {});
					after?.();
					// Reloads the data directly instead of through update(): SvelteKit moves
					// keyboard focus to the top of the page after a successful action, which
					// would pull it out of the field the user is typing in.
					// While other changes are still in flight, fresh server data would briefly
					// undo them on screen, so only the last answer reloads.
					if (this.pending === 0) await invalidateAll();
				} else {
					this.#revert();
					this.#onError(
						result.type === 'failure' && typeof result.data?.message === 'string'
							? result.data.message
							: 'Could not save. Check your connection and try again.'
					);
					if (this.pending === 0) await invalidateAll();
				}
			};
		};
	}
}
