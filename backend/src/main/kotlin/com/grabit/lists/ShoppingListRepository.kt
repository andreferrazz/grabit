package com.grabit.lists

import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.Optional
import java.util.UUID

interface ShoppingListRepository : JpaRepository<ShoppingListEntity, UUID> {

    @EntityGraph(attributePaths = ["items"])
    @Query("select l from ShoppingListEntity l order by l.createdAt asc")
    fun findAllWithItems(): List<ShoppingListEntity>

    @EntityGraph(attributePaths = ["items"])
    fun findWithItemsById(id: UUID): Optional<ShoppingListEntity>
}
