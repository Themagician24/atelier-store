"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";
type FieldName = "name" | "email" | "password";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, ReactNode>>;

// Mirrors emailAndPassword in src/lib/auth.ts; the server checks again.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fieldsFor(mode: Mode): FieldName[] {
  return mode === "sign-up" ? ["name", "email", "password"] : ["email", "password"];
}

function validate(mode: Mode, field: FieldName, value: string): string | undefined {
  switch (field) {
    case "name":
      return value.trim() ? undefined : "Enter your name.";
    case "email":
      if (!value.trim()) return "Enter your email address.";
      return EMAIL.test(value.trim()) ? undefined : "Enter an email address like name@example.com.";
    case "password":
      if (!value) return "Enter your password.";
      // Sign-in checks presence only: a length rule there would hint at the policy, not help.
      if (mode === "sign-up" && value.length < PASSWORD_MIN) {
        return `Use at least ${PASSWORD_MIN} characters.`;
      }
      if (mode === "sign-up" && value.length > PASSWORD_MAX) {
        return `Use ${PASSWORD_MAX} characters or fewer.`;
      }
      return undefined;
  }
}

// Posts through the auth client to /api/auth/* rather than a Server Action:
// only the HTTP handler is rate-limited.
export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const otherHref = `/${mode === "sign-in" ? "sign-up" : "sign-in"}?next=${encodeURIComponent(next)}`;

  function focusField(field: FieldName) {
    formRef.current?.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus();
  }

  // Validate on blur; once a field shows an error, re-check as the user types
  // so the message clears the moment the value is fixed.
  function onBlur(field: FieldName, value: string) {
    setErrors((prev) => ({ ...prev, [field]: validate(mode, field, value) }));
  }
  function onChange(field: FieldName, value: string) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: validate(mode, field, value) }));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    const values = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    } satisfies Values;

    const found: Errors = {};
    for (const field of fieldsFor(mode)) {
      const message = validate(mode, field, values[field]);
      if (message) found[field] = message;
    }
    setErrors(found);
    setFormError(null);
    const firstInvalid = fieldsFor(mode).find((field) => found[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    setPending(true);
    let error: { status: number; code?: string } | null;
    try {
      ({ error } =
        mode === "sign-in"
          ? await authClient.signIn.email({ email: values.email, password: values.password })
          : await authClient.signUp.email(values));
    } catch {
      setPending(false);
      setFormError("We couldn’t reach Atelier. Check your connection and try again.");
      return;
    }

    if (error) {
      setPending(false);
      const failure = describeError(mode, error, otherHref);
      if (failure.field) {
        setErrors({ [failure.field]: failure.message });
        focusField(failure.field);
      } else {
        setFormError(failure.message);
        if (failure.clearPassword && formRef.current) {
          const password = formRef.current.elements.namedItem("password");
          if (password instanceof HTMLInputElement) password.value = "";
          focusField("password");
        }
      }
      return;
    }

    // Stay pending through the navigation so the button can't be pressed twice.
    router.replace(next);
    router.refresh();
  }

  return (
    // noValidate: our messages replace the browser bubbles. method="post" so a
    // submit before hydration never puts the password in the URL.
    <form
      ref={formRef}
      method="post"
      noValidate
      onSubmit={onSubmit}
      aria-busy={pending}
      className="flex flex-col gap-8"
    >
      {mode === "sign-up" && (
        <Field
          label="Name"
          name="name"
          type="text"
          autoComplete="name"
          error={errors.name}
          readOnly={pending}
          onBlur={onBlur}
          onChange={onChange}
        />
      )}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={errors.email}
        readOnly={pending}
        onBlur={onBlur}
        onChange={onChange}
      />
      <PasswordField
        mode={mode}
        error={errors.password}
        readOnly={pending}
        onBlur={onBlur}
        onChange={onChange}
      />

      <div>
        {/* Always mounted and never display:none, so screen readers announce it. */}
        <p role="alert" className="text-alert not-empty:mb-4">
          {formError}
        </p>
        <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
          {mode === "sign-in"
            ? pending ? "Signing in…" : "Sign in"
            : pending ? "Creating account…" : "Create account"}
        </button>
      </div>

      <p className="text-muted">
        {mode === "sign-in" ? "New to Atelier? " : "Already have an account? "}
        <Link href={otherHref} className="link text-ink">
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}

type FieldEvents = {
  onBlur: (field: FieldName, value: string) => void;
  onChange: (field: FieldName, value: string) => void;
};

function Field({
  label,
  name,
  type,
  autoComplete,
  hint,
  error,
  readOnly,
  onBlur,
  onChange,
  trailing,
}: FieldEvents & {
  label: string;
  name: FieldName;
  type: string;
  autoComplete: string;
  hint?: string;
  error?: ReactNode;
  readOnly: boolean;
  trailing?: ReactNode;
}) {
  const noteId = `${name}-note`;
  const note = error ?? hint;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="eyebrow">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          autoComplete={autoComplete}
          required
          readOnly={readOnly}
          className={`field ${trailing ? "pr-16" : ""}`}
          aria-describedby={note ? noteId : undefined}
          aria-invalid={error ? true : undefined}
          {...(type === "email" && { autoCapitalize: "none", spellCheck: false })}
          onBlur={(event) => onBlur(name, event.currentTarget.value)}
          onChange={(event) => onChange(name, event.currentTarget.value)}
        />
        {trailing}
      </div>
      {note && (
        <p id={noteId} className={`text-ui ${error ? "text-alert" : "text-muted"}`}>
          {note}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  mode,
  error,
  readOnly,
  onBlur,
  onChange,
}: FieldEvents & { mode: Mode; error?: ReactNode; readOnly: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      label="Password"
      name="password"
      type={visible ? "text" : "password"}
      autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
      hint={mode === "sign-up" ? `At least ${PASSWORD_MIN} characters.` : undefined}
      error={error}
      readOnly={readOnly}
      onBlur={onBlur}
      onChange={onChange}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-controls="password"
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="eyebrow link-quiet absolute inset-y-0 right-0 px-2 text-muted"
        >
          {visible ? "Hide" : "Show"}
        </button>
      }
    />
  );
}

type Failure =
  | { field: FieldName; message: ReactNode; clearPassword?: never }
  | { field?: never; message: string; clearPassword?: boolean };

function describeError(
  mode: Mode,
  error: { status: number; code?: string },
  signInHref: string,
): Failure {
  if (error.status === 429) {
    return { message: "Too many attempts. Wait a minute, then try again." };
  }
  if (mode === "sign-in") {
    if (error.status === 401) {
      // One message for unknown email and wrong password alike.
      return { message: "Email or password is incorrect.", clearPassword: true };
    }
    return { message: "We couldn’t sign you in. Please try again." };
  }

  switch (error.code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        field: "email",
        message: (
          <>
            An account already uses this email.{" "}
            <Link href={signInHref} className="link">
              Sign in instead
            </Link>
          </>
        ),
      };
    case "INVALID_EMAIL":
      return { field: "email", message: "Enter an email address like name@example.com." };
    case "PASSWORD_TOO_SHORT":
      return { field: "password", message: `Use at least ${PASSWORD_MIN} characters.` };
    case "PASSWORD_TOO_LONG":
      return { field: "password", message: `Use ${PASSWORD_MAX} characters or fewer.` };
    default:
      return { message: "We couldn’t create your account. Please try again." };
  }
}
