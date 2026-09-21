"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site-config";
import { contactSchema } from "@/lib/validation/contact.schema";

interface ContactFormProps {
  className?: string;
}

type ContactField = "name" | "email" | "subject" | "message";
type ContactValues = Record<ContactField, string>;
type ContactErrors = Partial<Record<ContactField, string>>;

const FIELD_MESSAGES: Record<ContactField, string> = {
  name: "Enter your name (at least 2 characters).",
  email: "Enter a valid email address.",
  subject: "Enter a subject (at least 3 characters).",
  message: "Enter a message of at least 20 characters.",
};

const EMPTY_VALUES: ContactValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const SUMMARY_MESSAGE = "Please fix the highlighted fields.";
const INFO_MESSAGE = `Sending isn't wired up yet. Email us at ${siteConfig.contact.email} in the meantime.`;

function isContactField(value: unknown): value is ContactField {
  return (
    value === "name" ||
    value === "email" ||
    value === "subject" ||
    value === "message"
  );
}

/**
 * Phase 1 contact form: validates locally with `contactSchema` and shows an
 * info state instead of sending. Phase 10 wires the server action that
 * delivers the message.
 */
export function ContactForm({ className }: ContactFormProps) {
  const [values, setValues] = useState<ContactValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function updateField(field: ContactField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = contactSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: ContactErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (isContactField(field) && !nextErrors[field]) {
          nextErrors[field] = FIELD_MESSAGES[field];
        }
      }
      setErrors(nextErrors);
      setSubmitted(false);
      return;
    }
    setErrors({});
    setSubmitted(true);
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("flex flex-col gap-5", className)}
    >
      {hasErrors ? (
        <p
          role="alert"
          className="rounded-card border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {SUMMARY_MESSAGE}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="contact-name"
          label="Name"
          autoComplete="name"
          required
          value={values.name}
          error={errors.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
        <Input
          id="contact-email"
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          error={errors.email}
          onChange={(event) => updateField("email", event.target.value)}
        />
      </div>
      <Input
        id="contact-subject"
        label="Subject"
        required
        value={values.subject}
        error={errors.subject}
        onChange={(event) => updateField("subject", event.target.value)}
      />
      <Textarea
        id="contact-message"
        label="Message"
        required
        value={values.message}
        error={errors.message}
        hint="Include your order number if your question is about an order."
        onChange={(event) => updateField("message", event.target.value)}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" className="sm:self-start">
          Send message
        </Button>
        {submitted ? (
          <p role="status" className="text-sm text-ink-muted">
            {INFO_MESSAGE}
          </p>
        ) : null}
      </div>
    </form>
  );
}
