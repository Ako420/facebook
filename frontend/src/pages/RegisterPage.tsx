import { useState } from "react";
import type { FormEvent } from "react";
import {
  AuthAlert,
  AuthButton,
  SelectField,
  TextField,
} from "../components/auth/AuthControls";
import { AuthFooter } from "../components/auth/AuthFooter";
import { MetaMark } from "../components/auth/MetaMark";
import { Icon } from "../components/icons/Icon";
import { useAuth } from "../features/auth/AuthContext";
import { toApiFailure } from "../lib/api";
import type { FieldErrors } from "../lib/api";
import { useNavigate } from "react-router-dom";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 120 }, (_, i) => THIS_YEAR - i);

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
] as const;

interface FormState {
  firstName: string;
  lastName: string;
  month: string;
  day: string;
  year: string;
  gender: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  month: "",
  day: "",
  year: "",
  gender: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const fullName = (form: FormState) =>
  `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

const dateOfBirth = (form: FormState) => {
  if (!form.month || !form.day || !form.year) return "";
  return `${form.year}-${form.month.padStart(2, "0")}-${form.day.padStart(2, "0")}`;
};

const validate = (form: FormState): FieldErrors => {
  const errors: FieldErrors = {};
  const name = fullName(form);

  if (!name) errors.name = "Full name is required.";
  else if (name.length < 2)
    errors.name = "Full name must be at least 2 characters.";

  if (!dateOfBirth(form)) errors.dateOfBirth = "Date of birth is required.";

  if (!form.gender) errors.gender = "Gender is required.";

  if (!form.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_REGEX.test(form.email.trim()))
    errors.email = "Please provide a valid email address.";

  const phone = form.phone.trim();
  if (phone.length < 10 || phone.length > 15)
    errors.phone = "Phone number must be between 10 and 15 characters.";

  if (!form.password) errors.password = "Password is required.";
  else if (form.password.length < 6)
    errors.password = "Password must be at least 6 characters.";

  if (!form.confirmPassword)
    errors.confirmPassword = "Please confirm your password.";
  else if (form.password && form.password !== form.confirmPassword)
    errors.confirmPassword = "Passwords do not match.";

  return errors;
};

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState("");
  const [pending, setPending] = useState(false);

  const set = (key: keyof FormState, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;

    setAlert("");
    const local = validate(form);
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }

    setErrors({});
    setPending(true);
    try {
      await register({
        name: fullName(form),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender as "male" | "female" | "other",
        dateOfBirth: dateOfBirth(form),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
    } catch (error) {
      const failure = toApiFailure(error);
      setErrors(failure.errors);
      if (Object.keys(failure.errors).length === 0) setAlert(failure.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <main className="mx-auto w-full max-w-[36rem] flex-1 px-4 py-6 sm:px-6">
        <button
          type="button"
          aria-label="Back to log in"
          onClick={() => navigate("/login")}
          className="grid size-8 place-items-center rounded-pill text-ink hover:bg-surface-hover"
        >
          <Icon name="chevron-left" size={18} />
        </button>

        <div className="mt-3">
          <MetaMark />
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Get started on Facebook
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Create an account to connect with friends, family and communities of
          people who share your interests.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          <AuthAlert message={alert} />

          {/* Two inputs here, one `name` field on the server. */}
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">
              Name
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                id="register-first-name"
                autoComplete="given-name"
                placeholder="First name"
                value={form.firstName}
                onChange={(event) => set("firstName", event.target.value)}
                invalid={Boolean(errors.name)}
              />
              <TextField
                id="register-last-name"
                autoComplete="family-name"
                placeholder="Last name"
                value={form.lastName}
                onChange={(event) => set("lastName", event.target.value)}
                invalid={Boolean(errors.name)}
              />
            </div>
            {errors.name && (
              <p role="alert" className="mt-1 text-xs text-alert">
                {errors.name}
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">
              Birthday
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <SelectField
                id="register-month"
                aria-label="Birth month"
                value={form.month}
                onChange={(event) => set("month", event.target.value)}
                invalid={Boolean(errors.dateOfBirth)}
              >
                <option value="">Month</option>
                {MONTHS.map((month, index) => (
                  <option key={month} value={String(index + 1)}>
                    {month}
                  </option>
                ))}
              </SelectField>

              <SelectField
                id="register-day"
                aria-label="Birth day"
                value={form.day}
                onChange={(event) => set("day", event.target.value)}
                invalid={Boolean(errors.dateOfBirth)}
              >
                <option value="">Day</option>
                {DAYS.map((day) => (
                  <option key={day} value={String(day)}>
                    {day}
                  </option>
                ))}
              </SelectField>

              <SelectField
                id="register-year"
                aria-label="Birth year"
                value={form.year}
                onChange={(event) => set("year", event.target.value)}
                invalid={Boolean(errors.dateOfBirth)}
              >
                <option value="">Year</option>
                {YEARS.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </SelectField>
            </div>
            {errors.dateOfBirth && (
              <p role="alert" className="mt-1 text-xs text-alert">
                {errors.dateOfBirth}
              </p>
            )}
          </fieldset>

          <SelectField
            id="register-gender"
            label="Gender"
            value={form.gender}
            onChange={(event) => set("gender", event.target.value)}
            error={errors.gender}
          >
            <option value="">Select your gender</option>
            {GENDERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>

          <div>
            <TextField
              id="register-phone"
              label="Mobile number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Mobile number"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
              error={errors.phone}
            />
            <p className="mt-1 text-xs text-ink-faint">
              You may receive notifications from us.
            </p>
          </div>

          <TextField
            id="register-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={form.email}
            onChange={(event) => set("email", event.target.value)}
            error={errors.email}
          />

          <TextField
            id="register-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => set("password", event.target.value)}
            error={errors.password}
          />

          <TextField
            id="register-confirm-password"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={(event) => set("confirmPassword", event.target.value)}
            error={errors.confirmPassword}
          />

          <p className="text-xs leading-relaxed text-ink-muted">
            By tapping Submit, you agree to create an account and to the{" "}
            <span className="text-brand">Terms</span>,{" "}
            <span className="text-brand">Privacy Policy</span> and{" "}
            <span className="text-brand">Cookies Policy</span>.
          </p>

          <AuthButton
            type="submit"
            pending={pending}
            pendingLabel="Creating account…"
          >
            Submit
          </AuthButton>
        </form>

        <AuthButton
          variant="ghost"
          className="mt-3"
          onClick={() => navigate("/login")}
        >
          I already have an account
        </AuthButton>
      </main>

      <AuthFooter />
    </div>
  );
}
