package com.grabit.lists

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ShoppingItemRepository : JpaRepository<ShoppingItemEntity, UUID>
