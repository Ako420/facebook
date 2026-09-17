import { api } from "../../lib/api";
import type { ApiPerson } from "../friends/friendApi";

export type NotificationKind =
  | "friend-request"
  | "friend-accepted"
  | "comment"
  | "reaction"
  | "group-invite";

export interface ApiNotification {
  id: string;
  type: NotificationKind;
  actor: ApiPerson;
  post: { id: string; type: "post" | "reel"; groupId: string | null } | null;
  comment: { id: string; preview: string } | null;
  group: { id: string; name: string } | null;
  createdAt: string;
  readAt: string | null;
  isRead: boolean;
}

export interface NotificationPage {
  notifications: ApiNotification[];
  nextCursor: string | null;
  unread: number;
}

export const listNotifications = async ({
  limit = 20,
  before,
}: { limit?: number; before?: string } = {}) => {
  const { data } = await api.get<NotificationPage>("/notifications", {
    params: { limit, ...(before ? { before } : {}) },
  });
  return data;
};

export const fetchUnreadNotifications = async () => {
  const { data } = await api.get<{ unread: number }>("/notifications/unread");
  return data.unread;
};

export const markNotificationRead = async (id: string) => {
  const { data } = await api.post<{ unread: number }>(`/notifications/${id}/read`);
  return data.unread;
};

export const markAllNotificationsRead = async () => {
  const { data } = await api.post<{ unread: number }>("/notifications/read");
  return data.unread;
};

export function describeNotification(notification: ApiNotification): string {
  const thing = notification.post?.type === "reel" ? "reel" : "post";

  switch (notification.type) {
    case "friend-request":
      return "sent you a friend request.";
    case "friend-accepted":
      return "accepted your friend request.";
    case "comment":
      return notification.comment?.preview
        ? `commented on your ${thing}: "${notification.comment.preview}"`
        : `commented on your ${thing}.`;
    case "reaction":
      return `reacted to your ${thing}.`;
    case "group-invite":
      return notification.group
        ? `invited you to join ${notification.group.name}.`
        : "invited you to a group.";
  }
}

export function notificationHref(notification: ApiNotification, viewerId: string): string {
  switch (notification.type) {
    case "friend-request":
      return "/friends";
    case "friend-accepted":
      return `/profile/${notification.actor.id}`;
    case "group-invite":
      return notification.group ? `/groups/${notification.group.id}` : "/groups";
    case "comment":
    case "reaction":
      return notification.post ? `/posts/${notification.post.id}` : `/profile/${viewerId}`;
  }
}
