import { useEffect, useState } from "react";
import { Composer } from "../components/feed/Composer";
import { usePublishedPosts } from "../features/uploads/UploadsProvider";
import { PostCard } from "../components/feed/PostCard";
import { PageShell } from "../components/layout/PageShell";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/icons/Icon";
import HomeCard from "../components/HomeCard";
import { listPosts, toFeedPost } from "../features/posts/postApi";
import type { ApiPost } from "../features/posts/postApi";
import { toApiFailure } from "../lib/api";

export default function HomePage() {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    listPosts()
      .then((fetched) => active && setPosts(fetched))
      .catch((caught) => active && setError(toApiFailure(caught).message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  // A post finishes uploading after the composer has closed, so the feed
  // picks it up here instead.
  usePublishedPosts((post) => {
    if (post.type === "reel" || post.groupId) return;
    setPosts((current) => [post, ...current]);
  });

  return (
    <PageShell>
      <div className="mx-auto flex max-w-feed flex-col gap-4">
        <HomeCard />

        <Composer />

        {error && (
          <Card className="px-gutter py-3 text-sm text-alert">{error}</Card>
        )}

        {loading && (
          <Card className="px-gutter py-6 text-center text-sm text-ink-muted">
            Loading posts...
          </Card>
        )}

        {!loading && !error && posts.length === 0 && (
          <Card className="grid place-items-center gap-2 px-gutter py-10 text-center">
            <Icon name="image" size={28} className="text-ink-faint" />
            <p className="text-[0.95rem] font-semibold text-ink">No posts yet</p>
            <p className="text-sm text-ink-muted">
              Share something and it will show up here.
            </p>
          </Card>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={toFeedPost(post)}
            onDeleted={(id) =>
              setPosts((current) => current.filter((item) => item.id !== id))
            }
          />
        ))}
      </div>
    </PageShell>
  );
}
