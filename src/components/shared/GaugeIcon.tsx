interface Props {
  size?: number;
}

export function GaugeIcon({ size = 14 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      aria-hidden
    >
      {/* Arc from ~210° to ~330° (bottom-left to bottom-right, open at bottom) */}
      <path
        d="M 2.5 12 A 6 6 0 1 1 13.5 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tick marks */}
      <line x1="2.9"  y1="9.5"  x2="3.9"  y2="8.7"  stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="8"    y1="2.5"  x2="8"    y2="3.7"  stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="13.1" y1="9.5"  x2="12.1" y2="8.7"  stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Needle pointing to ~1 o'clock (high end) */}
      <line x1="8" y1="8" x2="11.5" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Centre dot */}
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    </svg>
  );
}
