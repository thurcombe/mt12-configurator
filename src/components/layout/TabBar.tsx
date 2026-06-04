import css from './TabBar.module.css';

export interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className={css.bar}>
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`${css.tab} ${t.id === active ? css.active : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
