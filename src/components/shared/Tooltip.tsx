import css from './Tooltip.module.css';

interface Props {
  text: string;
}

export function Tooltip({ text }: Props) {
  return (
    <span className={css.wrap}>
      <span className={css.icon}>?</span>
      <span className={css.box}>{text}</span>
    </span>
  );
}
