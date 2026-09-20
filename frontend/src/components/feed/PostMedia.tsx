import type { LinkPreview, MediaItem } from "../../lib/types";
import { cn } from "../../lib/cn";

function Frame({ item, className }: { item: MediaItem; className?: string }) {
  if (item.type === "video")
    return (
      <video
        src={item.url}
        poster={item.poster}
        controls
        preload="none"
        className={cn("w-full bg-black object-cover", className)}
      />
    );

  return (
    <img
      src={item.url}
      alt={item.alt}
      loading="lazy"
      className={cn("w-full bg-surface-raised object-fill", className)}
    />
  );
}

export function PostMedia({ media }: { media: MediaItem[] }) {
  if (media.length === 0) return null;

  if (media.length === 1)
    return <Frame item={media[0]} className="max-h-152" />;

  if (media.length === 2)
    return (
      <div className="grid grid-cols-2 gap-0.5 [&::-webkit-scrollbar]:hidden">
        {media.map((item) => (
          <Frame key={item.url} item={item} className="aspect-square" />
        ))}
      </div>
    );

  if (media.length === 3)
    return (
      <div className="grid grid-cols-2 gap-0.5">
        <Frame item={media[0]} className="col-span-2 aspect-2/1" />
        {media.slice(1).map((item) => (
          <Frame key={item.url} item={item} className="aspect-square" />
        ))}
      </div>
    );

  const shown = media.slice(0, 4);
  const hidden = media.length - shown.length;

  return (
    <div className="grid grid-cols-2 gap-0.5">
      {shown.map((item, index) => (
        <div key={item.url} className="relative">
          <Frame item={item} className="aspect-4/3" />
          {index === 3 && hidden > 0 && (
            <div className="absolute inset-0 grid place-items-center bg-black/55 text-2xl font-semibold text-white">
              +{hidden}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function LinkCard({ link }: { link: LinkPreview }) {
  return (
    <a href={link.url} target="_blank" rel="noreferrer" className="block">
      <img src={link.image} alt={link.title} loading="lazy" className="w-full bg-surface-raised object-cover" />
      <div className="bg-surface-raised px-gutter py-2">
        <p className="text-xs tracking-wide text-ink-faint uppercase">{link.domain}</p>
        <p className="truncate text-base font-semibold text-ink">{link.title}</p>
        <p className="line-clamp-1 text-sm text-ink-muted">{link.description}</p>
      </div>
    </a>
  );
}
