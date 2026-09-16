import { useEffect, useRef, useState } from "react";
import { currentUser, headerActions } from "../../data";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/Icon";
import { Avatar } from "../ui/Avatar";
import { IconButton } from "../ui/IconButton";
import { cn } from "../../lib/cn";
import { useLocation, useNavigate } from "react-router-dom";
import { isActivePath, useGo } from "../../lib/routes";
import { useAuth } from "../../features/auth/AuthContext";
import { AccountMenu } from "./AccountMenu";
import { ChatsPanel } from "../messages/ChatsPanel";
import { NewChatModal } from "../messages/NewChatModal";
import { useMessages } from "../../features/messages/MessagesProvider";

const tabs: { id: string; label: string; icon: IconName; href: string }[] = [
  { id: "home", label: "Home", icon: "home", href: "/" },
  { id: "reels", label: "Video", icon: "video", href: "/reels" },
  { id: "friends", label: "Friends", icon: "users", href: "/friends" },
  { id: "groups", label: "Groups", icon: "users-group", href: "/groups" },
  { id: "market", label: "Marketplace", icon: "store", href: "/marketplace" },
  { id: "gaming", label: "Gaming", icon: "gamepad", href: "/gaming" },
];

const actionIcon: Record<string, IconName> = {
  menu: "grid",
  messages: "messenger",
  notifications: "bell-solid",
};

export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const go = useGo();
  const { user: account } = useAuth();
  const { unread } = useMessages();

  const [chatsOpen, setChatsOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const chats = useRef<HTMLDivElement>(null);

  // Clicking away or pressing Escape closes the chats dropdown.
  useEffect(() => {
    if (!chatsOpen) return;

    const onDown = (event: MouseEvent) => {
      if (!chats.current?.contains(event.target as Node)) setChatsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChatsOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [chatsOpen]);

  const me = {
    id: account?.id ?? currentUser.id,
    name: account?.name ?? currentUser.name,
    avatar: account?.avatarUrl || currentUser.avatar,
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-header bg-surface shadow-card">
      <div className="flex h-full items-center justify-between gap-2 px-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => navigate("/")}
            aria-label="Facebook"
            className="grid size-icon shrink-0 place-items-center rounded-pill bg-brand text-white"
          >
            <Icon name="facebook" size={22} />
          </button>

          <label className="hidden h-icon items-center gap-2 rounded-pill bg-surface-raised px-3 sm:flex">
            <Icon name="search" size={15} className="text-ink-faint" />
            <input
              placeholder="Search Facebook"
              className="w-40 bg-transparent text-sm text-ink outline-none lg:w-56"
            />
          </label>

          <IconButton name="search" label="Search" className="sm:hidden" />
        </div>

        <nav className="hidden h-full max-w-[38rem] flex-1 items-center justify-center gap-1 lg:flex">
          {tabs.map((tab) => {
            const active = isActivePath(pathname, tab.href);
            return (
              <button
                key={tab.id}
                onClick={() => go(tab.href)}
                title={tab.label}
                className={cn(
                  "relative flex h-full flex-1 items-center justify-center",
                  active ? "text-brand" : "text-ink-muted",
                )}
              >
                <span
                  className={cn(
                    "grid h-12 w-full max-w-28 place-items-center rounded-control",
                    !active && "hover:bg-surface-hover",
                  )}
                >
                  <Icon name={tab.icon} size={24} />
                </span>
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-sm bg-brand" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {headerActions
            .filter((action) => action.id !== "account")
            .map((action) =>
              action.id === "messages" ? (
                <div key={action.id} ref={chats} className="relative">
                  <IconButton
                    name="messenger"
                    label={action.label}
                    badge={unread || undefined}
                    active={chatsOpen || pathname.startsWith("/messages")}
                    onClick={() => setChatsOpen((value) => !value)}
                  />
                  {chatsOpen && (
                    <div className="absolute right-0 z-50 mt-2">
                      <ChatsPanel
                        onClose={() => setChatsOpen(false)}
                        onCompose={() => {
                          setChatsOpen(false);
                          setComposing(true);
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <IconButton
                  key={action.id}
                  name={actionIcon[action.id] ?? "grid"}
                  label={action.label}
                  badge={action.badge}
                  className={action.id === "menu" ? "hidden sm:grid" : undefined}
                />
              ),
            )}

          <AccountMenu me={me} />
        </div>
      </div>

      {composing && (
        <NewChatModal
          onClose={() => setComposing(false)}
          onStarted={(conversation) => navigate(`/messages/${conversation.id}`)}
        />
      )}
    </header>
  );
}
