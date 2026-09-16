import { api } from "../../lib/api";
import type { ReactionType } from "../../data";

/* ---- Comments ------------------------------------------------------------ */


export interface ApiComment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name?: string; avatarUrl?: string };
}

export const listComments = async (postId: string) => {
  const { data } = await api.get<{ comments: ApiComment[] }>(`/comment/${postId}`);
  return data.comments;
};

export const createComment = async (postId: string, commentText: string) => {
  const { data } = await api.post<{ comment: ApiComment }>(`/comment/${postId}`, {
    commentText,
  });
  return data.comment;
};

export const deleteComment = async (commentId: string) => {
  await api.delete(`/comment/${commentId}`);
};

/* ---- Reactions ----------------------------------------------------------- */


export const REACTION_CODES: Record<ReactionType, number> = {
  like: 1,
  love: 2,
  care: 3,
  haha: 4,
  wow: 5,
  sad: 6,
  angry: 7,
};

const CODE_TO_REACTION = Object.fromEntries(
  Object.entries(REACTION_CODES).map(([name, code]) => [code, name]),
) as Record<number, ReactionType>;

export const reactionFromCode = (code: number | null | undefined): ReactionType | null =>
  code == null ? null : (CODE_TO_REACTION[code] ?? null);

export interface ApiReactions {
  counts: Record<string, number>;
  total: number;
  viewerReaction: number | null;
}

export const setReaction = async (postId: string, type: ReactionType) => {
  const { data } = await api.put<{ reactions: ApiReactions }>(
    `/posts/${postId}/reaction`,
    { type: REACTION_CODES[type] },
  );
  return data.reactions;
};

export const removeReaction = async (postId: string) => {
  const { data } = await api.delete<{ reactions: ApiReactions }>(
    `/posts/${postId}/reaction`,
  );
  return data.reactions;
};
