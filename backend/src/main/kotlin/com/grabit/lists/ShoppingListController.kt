package com.grabit.lists

import com.grabit.lists.dto.CreateItemRequest
import com.grabit.lists.dto.CreateListRequest
import com.grabit.lists.dto.ShoppingItemResponse
import com.grabit.lists.dto.ShoppingListResponse
import com.grabit.lists.dto.UpdateListRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/lists")
class ShoppingListController(private val service: ShoppingListService) {

    @GetMapping
    fun getAll(): List<ShoppingListResponse> = service.getAll()

    @GetMapping("/{id}")
    fun getOne(@PathVariable id: UUID): ShoppingListResponse = service.getOne(id)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody body: CreateListRequest): ShoppingListResponse =
        service.create(body)

    @PatchMapping("/{id}")
    fun rename(
        @PathVariable id: UUID,
        @Valid @RequestBody body: UpdateListRequest,
    ): ShoppingListResponse = service.rename(id, body)

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        service.delete(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{listId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    fun addItem(
        @PathVariable listId: UUID,
        @Valid @RequestBody body: CreateItemRequest,
    ): ShoppingItemResponse = service.addItem(listId, body)
}
