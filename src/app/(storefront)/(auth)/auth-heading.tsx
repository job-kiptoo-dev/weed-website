interface AuthHeadingProps {
  title: string;
  intro: string;
}

/** The page's single h1 plus a one-line intro, shared by the auth pages. */
export function AuthHeading({ title, intro }: AuthHeadingProps) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-3xl tracking-display">{title}</h1>
      <p className="text-ink-muted">{intro}</p>
    </header>
  );
}
