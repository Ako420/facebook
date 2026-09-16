import { useState } from "react";
import { composerPrompt, currentUser } from "../../data";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { Card } from "../ui/Card";
import { useAuth } from "../../features/auth/AuthContext";
import { ComposerModal } from "./ComposerModal";

const actions: { label: string; icon: IconName; color: string }[] = [
  { label: "Live video", icon: "video-camera", color: "text-[#f3425f]" },
  { label: "Photo/video", icon: "image-solid", color: "text-[#41b35d]" },
  { label: "Feeling/activity", icon: "smile-solid", color: "text-[#f7b125]" },
];

export function Composer({
  groupId,
  audience,
  prompt,
}: {
  /** Publishes into a group instead of the main feed. */
  groupId?: string;
  audience?: { label: string; icon: IconName };
  prompt?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);


  const author = {
    name: user?.name ?? currentUser.name,
    avatar: user?.avatarUrl || currentUser.avatar,
  };

  return (
    <>
      <Card className="px-gutter py-3">
        <div className="flex items-center gap-2">
          <Avatar src={author.avatar} alt={author.name} size={40} />
          <button
            onClick={() => setOpen(true)}
            className="flex-1 rounded-pill bg-surface-raised px-4 py-2.5 text-left text-[0.95rem] text-ink-muted hover:bg-line"
          >
            {prompt ?? composerPrompt(author.name.split(" ")[0])}
          </button>
        </div>

        <hr className="my-3 border-line" />

        <div className="flex items-center">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => setOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-control py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover"
            >
              <Icon name={action.icon} size={20} className={action.color} />
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {open && (
        <ComposerModal
          author={author}
          groupId={groupId}
          audience={audience}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
