export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

class SyncStore {
	inFlight = $state(0);
	hasSavedSomething = $state(false);
	lastError = $state<string | null>(null);
	private clearTimer: ReturnType<typeof setTimeout> | null = null;

	status = $derived<SyncStatus>(
		this.lastError ? 'error' : this.inFlight > 0 ? 'saving' : this.hasSavedSomething ? 'saved' : 'idle'
	);

	begin() {
		this.inFlight++;
		this.lastError = null;
	}

	succeed() {
		this.inFlight = Math.max(0, this.inFlight - 1);
		this.hasSavedSomething = true;
	}

	fail(message: string) {
		this.inFlight = Math.max(0, this.inFlight - 1);
		this.lastError = message;
		if (this.clearTimer) clearTimeout(this.clearTimer);
		this.clearTimer = setTimeout(() => {
			this.lastError = null;
			this.clearTimer = null;
		}, 4000);
	}
}

export const sync = new SyncStore();
