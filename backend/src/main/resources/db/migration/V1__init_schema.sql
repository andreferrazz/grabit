CREATE TABLE shopping_lists (
    id         UUID PRIMARY KEY,
    name       VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE shopping_items (
    id         UUID PRIMARY KEY,
    list_id    UUID         NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    name       VARCHAR(200) NOT NULL,
    completed  BOOLEAN      NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_items_list_id ON shopping_items(list_id);
