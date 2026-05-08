package com.grabit.lists.dto

import java.time.Instant
import java.util.UUID

data class ShoppingListResponse(
    val id: UUID,
    val name: String,
    val createdAt: Instant,
    val updatedAt: Instant,
    val items: List<ShoppingItemResponse>,
)
