import { useState } from "react";
import type { Comment } from "../../data";
import { asAuthor, currentUser } from "../../data";
import { formatRelativeTime } from "../../lib/format";
import { Icon } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../lib/cn";
import { useNavigate } from "react-router-dom";

function CommentRow({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(comment.viewerLiked);
  const likes = comment.likeCount + (liked === comment.viewerLiked ? 0 : liked ? 1 : -1);

  return (
    <li className={cn("flex gap-2", depth > 0 && "ml-8")}>
      <Avatar
        src={comment.author.avatar}
        alt={comment.author.name}
        size={32}
        onClick={() => navigate(`/profile/${comment.author.id}`)}
      />
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-2xl bg-surface-raised px-3 py-2">
          <p className="text-[0.8rem] font-semibold text-ink">{comment.author.name}</p>
          <p className="text-[0.9rem] break-words text-ink">{comment.text}</p>
        </div>

        <div className="flex items-center gap-3 px-3 pt-1 text-xs text-ink-muted">
          <button
            onClick={() => setLiked((value) => !value)}
            className={cn("font-semibold hover:underline", liked && "text-brand")}
          >
            Like
          </button>
          <button className="font-semibold hover:underline">Reply</button>
          <span>{formatRelativeTime(comment.createdAt)}</span>
          {likes > 0 && (
            <span className="flex items-center gap-1 rounded-pill bg-surface-raised px-1.5 py-0.5">
              <Icon name="thumb-solid" size={10} className="text-brand" />
              {likes}
            </span>
          )}
        </div>

        {comment.replies.length > 0 && (
          <ul className="flex flex-col gap-3 pt-3">
            {comment.replies.map((reply) => (
              <CommentRow key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function CommentThread({ comments }: { comments: Comment[] }) {
  const [list, setList] = useState(comments);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setList((current) => [
      ...current,
      {
        id: `c-${Date.now()}`,
        author: asAuthor(currentUser),
        text,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        viewerLiked: false,
        replies: [],
      },
    ]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-3 px-gutter pb-3">
      <div className="flex items-center gap-2">
        <Avatar src={currentUser.avatar} alt={currentUser.name} size={32} />
        <div className="flex flex-1 items-center gap-2 rounded-pill bg-surface-raised px-3 py-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            placeholder="Write a comment..."
            className="flex-1 bg-transparent text-sm text-ink outline-none"
          />
          <button onClick={submit} aria-label="Post comment" className="text-ink-muted hover:text-brand">
            <Icon name="send" size={15} />
          </button>
        </div>
      </div>

      {list.length > 0 && (
        <ul className="flex flex-col gap-3">
          {list.map((comment) => (
            <CommentRow key={comment.id} comment={comment} />
          ))}
        </ul>
      )}
    </div>
  );
}
