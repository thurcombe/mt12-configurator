import { Icon } from './Icon.tsx';
import { faPencil } from '@fortawesome/free-solid-svg-icons';

interface Props {
  label?: string;
  title?: string;
}

export function DirtyBadge({ label = 'Unsaved', title = 'This model has unsaved changes' }: Props) {
  return (
    <span className="badge badge-warning" title={title}>
      <Icon icon={faPencil} size={11} />
      {label}
    </span>
  );
}
