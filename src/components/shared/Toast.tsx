import { useEffect, useState } from 'react';
import css from './Toast.module.css';

interface Props {
  message: string;
  onDone: () => void;
  duration?: number;
}

export function Toast({ message, onDone, duration = 2000 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in on next tick
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => setVisible(false), duration - 300);
    const done = setTimeout(onDone, duration);
    return () => { clearTimeout(show); clearTimeout(hide); clearTimeout(done); };
  }, [duration, onDone]);

  return (
    <div className={`${css.toast} ${visible ? css.visible : ''}`}>
      {message}
    </div>
  );
}
