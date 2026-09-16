import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createPost, discardUploads, uploadMedia } from "../posts/postApi";
import type { ApiPost, UploadedMedia } from "../posts/postApi";
import { toApiFailure } from "../../lib/api";

export type UploadStatus = "queued" | "uploading" | "publishing" | "done" | "failed";

export interface UploadJob {
  id: string;
  kind: "post" | "reel";
  text: string;
  files: File[];
  /** Object URL for the tray's thumbnail, owned by this job. */
  thumb: string | null;
  groupId?: string;
  audienceLabel?: string;
  status: UploadStatus;
  progress: number;
  error: string;
  /**
   * Kept once the files are on Cloudinary, so a failure at the publish step
   * retries the publish rather than sending the video up a second time.
   */
  uploaded?: UploadedMedia[];
}

export interface UploadDraft {
  kind: "post" | "reel";
  text: string;
  files: File[];
  groupId?: string;
  audienceLabel?: string;
}

interface UploadsValue {
  jobs: UploadJob[];
  /** Hands the post off to the background and returns immediately. */
  enqueue: (draft: UploadDraft) => void;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
  /** Called with every post that lands, so pages can drop it into their list. */
  subscribe: (handler: (post: ApiPost) => void) => () => void;
}

const UploadsContext = createContext<UploadsValue | null>(null);

const newId = () =>
  `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const describe = (caught: unknown) => {
  const failure = toApiFailure(caught);
  return failure.errors.media || failure.errors.title || failure.message;
};

export function UploadsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  // The ref is the source of truth: the runner reads it straight after a state
  // change, which is too early for React to have re-rendered.
  const jobsRef = useRef<UploadJob[]>([]);
  const running = useRef(new Set<string>());
  const listeners = useRef(new Set<(post: ApiPost) => void>());

  const commit = useCallback((next: UploadJob[]) => {
    jobsRef.current = next;
    setJobs(next);
  }, []);

  const patch = useCallback(
    (id: string, changes: Partial<UploadJob>) => {
      commit(jobsRef.current.map((job) => (job.id === id ? { ...job, ...changes } : job)));
    },
    [commit],
  );

  const drop = useCallback(
    (id: string) => {
      const job = jobsRef.current.find((row) => row.id === id);
      if (job?.thumb) URL.revokeObjectURL(job.thumb);

      // Giving up on a post that got as far as uploading leaves the files on
      // Cloudinary, so hand them back before the job disappears.
      if (job?.status === "failed" && job.uploaded?.length) {
        void discardUploads(
          job.uploaded.map((row) => row.publicId).filter(Boolean) as string[],
        ).catch(() => undefined);
      }

      commit(jobsRef.current.filter((row) => row.id !== id));
    },
    [commit],
  );

  /**
   * One job at a time. Two large videos racing each other only makes both of
   * them slower, and the first one finishing sooner is what the user wants.
   */
  const run = useCallback(
    async function run(): Promise<void> {
      if (running.current.size > 0) return;

      const job = jobsRef.current.find((row) => row.status === "queued");
      if (!job) return;

      running.current.add(job.id);
      patch(job.id, {
        status: "uploading",
        error: "",
        progress: job.uploaded ? 100 : 0,
      });

      try {
        const media =
          job.uploaded ??
          (job.files.length
            ? await uploadMedia(job.files, (percent) =>
                patch(job.id, { progress: percent }),
              )
            : []);

        patch(job.id, { uploaded: media, status: "publishing", progress: 100 });

        const post = await createPost({
          title: job.text,
          imageUrl: media.filter((row) => row.type === "image").map((row) => row.url),
          videoUrl: media.filter((row) => row.type === "video").map((row) => row.url),
          type: job.kind,
          ...(job.groupId ? { groupId: job.groupId } : {}),
        });

        patch(job.id, { status: "done" });
        listeners.current.forEach((handler) => handler(post));

        window.setTimeout(() => drop(job.id), 4000);
      } catch (caught) {
        patch(job.id, { status: "failed", error: describe(caught) });
      } finally {
        running.current.delete(job.id);
        void run();
      }
    },
    [patch, drop],
  );

  const enqueue = useCallback(
    (draft: UploadDraft) => {
      const job: UploadJob = {
        id: newId(),
        kind: draft.kind,
        text: draft.text,
        files: draft.files,
        thumb: draft.files[0] ? URL.createObjectURL(draft.files[0]) : null,
        groupId: draft.groupId,
        audienceLabel: draft.audienceLabel,
        status: "queued",
        progress: 0,
        error: "",
      };

      commit([job, ...jobsRef.current]);
      void run();
    },
    [commit, run],
  );

  const retry = useCallback(
    (id: string) => {
      patch(id, { status: "queued", error: "", progress: 0 });
      void run();
    },
    [patch, run],
  );

  const subscribe = useCallback((handler: (post: ApiPost) => void) => {
    listeners.current.add(handler);
    return () => {
      listeners.current.delete(handler);
    };
  }, []);

  // Closing the tab mid-upload loses the post, so say so first.
  useEffect(() => {
    const busy = jobs.some(
      (job) => job.status === "uploading" || job.status === "publishing",
    );
    if (!busy) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [jobs]);

  useEffect(
    () => () => jobsRef.current.forEach((job) => job.thumb && URL.revokeObjectURL(job.thumb)),
    [],
  );

  const value = useMemo<UploadsValue>(
    () => ({ jobs, enqueue, retry, dismiss: drop, subscribe }),
    [jobs, enqueue, retry, drop, subscribe],
  );

  return <UploadsContext.Provider value={value}>{children}</UploadsContext.Provider>;
}

export function useUploads() {
  const value = useContext(UploadsContext);
  if (!value) throw new Error("useUploads must be used inside <UploadsProvider>.");
  return value;
}

/**
 * Posts finish after the composer has closed, so a page says here what it
 * wants done with one when it lands.
 */
export function usePublishedPosts(handler: (post: ApiPost) => void) {
  const { subscribe } = useUploads();
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => subscribe((post) => latest.current(post)), [subscribe]);
}
