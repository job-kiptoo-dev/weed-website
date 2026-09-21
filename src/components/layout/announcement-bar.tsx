import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site-config";

interface AnnouncementBarProps {
  className?: string;
}

export function AnnouncementBar({ className }: AnnouncementBarProps) {
  return (
    <div
      role="region"
      aria-label="Announcement"
      className={cn(
        "border-b border-white/10 bg-ink py-2 text-center text-sm text-on-brand focus-scope-dark",
        className,
      )}
    >
      {siteConfig.announcement}
    </div>
  );
}
