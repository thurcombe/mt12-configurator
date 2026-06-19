interface Props {
  size?: number;
}

export function SteeringWheelIcon({ size = 14 }: Props) {
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
      {/* Outer ring */}
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      {/* Inner hub */}
      <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.2" />
      {/* Spokes: top, bottom-left, bottom-right */}
      <line x1="8"   y1="6.2"  x2="8"   y2="1.5"  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="6.5" y1="9.1"  x2="3.3" y2="13.0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="9.5" y1="9.1"  x2="12.7" y2="13.0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
