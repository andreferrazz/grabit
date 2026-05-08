import type { ShoppingItem, ShoppingList } from '$lib/types';
import { apiFetch } from './client';

export const listsApi = {
	getAll(): Promise<ShoppingList[]> {
		return apiFetch<ShoppingList[]>('/api/lists');
	},

	getOne(id: string): Promise<ShoppingList> {
		return apiFetch<ShoppingList>(`/api/lists/${id}`);
	},

	createList(name: string): Promise<ShoppingList> {
		return apiFetch<ShoppingList>('/api/lists', {
			method: 'POST',
			body: JSON.stringify({ name })
		});
	},

	renameList(id: string, name: string): Promise<ShoppingList> {
		return apiFetch<ShoppingList>(`/api/lists/${id}`, {
			method: 'PATCH',
			body: JSON.stringify({ name })
		});
	},

	deleteList(id: string): Promise<void> {
		return apiFetch<void>(`/api/lists/${id}`, { method: 'DELETE' });
	},

	addItem(listId: string, name: string): Promise<ShoppingItem> {
		return apiFetch<ShoppingItem>(`/api/lists/${listId}/items`, {
			method: 'POST',
			body: JSON.stringify({ name })
		});
	},

	updateItem(itemId: string, patch: { name?: string; completed?: boolean }): Promise<ShoppingItem> {
		return apiFetch<ShoppingItem>(`/api/items/${itemId}`, {
			method: 'PATCH',
			body: JSON.stringify(patch)
		});
	},

	deleteItem(itemId: string): Promise<void> {
		return apiFetch<void>(`/api/items/${itemId}`, { method: 'DELETE' });
	}
};
