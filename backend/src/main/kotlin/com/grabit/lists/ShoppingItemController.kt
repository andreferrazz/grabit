package com.grabit.lists

import com.grabit.lists.dto.ShoppingItemResponse
import com.grabit.lists.dto.UpdateItemRequest
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/items")
class ShoppingItemController(private val service: ShoppingListService) {

    @PatchMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody body: UpdateItemRequest,
    ): ShoppingItemResponse = service.updateItem(id, body)

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        service.deleteItem(id)
        return ResponseEntity.noContent().build()
    }
}
