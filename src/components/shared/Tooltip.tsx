import { useState, useRef } from 'react';
import css from './Tooltip.module.css';

interface Props {
  text: string;
}

export function Tooltip({ text }: Props) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number; below: boolean } | null>(null);

  function handleMouseEnter() {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Flip to below when too close to top of viewport.
    const below = rect.top < 160;
    // Clamp X so the box doesn't bleed off the left or right edge.
    const x = Math.max(115, Math.min(window.innerWidth - 115, rect.left + rect.width / 2));
    setCoords({ x, y: below ? rect.bottom : rect.top, below });
  }

  return (
    <span className={css.wrap} onMouseEnter={handleMouseEnter} onMouseLeave={() => setCoords(null)}>
      <span ref={iconRef} className={css.icon}>?</span>
      {coords && (
        <span
          className={css.box}
          style={{
            left: coords.x,
            top: coords.below ? coords.y + 6 : coords.y - 6,
            transform: coords.below ? 'translateX(-50%)' : 'translateX(-50%) translateY(-100%)',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
