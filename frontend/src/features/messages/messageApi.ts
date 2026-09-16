import { api } from "../../lib/api";
import type { ApiPerson } from "../friends/friendApi";
import type { UploadedMedia } from "../posts/postApi";

export interface ApiParticipant {
  id: string;
  role: "admin" | "member";
  joinedAt: string;
  lastReadAt: string | null;
  user: ApiPerson;
}

/** A conversation as conversationController's publicConversation() returns it. */
export interface ApiConversation {
  id: string;
  type: "direct" | "group";
  title: string;
  avatarUrl: string | null;
  name: string;
  createdAt: string;
  lastMessageAt: string;
  lastMessage: {
    id: string;
    preview: string;
    sentAt: string;
    senderId: string;
    fromViewer: boolean;
  } | null;
  unreadCount: number;
  viewerRole: "admin" | "member" | null;
  participants: ApiParticipant[];
}

export interface ApiMessage {
  id: string;
  conversationId: string;
  text: string;
  attachments: UploadedMedia[];
  replyTo: string | null;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  fromViewer: boolean;
  canEdit: boolean;
  canUnsend: boolean;
  sender: { id: string; name?: string; avatarUrl?: string };
}

export interface UnreadSummary {
  conversations: number;
  messages: number;
}

export const listConversations = async (limit = 20) => {
  const { data } = await api.get<{ conversations: ApiConversation[] }>("/conversations", {
    params: { limit },
  });
  return data.conversations;
};

/** The badge number, in one small call the header can poll. */
export const fetchUnreadSummary = async () => {
  const { data } = await api.get<{ unread: UnreadSummary }>("/conversations/unread");
  return data.unread;
};

export const fetchConversation = async (id: string) => {
  const { data } = await api.get<{ conversation: ApiConversation }>(`/conversations/${id}`);
  return data.conversation;
};


export const startDirectChat = async (userId: string) => {
  const { data } = await api.post<{ conversation: ApiConversation }>("/conversations", {
    userId,
  });
  return data.conversation;
};

export const createGroupChat = async (participantIds: string[], name?: string) => {
  const { data } = await api.post<{ conversation: ApiConversation }>("/conversations", {
    type: "group",
    participantIds,
    ...(name ? { name } : {}),
  });
  return data.conversation;
};

/** Renaming a group chat. Admins only. */
export const updateConversation = async (id: string, body: { name?: string }) => {
  const { data } = await api.patch<{ conversation: ApiConversation }>(
    `/conversations/${id}`,
    body,
  );
  return data.conversation;
};

/** Hides the chat and its history from you. The next message brings it back. */
export const deleteConversation = async (id: string) => {
  await api.delete(`/conversations/${id}`);
};

export const leaveConversation = async (id: string) => {
  await api.delete(`/conversations/${id}/participants`);
};

/** Admins only, and never yourself — leaving is how you take yourself out. */
export const removeParticipant = async (id: string, userId: string) => {
  await api.delete(`/conversations/${id}/participants/${userId}`);
};

export const addParticipants = async (id: string, userIds: string[]) => {
  const { data } = await api.post<{ added: string[] }>(`/conversations/${id}/participants`, {
    userIds,
  });
  return data.added;
};

/**
 Pass the previous `nextCursor` as
 * `before` to walk backwards;
 */
export const listMessages = async (
  id: string,
  { limit = 30, before }: { limit?: number; before?: string } = {},
) => {
  const { data } = await api.get<{ messages: ApiMessage[]; nextCursor: string | null }>(
    `/conversations/${id}/messages`,
    { params: { limit, ...(before ? { before } : {}) } },
  );
  return data;
};

export const sendMessage = async (
  id: string,
  body: { text?: string; attachments?: UploadedMedia[]; replyTo?: string },
) => {
  const { data } = await api.post<{ data: ApiMessage }>(`/conversations/${id}/messages`, body);
  return data.data;
};

export const editMessage = async (id: string, messageId: string, text: string) => {
  const { data } = await api.patch<{ data: ApiMessage }>(
    `/conversations/${id}/messages/${messageId}`,
    { text },
  );
  return data.data;
};

/** Blanks the message for everyone but keeps its place in the thread. */
export const unsendMessage = async (id: string, messageId: string) => {
  await api.delete(`/conversations/${id}/messages/${messageId}`, {
    params: { scope: "everyone" },
  });
};

/** Takes the message off your own thread. Everyone else keeps it. */
export const hideMessage = async (id: string, messageId: string) => {
  await api.delete(`/conversations/${id}/messages/${messageId}`, {
    params: { scope: "me" },
  });
};

export const markConversationRead = async (id: string) => {
  await api.post(`/conversations/${id}/read`);
};

/** Total unread across the inbox, without a second round trip. */
export const totalUnread = (conversations: ApiConversation[]) =>
  conversations.reduce((sum, row) => sum + (row.unreadCount || 0), 0);

/** The line under a name in the inbox: who said what, and when. */
export const previewOf = (conversation: ApiConversation) => {
  const last = conversation.lastMessage;
  if (!last) return "No messages yet";

  return last.fromViewer ? `You: ${last.preview}` : last.preview;
};
