import { useState } from "react";
import type { FormEvent } from "react";
import { AuthAlert, AuthButton, TextField } from "../components/auth/AuthControls";
import { AuthFooter } from "../components/auth/AuthFooter";
import { MetaMark } from "../components/auth/MetaMark";
import { Icon } from "../components/icons/Icon";
import { useAuth } from "../features/auth/AuthContext";
import { toApiFailure } from "../lib/api";
import type { FieldErrors } from "../lib/api";
import { useNavigate } from "react-router-dom";


const validate = (email: string, password: string): FieldErrors => {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = "Email is required.";
  if (!password) errors.password = "Password is required.";
  return errors;
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;

    setAlert("");
    const local = validate(email, password);
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }

    setErrors({});
    setPending(true);
    try {
      await login({ email: email.trim(), password });
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
      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-2 lg:gap-0 lg:px-8">
        {/* Brand half */}
        <section className="sm:flex flex-col lg:pr-12 hidden  lg:flex">
          <div className="grid size-11 place-items-center rounded-pill bg-brand text-white">
            <Icon name="facebook" size={24} />
          </div>

          <img
            src="/assets/images/login.webp"
            alt=""
            className="mx-auto w-full max-w-lg lg:my-2"
          />

          <h1 className="text-3xl leading-[1.05] font-bold tracking-tight sm:text-[3.25rem]">
            Explore the
            <br />
            things you
            <br />
            <span className="text-brand">love</span>.
          </h1>
        </section>

        {/* Form half */}
        <section className="flex items-center justify-center lg:border-l lg:border-line lg:pt-6 lg:pl-12">
          <div className="w-full max-w-[400px]">
            <div className="mb-6 flex items-center gap-4">
              <button
                type="button"
                aria-label="Back to sign up"
                onClick={() => navigate("/register")}
                className="grid size-8 place-items-center rounded-pill text-ink hover:bg-surface-hover"
              >
                <Icon name="chevron-left" size={18} />
              </button>
              <h2 className="text-xl font-bold">Log into Facebook</h2>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <AuthAlert message={alert} />

              <TextField
                id="login-email"
                size="lg"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={errors.email}
              />

              <TextField
                id="login-password"
                size="lg"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={errors.password}
              />

              <AuthButton type="submit" pending={pending} pendingLabel="Logging in…">
                Log in
              </AuthButton>
            </form>

            <button
              type="button"
              className="mt-4 block w-full text-center text-sm font-medium text-ink-muted hover:underline"
            >
              Forgot password?
            </button>

            <hr className="my-6 border-line" />

            <AuthButton variant="outline" onClick={() => navigate("/register")}>
              Create new account
            </AuthButton>

            <div className="mt-8 flex justify-center">
              <MetaMark />
            </div>
          </div>
        </section>
      </main>

    <AuthFooter />
    </div>
  );
}
