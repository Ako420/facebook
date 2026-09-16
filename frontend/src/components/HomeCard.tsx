import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/icons/Icon";
import type { IconName } from "../components/icons/Icon";
import { cn } from "../lib/cn";
import { ReelsRow } from "../components/feed/ReelsRow";
import { StoryRail } from "../components/feed/StoryRail";

type Tab = "Story" | "Reels";

const tabs: { label: Tab; icon: IconName }[] = [
  { label: "Story", icon: "video-camera" },
  { label: "Reels", icon: "image-solid" },
];

export default function HomeCard() {
  const [active, setActive] = useState<Tab>("Story");

  return (
    <Card>
      <div className="flex items-center py-4">
        {tabs.map((tab) => {
          const isActive = active === tab.label;

          return (
            <button
              key={tab.label}
              aria-label={tab.label}
              aria-pressed={isActive}
              onClick={() => setActive(tab.label)}
              className={cn(
                "relative flex flex-1 items-center justify-center",
                isActive ? "text-brand" : "text-ink-muted",
              )}
            >
              <Icon name={tab.icon} size={22} />
              <span className="hidden pl-2 sm:inline">{tab.label}</span>
              {isActive && (
                <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-t-sm bg-brand" />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-2 py-2">
        {active === "Story" ? <StoryRail /> : <ReelsRow />}
      </div>
    </Card>
  );
}
