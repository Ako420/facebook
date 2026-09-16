import { useEffect, useState } from "react";
import { Icon } from "../icons/Icon";
import { useAuth } from "../../features/auth/AuthContext";
import type { ProfilePatch } from "../../features/auth/authApi";
import { toApiFailure } from "../../lib/api";
import type { FieldErrors } from "../../lib/api";
import { cn } from "../../lib/cn";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface FormState {
  name: string;
  email: string;
  phone: string;
  intro: string;
  work: string;
  city: string;
  country: string;
}


const validate = (form: FormState): FieldErrors => {
  const errors: FieldErrors = {};

  if (!form.name.trim()) errors.name = "Full name is required.";
  else if (form.name.trim().length < 2)
    errors.name = "Full name must be at least 2 characters.";

  if (!form.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_REGEX.test(form.email.trim()))
    errors.email = "Please provide a valid email address.";

  const phone = form.phone.trim();
  if (phone && (phone.length < 10 || phone.length > 15))
    errors.phone = "Phone number must be between 10 and 15 characters.";

  
  const work = form.work.trim();
  if (work && work.length < 5) errors.work = "Work must be at least 5 characters.";
  if (work.length > 100) errors.work = "Work must be at most 100 characters.";

  if (form.intro.length > 200) errors.intro = "Intro must be at most 200 characters.";

  const city = form.city.trim();
  if (city && (city.length < 2 || city.length > 50))
    errors["location.city"] = "City must be between 2 and 50 characters.";

  const country = form.country.trim();
  if (country && (country.length < 2 || country.length > 50))
    errors["location.country"] = "Country must be between 2 and 50 characters.";

  return errors;
};

function Field({
  id,
  label,
  error,
  hint,
  value,
  onChange,
  ...rest
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error) || undefined}
        className={cn(
          "h-11 w-full rounded-[10px] border bg-surface-raised px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint",
          error
            ? "border-alert"
            : "border-line focus:border-brand focus:shadow-focus",
        )}
        {...rest}
      />
      {error ? (
        <p role="alert" className="mt-1 text-xs text-alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>
      )}
    </div>
  );
}

export function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { user, updateProfile } = useAuth();

  const [form, setForm] = useState<FormState>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    intro: user?.intro ?? "",
    work: user?.work ?? "",
    city: user?.location?.city ?? "",
    country: user?.location?.country ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState("");
  const [pending, setPending] = useState(false);

  const set = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const save = async () => {
    if (pending) return;

    setAlert("");
    const local = validate(form);
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }

    setErrors({});
    setPending(true);

    const patch: ProfilePatch = {
      name: form.name.trim(),
      email: form.email.trim(),
      intro: form.intro.trim(),
    };

    if (form.phone.trim()) patch.phone = form.phone.trim();
    if (form.work.trim()) patch.work = form.work.trim();
    if (form.city.trim() || form.country.trim()) {
      patch.location = { city: form.city.trim(), country: form.country.trim() };
    }

    try {
      await updateProfile(patch);
      onClose();
    } catch (caught) {
      const failure = toApiFailure(caught);
      setErrors(failure.errors);
      if (Object.keys(failure.errors).length === 0) setAlert(failure.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center bg-black/70 p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-[34rem] flex-col  rounded-card bg-surface shadow-card"
      >
        <header className="relative border-b border-line px-gutter py-3">
          <h2 className="text-center text-lg font-bold text-ink">Edit profile</h2>
          <button
            type="button"
            aria-label="Close"
            disabled={pending}
            onClick={onClose}
            className="absolute top-2.5 right-3 grid size-9 place-items-center rounded-pill bg-surface-raised text-ink hover:bg-line disabled:opacity-50"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:hidden px-gutter py-4">
          {alert && (
            <p
              role="alert"
              className="rounded-[10px] border border-alert/40 bg-alert-soft px-3 py-2.5 text-sm text-ink"
            >
              {alert}
            </p>
          )}

          <Field
            id="edit-name"
            label="Name"
            value={form.name}
            onChange={(value) => set("name", value)}
            error={errors.name}
            maxLength={60}
          />

          <Field
            id="edit-email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => set("email", value)}
            error={errors.email}
          />

          <Field
            id="edit-phone"
            label="Mobile number"
            type="tel"
            value={form.phone}
            onChange={(value) => set("phone", value)}
            error={errors.phone}
            hint="10 to 15 characters."
          />

          <div>
            <label htmlFor="edit-intro" className="mb-1.5 block text-sm font-semibold text-ink">
              Bio
            </label>
            <textarea
              id="edit-intro"
              rows={3}
              maxLength={200}
              value={form.intro}
              onChange={(event) => set("intro", event.target.value)}
              placeholder="Describe yourself..."
              className={cn(
                "w-full resize-none rounded-[10px] border bg-surface-raised px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint",
                errors.intro ? "border-alert" : "border-line focus:border-brand",
              )}
            />
            <p className={cn("mt-1 text-xs", errors.intro ? "text-alert" : "text-ink-faint")}>
              {errors.intro ?? `${form.intro.length}/200`}
            </p>
          </div>

          <Field
            id="edit-work"
            label="Work"
            value={form.work}
            onChange={(value) => set("work", value)}
            error={errors.work}
            placeholder="Frontend Developer at Northwind"
            hint="At least 5 characters. Leave empty to skip."
            maxLength={100}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="edit-city"
              label="City"
              value={form.city}
              onChange={(value) => set("city", value)}
              error={errors["location.city"]}
              maxLength={50}
            />
            <Field
              id="edit-country"
              label="Country"
              value={form.country}
              onChange={(value) => set("country", value)}
              error={errors["location.country"]}
              maxLength={50}
            />
          </div>
        </div>

        <footer className="border-t border-line px-gutter py-3">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-brand text-[0.95rem] font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pending && (
              <span
                aria-hidden
                className="size-4 animate-spin rounded-pill border-2 border-current border-t-transparent"
              />
            )}
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}
