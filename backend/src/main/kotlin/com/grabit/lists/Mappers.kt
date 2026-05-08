package com.grabit.lists

import com.grabit.lists.dto.ShoppingItemResponse
import com.grabit.lists.dto.ShoppingListResponse

fun ShoppingItemEntity.toResponse(): ShoppingItemResponse =
    ShoppingItemResponse(
        id = requireNotNull(id) { "Item id should not be null after persistence" },
        listId = requireNotNull(list?.id) { "Item parent list id should not be null" },
        name = name,
        completed = completed,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )

fun ShoppingListEntity.toResponse(): ShoppingListResponse =
    ShoppingListResponse(
        id = requireNotNull(id) { "List id should not be null after persistence" },
        name = name,
        createdAt = createdAt,
        updatedAt = updatedAt,
        items = items.map { it.toResponse() },
    )
