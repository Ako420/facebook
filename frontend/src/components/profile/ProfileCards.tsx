import type { ReactNode } from "react";
import type { User } from "../../lib/types";
import { formatFullDate } from "../../lib/format";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { Card, CardTitle } from "../ui/Card";
import { useNavigate } from "react-router-dom";

function Detail({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-[0.95rem] text-ink">
      <Icon name={icon} size={18} className="text-ink-faint" />
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

export function IntroCard({ user, isSelf }: { user: User; isSelf: boolean }) {
  return (
    <Card className="flex flex-col gap-3 px-gutter py-3">
      <h2 className="text-lg font-semibold text-ink">Intro</h2>
      {user.bio && <p className="text-center text-[0.95rem] text-ink">{user.bio}</p>}

      <ul className="flex flex-col gap-2.5">
        {user.work && <Detail icon="briefcase">{user.work}</Detail>}
        {user.location && <Detail icon="map-pin">Lives in {user.location}</Detail>}
        <Detail icon="calendar">Joined {formatFullDate(user.joinedAt).split(" at")[0]}</Detail>
        <Detail icon="users">{user.friendCount} friends</Detail>
      </ul>

      {isSelf && (
        <button className="rounded-control bg-surface-raised py-1.5 text-sm font-semibold text-ink hover:bg-line">
          Edit details
        </button>
      )}
    </Card>
  );
}

export function PhotosCard({ photos }: { photos: string[] }) {
  return (
    <Card className="pb-3">
      <CardTitle title="Photos" action="See all photos" />
      <div className="grid grid-cols-3 gap-1 px-gutter pt-2">
        {photos.length === 0 && (
          <p className="col-span-3 py-2 text-sm text-ink-muted">No photos yet.</p>
        )}
        {photos.slice(0, 9).map((src, index) => (
          <img
            key={src}
            src={src}
            alt={`Photo ${index + 1}`}
            loading="lazy"
            className="aspect-square w-full rounded-media bg-surface-raised object-cover"
          />
        ))}
      </div>
    </Card>
  );
}


export interface FriendTile {
  id: string;
  name: string;
  avatar: string;
}


export function FriendsCard({ people }: { people?: FriendTile[] }) {
  const navigate = useNavigate();
  const all: FriendTile[] = people ?? [];
  const list = all.slice(0, 9);

  return (
    <Card className="pb-3">
      <CardTitle title="Friends" action="See all friends" />
      <p className="px-gutter text-sm text-ink-muted">{all.length} friends</p>
      <div className="grid grid-cols-3 gap-2 px-gutter pt-2">
        {list.length === 0 && (
          <p className="col-span-3 py-2 text-sm text-ink-muted">No friends yet.</p>
        )}
        {list.map((friend) => (
          <button key={friend.id} onClick={() => navigate(`/profile/${friend.id}`)}>
            <img
              src={friend.avatar}
              alt={friend.name}
              loading="lazy"
              className="aspect-square w-full rounded-media bg-surface-raised object-cover"
            />
            <span className="block truncate pt-1 text-left text-xs font-medium text-ink">
              {friend.name}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
