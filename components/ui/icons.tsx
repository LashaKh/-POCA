import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

const sharedProps = {
  "aria-hidden": true,
  focusable: false,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.7,
  viewBox: "0 0 24 24",
} as const;

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export function AccountIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.7-4 2.9-6 6.5-6s5.8 2 6.5 6" />
    </svg>
  );
}

export function BagIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M5.5 8.5h13l-1 11h-11z" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function HeartIcon({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <svg {...sharedProps} {...props} fill={filled ? "currentColor" : "none"}>
      <path d="M20.8 5.8c-1.8-2.2-5.1-2.2-7 0L12 7.9l-1.8-2.1c-1.9-2.2-5.2-2.2-7 0-1.7 2-1.5 5 .4 6.9L12 21l8.4-8.3c1.9-1.9 2.1-4.9.4-6.9Z" />
    </svg>
  );
}
