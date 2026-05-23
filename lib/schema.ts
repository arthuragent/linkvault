import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const categories = pgTable(
  "linkvault_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#6366f1"),
    emoji: text("emoji"),
    parentId: uuid("parent_id"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    parentIdx: index("linkvault_categories_parent_idx").on(table.parentId),
  }),
);

export const links = pgTable(
  "linkvault_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    metaImage: text("meta_image"),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    categoryIdx: index("linkvault_links_category_idx").on(table.categoryId),
    createdIdx: index("linkvault_links_created_idx").on(table.createdAt),
  }),
);

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  links: many(links),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "parent_child",
  }),
  children: many(categories, { relationName: "parent_child" }),
}));

export const linksRelations = relations(links, ({ one }) => ({
  category: one(categories, {
    fields: [links.categoryId],
    references: [categories.id],
  }),
}));

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;
export type Link = InferSelectModel<typeof links>;
export type NewLink = InferInsertModel<typeof links>;
