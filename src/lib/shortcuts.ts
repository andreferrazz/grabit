/** Keyboard shortcuts shared by the list and template pages. */

export type ShortcutHandlers = {
	focusComposer: () => void;
	edit: (itemId: string) => void;
	remove: (itemId: string) => void;
	move: (itemId: string, direction: -1 | 1) => void;
	undo: () => void;
	help: () => void;
};

function isTyping(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}

function rows(): HTMLElement[] {
	return [...document.querySelectorAll<HTMLElement>('[data-item-id]')];
}

function currentRow(): HTMLElement | null {
	return document.activeElement?.closest<HTMLElement>('[data-item-id]') ?? null;
}

function focusRow(row: HTMLElement | undefined) {
	row?.querySelector<HTMLElement>('[data-row-focus]')?.focus();
}

/** Moves keyboard focus to the item `offset` rows away from the focused one. */
function step(offset: -1 | 1) {
	const all = rows();
	const current = currentRow();
	const index = current ? all.indexOf(current) : -1;
	const next = index === -1 ? (offset === 1 ? 0 : all.length - 1) : index + offset;
	focusRow(all[Math.max(0, Math.min(all.length - 1, next))]);
}

export function focusItem(itemId: string) {
	focusRow(rows().find((row) => row.dataset.itemId === itemId));
}

export function handleShortcut(event: KeyboardEvent, handlers: ShortcutHandlers) {
	if (
		(event.ctrlKey || event.metaKey) &&
		event.key.toLowerCase() === 'z' &&
		!isTyping(event.target)
	) {
		event.preventDefault();
		handlers.undo();
		return;
	}
	if (isTyping(event.target) || event.ctrlKey || event.metaKey) return;

	const itemId = currentRow()?.dataset.itemId;

	if (event.altKey) {
		if (itemId && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
			event.preventDefault();
			handlers.move(itemId, event.key === 'ArrowUp' ? -1 : 1);
		}
		return;
	}

	switch (event.key) {
		case 'n':
			event.preventDefault();
			handlers.focusComposer();
			break;
		case 'j':
		case 'ArrowDown':
			event.preventDefault();
			step(1);
			break;
		case 'k':
		case 'ArrowUp':
			event.preventDefault();
			step(-1);
			break;
		case 'e':
			if (itemId) {
				event.preventDefault();
				handlers.edit(itemId);
			}
			break;
		case 'Delete':
		case 'Backspace':
			if (itemId) {
				event.preventDefault();
				handlers.remove(itemId);
			}
			break;
		case '?':
			event.preventDefault();
			handlers.help();
			break;
	}
}
