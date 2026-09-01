/**
 * Every icon in the app, as an inline SVG. No icon libraries — keeps the
 * bundle small and lets icons inherit `currentColor` from their container.
 */

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true as const,
  focusable: "false" as const,
});

const stroke = (w = 1.6) => ({
  stroke: "currentColor",
  strokeWidth: w,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function SearchIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="11" cy="11" r="7" {...stroke(strokeWidth)} />
      <path d="m20 20-3.5-3.5" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function CartIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.55L20 8H6" {...stroke(strokeWidth)} />
      <circle cx="10" cy="19.5" r="1.4" fill="currentColor" />
      <circle cx="17" cy="19.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function UserIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="8" r="3.6" {...stroke(strokeWidth)} />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function CloseIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="m6 6 12 12M18 6 6 18" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function PlusIcon({ size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 5v14M5 12h14" {...stroke(strokeWidth ?? 1.9)} />
    </svg>
  );
}

export function MinusIcon({ size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 12h14" {...stroke(strokeWidth ?? 1.9)} />
    </svg>
  );
}

export function ArrowRightIcon({ size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 12h15M13 6l6 6-6 6" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function ArrowDownIcon({ size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 4v15M6 13l6 6 6-6" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function ChevronDownIcon({ size = 16, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="m6 9 6 6 6-6" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function CheckIcon({ size = 16, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="m5 12.5 4.5 4.5L19 7" {...stroke(strokeWidth ?? 2.2)} />
    </svg>
  );
}

export function TrashIcon({ size = 16, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function PhoneIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path
        d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L17 13l4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 3 5.2 2 2 0 0 1 5 3h1.5Z"
        {...stroke(strokeWidth)}
      />
    </svg>
  );
}

export function PinIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" {...stroke(strokeWidth)} />
      <circle cx="12" cy="10" r="2.6" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function ClockIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" {...stroke(strokeWidth)} />
      <path d="M12 7.5V12l3 2" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function MoonIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function FlameIcon({ size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path
        d="M12 3c.5 3-2 4-2 7a2 2 0 0 0 4 0c2 1.6 3 3.4 3 5.2a5 5 0 0 1-10 0C7 12.4 9.6 9.4 12 3Z"
        {...stroke(strokeWidth)}
      />
    </svg>
  );
}

export function LeafIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M20 4c0 9-5.4 14-12 14H5c0-8 5.6-13 15-14Z" {...stroke(strokeWidth)} />
      <path d="M5 20c2.5-5 6-8 10.5-10" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function ScooterIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="5.5" cy="17" r="2.6" {...stroke(strokeWidth)} />
      <circle cx="18.5" cy="17" r="2.6" {...stroke(strokeWidth)} />
      <path d="M8 17h8M14 5h3l2.2 8.6M14 5l-2 12" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function ShieldIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 3 5 5.8v5.6c0 4.3 2.9 7.6 7 9.6 4.1-2 7-5.3 7-9.6V5.8L12 3Z" {...stroke(strokeWidth)} />
      <path d="m9 12 2 2 4-4" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function UsersIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="9" cy="8" r="3.2" {...stroke(strokeWidth)} />
      <path d="M3 19a6 6 0 0 1 12 0" {...stroke(strokeWidth)} />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 6M17.5 19a6 6 0 0 0-2-4.5" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function WhatsAppIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15s-.77.96-.94 1.16c-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37s-1.03 1.01-1.03 2.46 1.06 2.86 1.2 3.06c.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.62.7.22 1.35.19 1.86.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" />
      <path d="M12.04 2C6.6 2 2.17 6.43 2.17 11.87c0 1.74.46 3.44 1.32 4.94L2 22l5.34-1.4a9.83 9.83 0 0 0 4.7 1.2h.01c5.44 0 9.87-4.43 9.87-9.87 0-2.64-1.03-5.12-2.9-6.98A9.8 9.8 0 0 0 12.04 2Zm0 17.98h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.16 8.16 0 0 1-1.25-4.37c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.86 5.8 2.41a8.15 8.15 0 0 1 2.4 5.8c0 4.52-3.68 8.2-8.2 8.2Z" />
    </svg>
  );
}

export function FacebookIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.12-2.41-.12-2.39 0-4.03 1.46-4.03 4.14V9.9H7.5V13h2.76v8h3.24Z" />
    </svg>
  );
}

export function InstagramIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" {...stroke(1.7)} />
      <circle cx="12" cy="12" r="3.8" {...stroke(1.7)} />
      <circle cx="17.1" cy="6.9" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function TikTokIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.2 3h-2.6v12.1a2.4 2.4 0 1 1-2-2.36V10.1a5.1 5.1 0 1 0 4.6 5.07V8.9a6.3 6.3 0 0 0 3.6 1.14V7.4a3.7 3.7 0 0 1-3.6-3.7V3Z" />
    </svg>
  );
}

export function MenuBookIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" {...stroke(strokeWidth)} />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z" {...stroke(strokeWidth)} />
    </svg>
  );
}

export function TagIcon({ size = 20, strokeWidth }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3.5 11.6V4.5A1 1 0 0 1 4.5 3.5h7.1a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8l-6.1 6.1a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1-.6-1.4Z" {...stroke(strokeWidth)} />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}
