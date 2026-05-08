package com.grabit.lists.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class UpdateListRequest(
    @field:NotBlank(message = "Name must not be blank")
    @field:Size(max = 200, message = "Name must be at most 200 characters")
    val name: String,
)
