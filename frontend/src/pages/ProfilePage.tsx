import { useCallback, useEffect, useMemo, useState } from "react";
import { avatarOf, coverOf } from "../lib/images";
import type { User } from "../lib/types";
import { formatCount } from "../lib/format";
import { Composer } from "../components/feed/Composer";
import { usePublishedPosts } from "../features/uploads/UploadsProvider";
import { PostCard } from "../components/feed/PostCard";
import { Icon } from "../components/icons/Icon";
import { FriendsCard, IntroCard, PhotosCard } from "../components/profile/ProfileCards";
import { ProfileHeader } from "../components/profile/ProfileHeader";
import type { ProfileTab, Relationship } from "../components/profile/ProfileHeader";
import { Card, CardTitle } from "../components/ui/Card";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { toProfileUser } from "../features/auth/profileUser";
import { fetchUserById } from "../features/auth/authApi";
import type { AuthUser } from "../features/auth/authApi";
import { listPosts, toFeedPost, toReel } from "../features/posts/postApi";
import type { ApiPost } from "../features/posts/postApi";
import {
  listFriends,
  respondToRequest,
  sendFriendRequest,
  toPerson,
} from "../features/friends/friendApi";
import type { FriendEdge, FriendLists } from "../features/friends/friendApi";


const isBackendId = (value?: string): value is string =>
  Boolean(value && /^[0-9a-f]{24}$/i.test(value));

