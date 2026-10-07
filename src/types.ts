/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'Senior Moderator' | 'Moderator' | 'Junior Moderator' | 'Regular User';
export type TitleBadge = 'Trusted' | 'Raider' | 'Helper' | 'None';

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  badge: TitleBadge;
  rating: number;
  ratingCount: number;
  joinDate: string;
  isBanned?: boolean;
  mutedUntil?: any;
}

export interface Post {
  id: string;
  userId: string;
  username?: string;
  content: string;
  timestamp: any;
  badge?: string;
  role?: string;
  reactions?: Record<string, string[]>; // emoji -> array of uids
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  timestamp: any;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  timestamp: any;
}

export interface Announcement {
  id: string;
  content: string;
  timestamp: any;
  authorId: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  leaderId: string;
  createdAt: any;
}

export interface GroupMember {
  id: string; // userId
  role: 'Leader' | 'Member';
  joinedAt: any;
  username: string;
}

export interface GroupRequest {
  id: string; // userId
  username: string;
  timestamp: any;
}

export interface GroupMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: any;
}

export interface Mission {
  id: string;
  title: string;
  target: number;
  current: number;
  completed: boolean;
  lastUpdated: string; // ISO date string (YYYY-MM-DD)
}
