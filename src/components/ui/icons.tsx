import type { ComponentType, SVGProps } from "react";
import type { IconName } from "@/types/content";
import { cn } from "@/lib/cn";

export type { IconName };

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** When provided the icon is exposed to assistive tech with this name. */
  title?: string;
  className?: string;
}

interface IconBaseProps extends IconProps {
  children: React.ReactNode;
}

function IconBase({ title, className, children, ...props }: IconBaseProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      className={cn("size-5 shrink-0", className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function Cart(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M2 3h3l2.4 11.4a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H6" />
    </IconBase>
  );
}

export function Search(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function Menu(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}

export function Close(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </IconBase>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function ChevronLeft(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m15 6-6 6 6 6" />
    </IconBase>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m9 6 6 6-6 6" />
    </IconBase>
  );
}

const HEART_PATH =
  "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z";

export function Heart(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d={HEART_PATH} />
    </IconBase>
  );
}

export function HeartFilled(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d={HEART_PATH} fill="currentColor" />
    </IconBase>
  );
}

export function User(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </IconBase>
  );
}

export function Plus(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

export function Minus(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function Check(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12 4.5 4.5L19 7" />
    </IconBase>
  );
}

const STAR_PATH =
  "m12 3 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.4l-5.7 3.1 1.2-6.4L2.8 9.7l6.4-.8L12 3Z";

export function Star(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d={STAR_PATH} />
    </IconBase>
  );
}

export function StarFilled(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d={STAR_PATH} fill="currentColor" />
    </IconBase>
  );
}

export function Alert(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </IconBase>
  );
}

export function Leaf(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 20c0-8 5-15 15-15 0 10-5 15-15 15Z" />
      <path d="M5 20c3-6 7-9 11-11" />
    </IconBase>
  );
}

export function Truck(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2 6h12v10H2zM14 10h4l3 3v3h-7z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </IconBase>
  );
}

export function Shield(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </IconBase>
  );
}

export function Refresh(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </IconBase>
  );
}

const iconsByName: Record<IconName, ComponentType<IconProps>> = {
  cart: Cart,
  search: Search,
  menu: Menu,
  close: Close,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  heart: Heart,
  heartFilled: HeartFilled,
  user: User,
  plus: Plus,
  minus: Minus,
  check: Check,
  star: Star,
  starFilled: StarFilled,
  alert: Alert,
  leaf: Leaf,
  truck: Truck,
  shield: Shield,
  refresh: Refresh,
};

interface DataIconProps extends IconProps {
  name: IconName;
}

/** Data-driven icon lookup for content such as trust features. */
export function Icon({ name, ...props }: DataIconProps) {
  const Component = iconsByName[name];
  return <Component {...props} />;
}
