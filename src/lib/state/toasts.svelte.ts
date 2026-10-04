import { getContext, setContext } from 'svelte';

export type Toast = {
	id: number;
	message: string;
	tone: 'neutral' | 'danger';
	action?: { label: string; run: () => void };
};

/** Short messages at the bottom of the screen, such as "Deleted - Undo". */
export class Toasts {
	list = $state<Toast[]>([]);
	#nextId = 1;

	show(message: string, options: { tone?: Toast['tone']; action?: Toast['action'] } = {}) {
		const toast: Toast = {
			id: this.#nextId++,
			message,
			tone: options.tone ?? 'neutral',
			action: options.action
		};
		this.list.push(toast);
		setTimeout(() => this.dismiss(toast.id), 5000);
	}

	error(message: string) {
		this.show(message, { tone: 'danger' });
	}

	dismiss(id: number) {
		this.list = this.list.filter((toast) => toast.id !== id);
	}
}

const key = Symbol('toasts');

// Created per page tree, never at module level: module state on the server is shared by every visitor.
export function provideToasts(): Toasts {
	return setContext(key, new Toasts());
}

export function useToasts(): Toasts {
	return getContext<Toasts>(key);
}
