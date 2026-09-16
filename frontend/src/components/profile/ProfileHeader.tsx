import { useState } from "react";
import type { User } from "../../data";
import { PhotoUploadButton } from "./PhotoUploadButton";
import { EditProfileModal } from "./EditProfileModal";
import { formatCount } from "../../lib/format";
import { Icon, VerifiedBadge } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../lib/cn";

export const profileTabs = ["Posts", "About", "Friends", "Photos", "Videos"] as const;
export type ProfileTab = (typeof profileTabs)[number];

/** How the signed-in account relates to the profile being viewed. */
export type Relationship = "self" | "friends" | "sent" | "received" | "none";

const friendButton: Record<Relationship, { label: string; icon: IconName; disabled: boolean }> = {
  self: { label: "Add to story", icon: "plus", disabled: false },
  friends: { label: "Friends", icon: "check", disabled: true },
  sent: { label: "Request sent", icon: "clock", disabled: true },
  received: { label: "Confirm request", icon: "user-plus", disabled: false },
  none: { label: "Add friend", icon: "user-plus", disabled: false },
};

export function ProfileHeader({
  user,
  isSelf,
  tab,
  onTab,
  relationship = "none",
  onFriendAction,
  friendFaces = [],
  busy = false,
}: {
  user: User;
  isSelf: boolean;
  tab: ProfileTab;
  onTab: (tab: ProfileTab) => void;
  relationship?: Relationship;
  onFriendAction?: () => void;
  friendFaces?: { id: string; name: string; avatar: string }[];
  busy?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const action = friendButton[isSelf ? "self" : relationship];

  return (
    <header className="bg-surface shadow-card">
      <div className="mx-auto w-full max-w-[59rem] px-4">
        <div className="relative">
          <img
            src={user.cover}
            alt={`${user.name} cover`}
            className="h-40 w-full rounded-b-card bg-surface-raised object-cover sm:h-56 lg:h-[21rem]"
          />
          {isSelf && (
            <PhotoUploadButton
              field="profileUrl"
              label="Change cover photo"
              onError={setPhotoError}
              className="absolute right-3 bottom-3 h-9 gap-2 px-3 text-sm font-semibold"
            />
          )}
        </div>

        <div className="flex flex-col items-center gap-3 pb-3 md:flex-row md:items-end md:gap-5">
          <div className="relative -mt-10 md:-mt-8">
            <Avatar
              src={user.avatar}
              alt={user.name}
              size={168}
              className="rounded-pill border-4 border-surface"
            />
            {isSelf && (
              <PhotoUploadButton
                field="avatarUrl"
                label="Change profile photo"
                onError={setPhotoError}
                className="absolute right-2 bottom-2 size-10"
              />
            )}
          </div>

          <div className="flex-1 pb-2 text-center md:pb-4 md:text-left">
            <h1 className="flex items-center justify-center gap-2 text-3xl font-bold text-ink md:justify-start">
              {user.name}
              {user.isVerified && <VerifiedBadge size={20} />}
            </h1>
            <p className="text-sm font-medium text-ink-muted">
              {formatCount(user.friendCount)} friends
              {user.mutualFriendCount > 0 && ` · ${user.mutualFriendCount} mutual`}
            </p>
            {friendFaces.length > 0 && (
              <div className="flex justify-center pt-2 md:justify-start">
                {friendFaces.slice(0, 8).map((friend) => (
                  <img
                    key={friend.id}
                    src={friend.avatar}
                    alt={friend.name}
                    title={friend.name}
                    className="-ml-2 size-8 rounded-pill border-2 border-surface object-cover first:ml-0"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pb-4">
            <button
              onClick={onFriendAction}
              disabled={action.disabled || busy}
              className={cn(
                "flex items-center gap-2 rounded-control px-4 py-2 text-sm font-semibold",
                action.disabled
                  ? "cursor-not-allowed bg-surface-raised text-ink-muted"
                  : "bg-brand text-white hover:bg-brand-hover disabled:opacity-60",
              )}
            >
              <Icon name={action.icon} size={15} />
              {action.label}
            </button>
            <button
              onClick={() => isSelf && setEditing(true)}
              className="flex items-center gap-2 rounded-control bg-surface-raised px-4 py-2 text-sm font-semibold text-ink hover:bg-line"
            >
              <Icon name={isSelf ? "edit" : "messenger"} size={15} />
              {isSelf ? "Edit profile" : "Message"}
            </button>
            <button
              aria-label="More"
              className="grid size-9 place-items-center rounded-control bg-surface-raised text-ink hover:bg-line"
            >
              <Icon name="caret" size={14} />
            </button>
          </div>
        </div>

        {photoError && (
          <p role="alert" className="pb-2 text-sm text-alert">
            {photoError}
          </p>
        )}

        <hr className="border-line" />

        <nav className="flex items-center gap-1 overflow-x-auto">
          {profileTabs.map((item) => (
            <button
              key={item}
              onClick={() => onTab(item)}
              className={cn(
                "relative px-4 py-3.5 text-[0.95rem] font-medium",
                tab === item ? "text-brand" : "text-ink-muted hover:bg-surface-hover",
              )}
            >
              {item}
              {tab === item && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-sm bg-brand" />
              )}
            </button>
          ))}
          <button
            aria-label="More tabs"
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-pill text-ink-muted hover:bg-surface-hover"
          >
            <Icon name="dots" size={16} />
          </button>
        </nav>
      </div>

      {editing && <EditProfileModal onClose={() => setEditing(false)} />}
    </header>
  );
}