const unknownProfile = (id: string): User => ({
  id,
  name: "Facebook user",
  username: "",
  avatar: avatarOf(),
  cover: coverOf(),
  bio: "",
  location: "",
  work: "",
  isVerified: false,
  isOnline: false,
  lastActiveAt: new Date().toISOString(),
  joinedAt: new Date().toISOString(),
  friendCount: 0,
  mutualFriendCount: 0,
  isFriend: false,
});

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ProfileTab>("Posts");

  const { user: account } = useAuth();

  const isSelf = Boolean(account) && (!id || id === account?.id);

  const [livePosts, setLivePosts] = useState<ApiPost[]>([]);
  const [lists, setLists] = useState<FriendLists>({ friends: [], incoming: [], outgoing: [] });
  const [reels, setReels] = useState<ApiPost[]>([]);
  const [friendBusy, setFriendBusy] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [viewed, setViewed] = useState<AuthUser | null>(null);

  const backendId = isSelf ? account?.id : isBackendId(id) ? id : undefined;

  useEffect(() => {
    if (!backendId) {
      setLivePosts([]);
      return;
    }

    let active = true;
    setLoadingPosts(true);

    listPosts({ userId: backendId })
      .then((feed) => active && setLivePosts(feed.posts))
      .catch(() => active && setLivePosts([]))
      .finally(() => active && setLoadingPosts(false));

    return () => {
      active = false;
    };
  }, [backendId]);

 
 
  useEffect(() => {
    if (isSelf || !isBackendId(id)) {
      setViewed(null);
      return;
    }

    let active = true;
    fetchUserById(id)
      .then((person) => active && setViewed(person))
      .catch(() => active && setViewed(null));

    return () => {
      active = false;
    };
  }, [isSelf, id]);

  // Your own timeline gains the post once it finishes in the background.
  usePublishedPosts((post) => {
    if (!isSelf || post.type === "reel" || post.groupId) return;
    setLivePosts((current) => [post, ...current]);
  });

  const loadFriends = useCallback(() => {
    listFriends()
      .then(setLists)
      .catch(() => undefined);
  }, []);

  useEffect(loadFriends, [loadFriends]);

  useEffect(() => {
    if (!backendId) {
      setReels([]);
      return;
    }

    let active = true;
    listPosts({ userId: backendId, type: "reel" })
      .then((feed) => active && setReels(feed.posts))
      .catch(() => active && setReels([]));

    return () => {
      active = false;
    };
  }, [backendId]);

  const user = useMemo(() => {
    if (isSelf && account) return toProfileUser(account);

    
    if (viewed) return toProfileUser(viewed);

    if (isBackendId(id)) {
      const known = lists.friends.find((edge) => edge.user.id === id);
      if (known) return toPerson(known.user);
    }

    return unknownProfile(id ?? "");
  }, [isSelf, account, id, lists, viewed]);

  // Only your own friend list is reachable, so another profile shows none.
  const friendTiles = isSelf
    ? lists.friends.map((edge) => {
        const person = toPerson(edge.user);
        return { id: person.id, name: person.name, avatar: person.avatar };
      })
    : [];

  const posts = livePosts.map(toFeedPost);
  const profileReels = reels.map(toReel);
  const photos = livePosts.flatMap((post) => post.imageUrl);

  const edge =
    lists.friends.find((row) => row.user.id === id) ??
    lists.outgoing.find((row) => row.user.id === id) ??
    lists.incoming.find((row) => row.user.id === id);

  const relationship: Relationship = isSelf
    ? "self"
    : lists.friends.some((row) => row.user.id === id)
      ? "friends"
      : lists.outgoing.some((row) => row.user.id === id)
        ? "sent"
        : lists.incoming.some((row) => row.user.id === id)
          ? "received"
          : "none";

  const onFriendAction = async () => {
    if (isSelf || !id || friendBusy) return;

    setFriendBusy(true);
    try {
      if (relationship === "none") await sendFriendRequest(id);
      else if (relationship === "received" && edge) await respondToRequest(edge.id, "accepted");
      loadFriends();
    } catch {
      // the button state simply stays as it was
    } finally {
      setFriendBusy(false);
    }
  };

  return (
    <div className="pb-4">
      <ProfileHeader
        user={user}
        isSelf={isSelf}
        tab={tab}
        onTab={setTab}
        relationship={relationship}
        onFriendAction={onFriendAction}
        friendFaces={friendTiles}
        busy={friendBusy}
      />

      <div className="mx-auto grid w-full max-w-[59rem] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <IntroCard user={user} isSelf={isSelf} />
          <PhotosCard photos={photos} />
          <FriendsCard people={friendTiles} />
        </div>

        <div className="flex flex-col gap-4">
          {tab === "Posts" && (
            <>
              {isSelf && (
                <Composer />
              )}
              {loadingPosts ? (
                <Card className="px-gutter py-6 text-center text-sm text-ink-muted">
                  Loading posts…
                </Card>
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDeleted={(deletedId) =>
                      setLivePosts((current) => current.filter((item) => item.id !== deletedId))
                    }
                  />
                ))
              ) : (
                <Card className="grid place-items-center gap-2 px-gutter py-10 text-center">
                  <Icon name="image" size={28} className="text-ink-faint" />
                  <p className="text-[0.95rem] font-semibold text-ink">No posts yet</p>
                  <p className="text-sm text-ink-muted">
                    When {isSelf ? "you share" : `${user.name.split(" ")[0]} shares`} something, it
                    will show up here.
                  </p>
                </Card>
              )}
            </>
          )}

          {tab === "About" && (
            <Card className="flex flex-col gap-3 px-gutter py-4">
              <h2 className="text-lg font-semibold text-ink">About</h2>
              <p className="text-[0.95rem] text-ink">{user.bio || "Nothing to see here yet."}</p>
              <dl className="grid gap-2 text-[0.95rem]">
                <div className="flex gap-2">
                  <dt className="w-24 text-ink-muted">Work</dt>
                  <dd className="text-ink">{user.work || "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 text-ink-muted">Lives in</dt>
                  <dd className="text-ink">{user.location}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 text-ink-muted">Username</dt>
                  <dd className="text-ink">@{user.username}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 text-ink-muted">Friends</dt>
                  <dd className="text-ink">{formatCount(user.friendCount)}</dd>
                </div>
              </dl>
            </Card>
          )}

          {tab === "Friends" && (
            <Card className="pb-4">
              <CardTitle title={`Friends (${friendTiles.length})`} />
              {friendTiles.length === 0 && (
                <p className="px-gutter pt-2 text-sm text-ink-muted">
                  {isSelf ? "You have not added anyone yet." : "Only your own friend list is available."}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 px-gutter pt-3 sm:grid-cols-3">
                {friendTiles.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => navigate(`/profile/${friend.id}`)}
                    className="flex items-center gap-2 rounded-media bg-surface-raised p-2 text-left hover:bg-line"
                  >
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      loading="lazy"
                      className="size-14 rounded-media object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {friend.name}
                      </span>
                      <span className="block truncate text-xs text-ink-faint">
                        Friend
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {tab === "Photos" && (
            <Card className="pb-4">
              <CardTitle title="Photos" />
              {photos.length === 0 ? (
                <p className="px-gutter pt-2 text-sm text-ink-muted">No photos yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 px-gutter pt-3">
                  {photos.map((src, index) => (
                    <img
                      key={`${src}-${index}`}
                      src={src}
                      alt={`Photo ${index + 1}`}
                      loading="lazy"
                      className="aspect-square w-full rounded-media bg-surface-raised object-cover"
                    />
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === "Videos" && (
            <Card className="pb-4">
              <CardTitle title="Videos" action="Go to Reels" onAction={() => navigate("/reels")} />
              {profileReels.length === 0 && (
                <p className="px-gutter pt-2 text-sm text-ink-muted">No videos yet.</p>
              )}
              <div className="grid grid-cols-2 gap-2 px-gutter pt-3 sm:grid-cols-3">
                {profileReels.map((reel) => (
                  <button
                    key={reel.id}
                    onClick={() => navigate("/reels")}
                    className="relative aspect-[9/16] overflow-hidden rounded-media"
                  >
                    <img
                      src={reel.video.poster}
                      alt={reel.video.alt}
                      loading="lazy"
                      className="size-full bg-surface-raised object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-2 text-xs text-white">
                      <Icon name="play" size={10} />
                      {formatCount(reel.viewCount)}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
