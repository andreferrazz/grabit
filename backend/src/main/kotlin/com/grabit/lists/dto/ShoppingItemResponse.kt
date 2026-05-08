package com.grabit.lists.dto

import java.time.Instant
import java.util.UUID

data class ShoppingItemResponse(
    val id: UUID,
    val listId: UUID,
    val name: String,
    val completed: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)
