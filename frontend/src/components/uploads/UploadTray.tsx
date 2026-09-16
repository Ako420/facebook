import { Icon } from "../icons/Icon";
import { cn } from "../../lib/cn";
import { useUploads } from "../../features/uploads/UploadsProvider";
import type { UploadJob } from "../../features/uploads/UploadsProvider";

const noun = (job: UploadJob) => (job.kind === "reel" ? "Reel" : "Post");

const headline = (job: UploadJob) => {
  if (job.status === "failed") return `${noun(job)} did not go up`;
  if (job.status === "done") return `${noun(job)} shared`;
  if (job.status === "publishing") return `Finishing your ${noun(job).toLowerCase()}`;
  if (job.status === "queued") return `${noun(job)} waiting its turn`;
  return `Uploading your ${noun(job).toLowerCase()}`;
};

function JobRow({ job }: { job: UploadJob }) {
  const { retry, dismiss } = useUploads();
  const busy = job.status === "uploading" || job.status === "publishing";

  return (
    <li className="flex gap-3 rounded-card bg-surface p-3 shadow-card">
      {job.thumb ? (
        <img
          src={job.thumb}
          alt=""
          className="size-11 shrink-0 rounded-media bg-surface-raised object-cover"
        />
      ) : (
        <span className="grid size-11 shrink-0 place-items-center rounded-media bg-surface-raised text-ink-faint">
          <Icon name="edit" size={16} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          {job.status === "done" && <Icon name="check" size={11} className="text-brand" />}
          <span className="truncate">{headline(job)}</span>
        </p>

        {job.audienceLabel && job.status !== "failed" && (
          <p className="truncate text-xs text-ink-faint">to {job.audienceLabel}</p>
        )}

        {busy && (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-raised">
            <div
              className={cn(
                "h-full rounded-pill bg-brand transition-[width] duration-200",
                job.status === "publishing" && "animate-pulse",
              )}
              style={{ width: `${job.status === "publishing" ? 100 : job.progress}%` }}
            />
          </div>
        )}

        {job.status === "uploading" && job.files.length > 0 && (
          <p className="pt-1 text-xs text-ink-faint">{job.progress}%</p>
        )}

        {job.status === "failed" && (
          <>
            <p className="pt-0.5 text-xs text-ink-muted">{job.error}</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => retry(job.id)}
                className="rounded-control bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-hover"
              >
                Retry
              </button>
              <button
                onClick={() => dismiss(job.id)}
                className="rounded-control bg-surface-raised px-3 py-1 text-xs font-semibold text-ink hover:bg-line"
              >
                Discard
              </button>
            </div>
          </>
        )}
      </div>

      {/* Nothing in flight can be cancelled halfway, so the close is only
          offered once a job has stopped moving. */}
      {!busy && job.status !== "failed" && (
        <button
          aria-label="Dismiss"
          onClick={() => dismiss(job.id)}
          className="grid size-7 shrink-0 place-items-center self-start rounded-pill text-ink-faint hover:bg-surface-hover"
        >
          <Icon name="close" size={11} />
        </button>
      )}
    </li>
  );
}

/**
 * Sits above the bottom bar on a phone and in the corner on a desktop, so a
 * post keeps going wherever the user wanders off to.
 */
export function UploadTray() {
  const { jobs } = useUploads();
  if (jobs.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed right-3 bottom-17 z-90 w-[min(20rem,calc(100vw-1.5rem))] lg:right-4 lg:bottom-4"
    >
      <ul className="flex flex-col gap-2">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </ul>
    </div>
  );
}
