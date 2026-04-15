import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const communityPosts = pgTable("community_posts", {
  id:              uuid("id").primaryKey().defaultRandom(),

  title:           varchar("title",    { length: 500 }).notNull(),
  content:         text("content").notNull(),

  type:            varchar("type",       { length: 50 }).notNull().default("notice"),
  visibility:      varchar("visibility", { length: 50 }).notNull().default("public"),
  audience:        varchar("audience",   { length: 50 }).notNull().default("all"),

  authorAccountId: uuid("author_account_id"),
  authorUserId:    uuid("author_user_id"),
  authorRole:      varchar("author_role", { length: 50 }).notNull(),
  authorName:      varchar("author_name", { length: 255 }).notNull(),

  isPinned:        boolean("is_pinned").default(false),
  isResolved:      boolean("is_resolved").default(false),
  commentCount:    integer("comment_count").default(0),

  createdAt:       timestamp("created_at").defaultNow(),
  updatedAt:       timestamp("updated_at").defaultNow(),
});

export const communityComments = pgTable("community_comments", {
  id:              uuid("id").primaryKey().defaultRandom(),

  postId:          uuid("post_id")
                     .notNull()
                     .references(() => communityPosts.id, { onDelete: "cascade" }),

  content:         text("content").notNull(),

  authorAccountId: uuid("author_account_id"),
  authorUserId:    uuid("author_user_id"),
  authorRole:      varchar("author_role", { length: 50 }).notNull(),
  authorName:      varchar("author_name", { length: 255 }).notNull(),
  isAdminReply:    boolean("is_admin_reply").default(false),

  createdAt:       timestamp("created_at").defaultNow(),
  updatedAt:       timestamp("updated_at").defaultNow(),
});

export type CommunityPost    = typeof communityPosts.$inferSelect;
export type NewCommunityPost = typeof communityPosts.$inferInsert;
export type CommunityComment    = typeof communityComments.$inferSelect;
export type NewCommunityComment = typeof communityComments.$inferInsert;
