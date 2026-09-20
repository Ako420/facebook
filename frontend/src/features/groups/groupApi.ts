import { api } from "../../lib/api";
import { coverOf } from "../../lib/images";
import type { ApiPerson } from "../friends/friendApi";


export type GroupStatus = "active" | "invited" | "requested";

export interface ApiGroup {
  id: string;
  name: string;
  description: string;
  privacy: "public" | "private";
  coverUrl?: string;
  memberCount: number;
  createdAt: string;
  createdBy: ApiPerson | null;
  viewerRole: "admin" | "member" | null;
  viewerStatus: GroupStatus | null;
  isMember: boolean;
  canRead: boolean;
}

export interface ApiGroupMember {
  id: string;
  role: "admin" | "member";
  status: GroupStatus;
  joinedAt: string;
  user: ApiPerson;
  invitedBy: ApiPerson | null;
}

export interface ApiGroupInvitation {
  group: ApiGroup;
  invitedBy: ApiPerson | null;
  invitedAt: string;
}

export interface GroupDraft {
  name: string;
  description?: string;
  privacy?: "public" | "private";
  coverUrl?: string;
}

/**
 * Groups you are not in. Private ones are here too: you cannot read them, but
 * you have to be able to find one before you can ask to join it.
 */
export const listDiscoverGroups = async (params?: { q?: string; limit?: number }) => {
  const { data } = await api.get<{ groups: ApiGroup[] }>("/groups", { params });
  return data.groups;
};

/** Every group you belong to, private ones included. */
export const listMyGroups = async () => {
  const { data } = await api.get<{ groups: ApiGroup[] }>("/groups", {
    params: { mine: true },
  });
  return data.groups;
};

/** Groups that have asked you in and are waiting on your answer. */
export const listGroupInvitations = async () => {
  const { data } = await api.get<{ invitations: ApiGroupInvitation[] }>(
    "/groups/invitations",
  );
  return data.invitations;
};

export const createGroup = async (body: GroupDraft) => {
  const { data } = await api.post<{ group: ApiGroup }>("/groups", body);
  return data.group;
};

export const fetchGroup = async (id: string) => {
  const { data } = await api.get<{ group: ApiGroup }>(`/groups/${id}`);
  return data.group;
};

export const updateGroup = async (id: string, body: Partial<GroupDraft>) => {
  const { data } = await api.patch<{ group: ApiGroup }>(`/groups/${id}`, body);
  return data.group;
};

/** Admins only. Takes the group, its memberships and its posts with it. */
export const deleteGroup = async (id: string) => {
  await api.delete(`/groups/${id}`);
};

/** `status` asks for the waiting rows instead: invited, or requested. */
export const listGroupMembers = async (
  id: string,
  { status = "active", limit = 50 }: { status?: GroupStatus; limit?: number } = {},
) => {
  const { data } = await api.get<{ members: ApiGroupMember[] }>(`/groups/${id}/members`, {
    params: { status, limit },
  });
  return data.members;
};

/**
 * A public group lets you in; a private one files a request. The reply says
 * which happened, so the caller can put the right words on screen.
 */
export const joinGroup = async (id: string) => {
  const { data } = await api.post<{ status: "active" | "requested"; message: string }>(
    `/groups/${id}/members`,
  );
  return data;
};

export const leaveGroup = async (id: string) => {
  await api.delete(`/groups/${id}/members`);
};

export interface InviteResult {
  invited: string[];
  approved: string[];
  awaitingAdmin: string[];
}

/** Any member can ask people in. Nobody joins until they accept. */
export const inviteToGroup = async (id: string, userIds: string[]) => {
  const { data } = await api.post<InviteResult>(`/groups/${id}/invites`, { userIds });
  return data;
};

/**
 * Accepting an invitation addressed to you (pass your own id), or an admin
 * letting a join request in (pass theirs).
 */
export const approveGroupMember = async (id: string, userId: string) => {
  await api.patch(`/groups/${id}/members/${userId}`);
};

/**
 * Takes one row off the group: removing a member, declining a request,
 * withdrawing an invitation, or turning down one sent to you.
 */
export const removeGroupMember = async (id: string, userId: string) => {
  await api.delete(`/groups/${id}/members/${userId}`);
};

/** Makes someone an admin, or takes it back. Admins only. */
export const setGroupMemberRole = async (
  id: string,
  userId: string,
  role: "admin" | "member",
) => {
  await api.put(`/groups/${id}/members/${userId}/role`, { role });
};

/** A group with no cover of its own still gets a stable picture. */
export const groupCover = (group: Pick<ApiGroup, "id" | "coverUrl">, width = 900, height = 400) =>
  coverOf(group.coverUrl);

export const describePrivacy = (privacy: ApiGroup["privacy"]) =>
  privacy === "private" ? "Private group" : "Public group";

/** What the join button should say, given where you stand with the group. */
export const joinLabel = (group: ApiGroup) => {
  if (group.viewerStatus === "requested") return "Requested";
  if (group.viewerStatus === "invited") return "Accept invitation";
  return group.privacy === "private" ? "Request to join" : "Join group";
};
