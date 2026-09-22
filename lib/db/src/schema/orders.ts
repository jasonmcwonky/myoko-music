import { jsonb, integer, pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

export const ordersTable = pgTable(
  "myoko_orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    customerName: text("customer_name").notNull(),
    className: text("class_name").notNull(),
    school: text("school").notNull(),
    albumName: text("album_name").notNull(),
    deliveryPreference: text("delivery_preference").notNull(),
    deliveryNotes: text("delivery_notes"),
    keychainQuantity: integer("keychain_quantity").notNull(),
    offers: jsonb("offers").notNull(),
    custom: jsonb("custom"),
    subtotal: integer("subtotal").notNull(),
    couponDiscount: integer("coupon_discount").notNull().default(0),
    loyaltyDiscount: integer("loyalty_discount").notNull().default(0),
    total: integer("total").notNull(),
    paymentMethod: text("payment_method").notNull().default("cash_or_qr_at_delivery"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    orderStatus: text("order_status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderNumberIndex: uniqueIndex("myoko_orders_order_number_idx").on(table.orderNumber),
    statusIndex: index("myoko_orders_status_idx").on(table.orderStatus),
    createdAtIndex: index("myoko_orders_created_at_idx").on(table.createdAt),
  }),
);

export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;