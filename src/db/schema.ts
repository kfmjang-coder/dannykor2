import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    dong: text('dong'),
    ho: text('ho'),
    email: text('email'),
    name: text('name').notNull(),
    phone: text('phone'),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
    status: text('status', { enum: ['pending', 'active', 'suspended'] })
      .notNull()
      .default('pending'),
    mustChangePassword: integer('must_change_password', { mode: 'boolean' })
      .notNull()
      .default(true),
    createdAt: integer('created_at').notNull(),
    approvedAt: integer('approved_at'),
  },
  (t) => ({
    uniqDongHo: uniqueIndex('uniq_users_dong_ho')
      .on(t.dong, t.ho)
      .where(sql`${t.dong} IS NOT NULL AND ${t.ho} IS NOT NULL`),
    uniqEmail: uniqueIndex('uniq_users_email')
      .on(t.email)
      .where(sql`${t.email} IS NOT NULL`),
  }),
);

export const reservations = sqliteTable(
  'reservations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    courtId: integer('court_id').notNull(),
    date: text('date').notNull(),
    startHour: integer('start_hour').notNull(),
    endHour: integer('end_hour').notNull(),
    partySize: integer('party_size').notNull(),
    status: text('status', { enum: ['active', 'cancelled'] }).notNull().default('active'),
    note: text('note'),
    createdAt: integer('created_at').notNull(),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id),
    cancelledAt: integer('cancelled_at'),
    cancelledBy: integer('cancelled_by').references(() => users.id),
  },
  (t) => ({
    uniqActiveSlot: uniqueIndex('uniq_reservations_active_slot')
      .on(t.courtId, t.date, t.startHour)
      .where(sql`${t.status} = 'active'`),
    byDate: index('idx_reservations_date').on(t.date),
    byUser: index('idx_reservations_user').on(t.userId),
  }),
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
  updatedBy: integer('updated_by').references(() => users.id),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type Setting = typeof settings.$inferSelect;
