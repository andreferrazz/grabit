import { invalidateAll } from '$app/navigation';
import type { SubmitFunction } from '$app/forms';

type SubmitInput = Parameters<SubmitFunction>[0];

/**
 * Makes enhanced form submissions feel instant. Each form applies its change to
 * local state before the request leaves; the server's answer then either
 * confirms it (the page reloads its data) or the change is undone.
 */
export class OptimisticForms {
	/** Requests in flight. Drives the "Saving" indicator. */
	pending = $state(0);

	#revert: () => void;
	#onError: (message: string) => void;

	constructor(options: { revert: () => void; onError: (message: string) => void }) {
		this.#revert = options.revert;
		this.#onError = options.onError;
	}

	/**
	 * `apply` changes local state for this submission; returning false cancels it.
	 * `after` runs once the server has confirmed.
	 */
	submit(apply?: (input: SubmitInput) => boolean | void, after?: () => void): SubmitFunction {
		return (input) => {
			if (apply?.(input) === false) {
				input.cancel();
				return;
			}
			this.pending += 1;

			return async ({ result, update }) => {
				this.pending -= 1;

				if (result.type === 'redirect') {
					await update({ reset: false });
				} else if (result.type === 'success') {
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
