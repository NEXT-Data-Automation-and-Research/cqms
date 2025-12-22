/**
 * Drizzle ORM Schema
 * Database schema definitions for users and notifications
 */

import { pgTable, uuid, text, jsonb, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core';

/**
 * Users table - Comprehensive user information and analytics
 */
export const users = pgTable('users', {
  // Primary key - references auth.users(id)
  id: uuid('id').primaryKey(),
  
  // Basic user information
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  provider: text('provider').default('google').notNull(),
  
  // Analytics and activity tracking
  lastSignInAt: timestamp('last_sign_in_at', { withTimezone: true }),
  lastSignOutAt: timestamp('last_sign_out_at', { withTimezone: true }),
  signInCount: text('sign_in_count').default('0').notNull(), // Using text to avoid type issues, can be incremented
  firstSignInAt: timestamp('first_sign_in_at', { withTimezone: true }),
  
  // Comprehensive device information for analytics
  deviceInfo: jsonb('device_info').default({}).notNull(),
  
  // Notification preferences
  notificationPreferences: jsonb('notification_preferences').default({
    email: true,
    push: true,
    in_app: true,
    categories: {
      system: true,
      task: true,
      message: true,
      reminder: true,
    },
  }).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  lastSignInIdx: index('idx_users_last_sign_in').on(table.lastSignInAt),
  createdAtIdx: index('idx_users_created_at').on(table.createdAt),
}));

/**
 * Notification subscriptions table - Web push notification subscriptions
 */
export const notificationSubscriptions = pgTable('notification_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Web Push subscription details (required for web push API)
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(), // Public key
  auth: text('auth').notNull(), // Auth secret
  
  // Device/browser metadata for targeting
  userAgent: text('user_agent'),
  platform: text('platform'),
  browser: text('browser'),
  browserVersion: text('browser_version'),
  os: text('os'),
  osVersion: text('os_version'),
  deviceType: text('device_type'), // 'desktop', 'mobile', 'tablet'
  screenResolution: text('screen_resolution'),
  language: text('language'),
  timezone: text('timezone'),
  
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
}, (table) => ({
  userIdIdx: index('idx_notification_subscriptions_user_id').on(table.userId),
  activeIdx: index('idx_notification_subscriptions_active').on(table.isActive),
  endpointIdx: index('idx_notification_subscriptions_endpoint').on(table.endpoint),
}));

/**
 * Notifications table - Notification history and queued notifications
 */
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Notification content
  title: text('title').notNull(),
  body: text('body').notNull(),
  iconUrl: text('icon_url'),
  imageUrl: text('image_url'),
  actionUrl: text('action_url'),
  
  // Notification type and category
  type: text('type').notNull(), // 'info', 'warning', 'error', 'success'
  category: text('category'), // 'system', 'task', 'message', 'reminder', etc.
  
  // Status tracking
  status: text('status').default('pending').notNull(), // 'pending', 'sent', 'read', 'failed'
  sentAt: timestamp('sent_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  
  // Additional metadata
  metadata: jsonb('metadata').default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_notifications_user_id').on(table.userId),
  statusIdx: index('idx_notifications_status').on(table.status),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
  userStatusIdx: index('idx_notifications_user_status').on(table.userId, table.status),
}));

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type NotificationSubscription = typeof notificationSubscriptions.$inferSelect;
export type NewNotificationSubscription = typeof notificationSubscriptions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

