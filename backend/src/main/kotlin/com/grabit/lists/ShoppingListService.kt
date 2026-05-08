package com.grabit.lists

import com.grabit.common.NotFoundException
import com.grabit.lists.dto.CreateItemRequest
import com.grabit.lists.dto.CreateListRequest
import com.grabit.lists.dto.ShoppingItemResponse
import com.grabit.lists.dto.ShoppingListResponse
import com.grabit.lists.dto.UpdateItemRequest
import com.grabit.lists.dto.UpdateListRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class ShoppingListService(
    private val listRepository: ShoppingListRepository,
    private val itemRepository: ShoppingItemRepository,
) {

    @Transactional(readOnly = true)
    fun getAll(): List<ShoppingListResponse> =
        listRepository.findAllWithItems().map { it.toResponse() }

    @Transactional(readOnly = true)
    fun getOne(id: UUID): ShoppingListResponse =
        loadList(id).toResponse()

    @Transactional
    fun create(request: CreateListRequest): ShoppingListResponse {
        val now = Instant.now()
        val entity = ShoppingListEntity(
            name = request.name.trim(),
            createdAt = now,
            updatedAt = now,
        )
        return listRepository.save(entity).toResponse()
    }

    @Transactional
    fun rename(id: UUID, request: UpdateListRequest): ShoppingListResponse {
        val entity = loadList(id)
        entity.name = request.name.trim()
        entity.updatedAt = Instant.now()
        return entity.toResponse()
    }

    @Transactional
    fun delete(id: UUID) {
        if (!listRepository.existsById(id)) {
            throw NotFoundException("Shopping list $id not found")
        }
        listRepository.deleteById(id)
    }

    @Transactional
    fun addItem(listId: UUID, request: CreateItemRequest): ShoppingItemResponse {
        val list = loadList(listId)
        val now = Instant.now()
        val item = ShoppingItemEntity(
            list = list,
            name = request.name.trim(),
            completed = false,
            createdAt = now,
            updatedAt = now,
        )
        list.items.add(item)
        list.updatedAt = now
        val saved = itemRepository.save(item)
        return saved.toResponse()
    }

    @Transactional
    fun updateItem(itemId: UUID, request: UpdateItemRequest): ShoppingItemResponse {
        val item = itemRepository.findById(itemId)
            .orElseThrow { NotFoundException("Shopping item $itemId not found") }
        var changed = false
        request.name?.let {
            val trimmed = it.trim()
            require(trimmed.isNotEmpty()) { "Name must not be blank" }
            item.name = trimmed
            changed = true
        }
        request.completed?.let {
            item.completed = it
            changed = true
        }
        if (changed) {
            val now = Instant.now()
            item.updatedAt = now
            item.list?.updatedAt = now
        }
        return item.toResponse()
    }

    @Transactional
    fun deleteItem(itemId: UUID) {
        val item = itemRepository.findById(itemId)
            .orElseThrow { NotFoundException("Shopping item $itemId not found") }
        item.list?.updatedAt = Instant.now()
        itemRepository.delete(item)
    }

    private fun loadList(id: UUID): ShoppingListEntity =
        listRepository.findWithItemsById(id)
            .orElseThrow { NotFoundException("Shopping list $id not found") }
}
