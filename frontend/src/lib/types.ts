export type ShoppingItem = {
	id: string;
	listId: string;
	name: string;
	completed: boolean;
	createdAt: string;
	updatedAt: string;
};

export type ShoppingList = {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	items: ShoppingItem[];
};

export type ApiError = {
	status: number;
	error: string;
	message: string;
	timestamp: string;
};
