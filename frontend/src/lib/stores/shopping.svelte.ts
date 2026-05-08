import { listsApi } from '$lib/api/listsApi';
import type { ShoppingItem, ShoppingList } from '$lib/types';
import { sync } from './sync.svelte';

const isTempId = (id: string) => id.startsWith('temp-');
const tempId = () => `temp-${crypto.randomUUID()}`;

class ShoppingStore {
	lists = $state<ShoppingList[]>([]);
	hydrated = $state(false);

	hydrate(initial: ShoppingList[]) {
		this.lists = [...initial].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
		this.hydrated = true;
	}

	private findList(id: string): ShoppingList | undefined {
		return this.lists.find((l) => l.id === id);
	}

	private replaceList(prevId: string, next: ShoppingList) {
		const idx = this.lists.findIndex((l) => l.id === prevId);
		if (idx >= 0) this.lists[idx] = next;
	}

	private removeList(id: string) {
		this.lists = this.lists.filter((l) => l.id !== id);
	}

	private replaceItemIn(listId: string, prevItemId: string, next: ShoppingItem) {
		const list = this.findList(listId);
		if (!list) return;
		const idx = list.items.findIndex((i) => i.id === prevItemId);
		if (idx >= 0) list.items[idx] = next;
	}

	private removeItemFrom(listId: string, itemId: string) {
		const list = this.findList(listId);
		if (!list) return;
		list.items = list.items.filter((i) => i.id !== itemId);
	}

	async createList(name: string): Promise<void> {
		const trimmed = name.trim();
		if (!trimmed) return;
		const now = new Date().toISOString();
		const tempListId = tempId();
		const optimistic: ShoppingList = {
			id: tempListId,
			name: trimmed,
			createdAt: now,
			updatedAt: now,
			items: []
		};
		this.lists = [...this.lists, optimistic];
		sync.begin();
		try {
			const saved = await listsApi.createList(trimmed);
			this.replaceList(tempListId, saved);
			sync.succeed();
		} catch (err) {
			this.removeList(tempListId);
			sync.fail(toMessage(err, 'Could not create list'));
		}
	}

	async renameList(id: string, name: string): Promise<void> {
		const trimmed = name.trim();
		const list = this.findList(id);
		if (!list || !trimmed || trimmed === list.name) return;
		if (isTempId(id)) {
			sync.fail('Please wait for list to finish saving before renaming');
			return;
		}
		const previous = list.name;
		list.name = trimmed;
		list.updatedAt = new Date().toISOString();
		sync.begin();
		try {
			const saved = await listsApi.renameList(id, trimmed);
			this.replaceList(id, { ...saved, items: list.items });
			sync.succeed();
		} catch (err) {
			list.name = previous;
			sync.fail(toMessage(err, 'Could not rename list'));
		}
	}

	async deleteList(id: string): Promise<void> {
		const list = this.findList(id);
		if (!list) return;
		if (isTempId(id)) {
			sync.fail('Please wait for list to finish saving before deleting');
			return;
		}
		const snapshot = this.lists;
		this.removeList(id);
		sync.begin();
		try {
			await listsApi.deleteList(id);
			sync.succeed();
		} catch (err) {
			this.lists = snapshot;
			sync.fail(toMessage(err, 'Could not delete list'));
		}
	}

	async addItem(listId: string, name: string): Promise<void> {
		const trimmed = name.trim();
		if (!trimmed) return;
		const list = this.findList(listId);
		if (!list) return;
		if (isTempId(listId)) {
			sync.fail('Please wait for list to finish saving before adding items');
			return;
		}
		const now = new Date().toISOString();
		const tempItemId = tempId();
		const optimistic: ShoppingItem = {
			id: tempItemId,
			listId,
			name: trimmed,
			completed: false,
			createdAt: now,
			updatedAt: now
		};
		list.items = [...list.items, optimistic];
		sync.begin();
		try {
			const saved = await listsApi.addItem(listId, trimmed);
			this.replaceItemIn(listId, tempItemId, saved);
			sync.succeed();
		} catch (err) {
			this.removeItemFrom(listId, tempItemId);
			sync.fail(toMessage(err, 'Could not add item'));
		}
	}

	async renameItem(listId: string, itemId: string, name: string): Promise<void> {
		const trimmed = name.trim();
		const list = this.findList(listId);
		const item = list?.items.find((i) => i.id === itemId);
		if (!list || !item || !trimmed || trimmed === item.name) return;
		if (isTempId(itemId)) {
			sync.fail('Please wait for item to finish saving before renaming');
			return;
		}
		const previous = item.name;
		item.name = trimmed;
		item.updatedAt = new Date().toISOString();
		sync.begin();
		try {
			const saved = await listsApi.updateItem(itemId, { name: trimmed });
			this.replaceItemIn(listId, itemId, saved);
			sync.succeed();
		} catch (err) {
			item.name = previous;
			sync.fail(toMessage(err, 'Could not rename item'));
		}
	}

	async toggleItem(listId: string, itemId: string): Promise<void> {
		const list = this.findList(listId);
		const item = list?.items.find((i) => i.id === itemId);
		if (!list || !item) return;
		if (isTempId(itemId)) {
			sync.fail('Please wait for item to finish saving before toggling');
			return;
		}
		const previous = item.completed;
		const next = !previous;
		item.completed = next;
		item.updatedAt = new Date().toISOString();
		sync.begin();
		try {
			const saved = await listsApi.updateItem(itemId, { completed: next });
			this.replaceItemIn(listId, itemId, saved);
			sync.succeed();
		} catch (err) {
			item.completed = previous;
			sync.fail(toMessage(err, 'Could not update item'));
		}
	}

	async deleteItem(listId: string, itemId: string): Promise<void> {
		const list = this.findList(listId);
		const item = list?.items.find((i) => i.id === itemId);
		if (!list || !item) return;
		if (isTempId(itemId)) {
			sync.fail('Please wait for item to finish saving before deleting');
			return;
		}
		const snapshot = list.items;
		list.items = list.items.filter((i) => i.id !== itemId);
		sync.begin();
		try {
			await listsApi.deleteItem(itemId);
			sync.succeed();
		} catch (err) {
			list.items = snapshot;
			sync.fail(toMessage(err, 'Could not delete item'));
		}
	}
}

function toMessage(err: unknown, fallback: string): string {
	if (err instanceof Error && err.message) return err.message;
	return fallback;
}

export const shopping = new ShoppingStore();
