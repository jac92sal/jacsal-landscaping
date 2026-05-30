import { useEffect } from 'react';
import { BookingFlow } from '../BookingFlow';

export function WidgetView() {
  useEffect(() => {
    const notify = (type: string, payload?: unknown) => {
      try {
        window.parent.postMessage({ source: 'screening-widget', type, payload }, '*');
      } catch {}
    };

    notify('ready');

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-widget-close]')) notify('close');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <button
        data-widget-close
        aria-label="Close"
        className="fixed top-3 right-3 z-50 w-9 h-9 rounded-full bg-muted/80 hover:bg-muted border border-border flex items-center justify-center text-foreground"
      >
        ×
      </button>
      <BookingFlow />
    </div>
  );
}
