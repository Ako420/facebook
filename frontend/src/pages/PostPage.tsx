import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Post } from "../lib/types";
import { PostCard } from "../components/feed/PostCard";
import { Icon } from "../components/icons/Icon";
import { Card } from "../components/ui/Card";
import { toApiFailure } from "../lib/api";
import { getPost, toFeedPost } from "../features/posts/postApi";

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;

    setPost(null);
    setError("");
    getPost(id)
      .then((found) => active && setPost(toFeedPost(found)))
      .catch((caught) => active && setError(toApiFailure(caught).message));

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="mx-auto w-full max-w-2xl px-2 py-4 sm:px-4">
      {error ? (
        <Card className="grid place-items-center gap-2 px-gutter py-10 text-center">
          <Icon name="image" size={28} className="text-ink-faint" />
          <p className="text-[0.95rem] font-semibold text-ink">This post isn't available</p>
          <p className="text-sm text-ink-muted">{error}</p>
        </Card>
      ) : !post ? (
        <p className="p-6 text-sm text-ink-muted">Loading post…</p>
      ) : (
        <PostCard
          key={post.id}
          post={post}
          initiallyShowComments
          onDeleted={() => navigate("/")}
        />
      )}
    </div>
  );
}
