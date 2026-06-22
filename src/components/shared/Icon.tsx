import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface Props {
  icon: IconDefinition;
  size?: number;
}

export function Icon({ icon, size = 14 }: Props) {
  return (
    <FontAwesomeIcon
      icon={icon}
      style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      aria-hidden
    />
  );
}
