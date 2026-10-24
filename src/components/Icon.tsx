import type { ReactNode } from 'react'

const PATHS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chart: <path d="M5 20v-9M12 20V5M19 20v-6" />,
  settings: (
    <>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  alert: <path d="M12 4 2.5 20h19zM12 10v4.5M12 17.5v.01" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  calendar: <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />,
  trendDown: <path d="M3 7l6 6 4-4 8 8M21 11v6h-6" />,
  trendUp: <path d="M3 17l6-6 4 4 8-8M21 13V7h-6" />,
  wave: <path d="M2 12c2.5-5 5-5 7.5 0s5 5 7.5 0 3.5-3 5-1" />,
  receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" />,
  repeat: <path d="M17 2l3 3-3 3M4 12v-1a6 6 0 0 1 6-6h10M7 22l-3-3 3-3M20 12v1a6 6 0 0 1-6 6H4" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  lock: <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />,
  message: <path d="M4 4h16v12H9l-5 4z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r=".6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  leaf: <path d="M5 20c0-9 6-15 15-15 0 9-6 15-15 15zM5 20l8-8" />,
  piggy: <path d="M4 11a7 6 0 0 1 12-3h2l-1 3 2 1v3l-2 1-1 3h-3v-2H9v2H6l-1-3a6 6 0 0 1-1-5zM14 11h.01" />,
  logout: <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  backspace: <path d="M9 5h11v14H9l-6-7zM12 9l5 6M17 9l-5 6" />,
}

export type IconName = keyof typeof PATHS

export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
