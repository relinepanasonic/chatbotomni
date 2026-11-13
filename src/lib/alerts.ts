'use client';

/** New-chat alerts: a short beep and, when the tab is in the background and the person allowed it, a desktop notification. Browser only. */

let ctx: AudioContext | null = null;

export function beep() {
  try {
    ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;
    for (const [i, f] of [880, 1175].entries()) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.16); g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.16 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.15);
      o.connect(g).connect(ctx.destination); o.start(t + i * 0.16); o.stop(t + i * 0.16 + 0.16);
    }
  } catch { /* no sound: fine */ }
}

export const notifySupported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function askNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export function notify(title: string, body: string) {
  try { if (notifySupported() && Notification.permission === 'granted' && document.hidden) new Notification(title, { body, icon: '/logo.png', tag: 'new-chat' }); } catch { /* ignore */ }
}
