package com.grabit.lists.dto

import jakarta.validation.constraints.Size

data class UpdateItemRequest(
    @field:Size(min = 1, max = 200, message = "Name must be between 1 and 200 characters")
    val name: String? = null,
    val completed: Boolean? = null,
)
