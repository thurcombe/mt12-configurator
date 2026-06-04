interface Props {
  label?: string;
}

export function DirtyBadge({ label = 'unsaved' }: Props) {
  return <span className="badge badge-warning">{label}</span>;
}
