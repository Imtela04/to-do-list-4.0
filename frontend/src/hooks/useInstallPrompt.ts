import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'installBannerDismissedAt';
const REAPPEAR_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — tweak as you like

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true; // iOS Safari flag
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible]             = useState(false);
  const [platform, setPlatform]           = useState<'android' | 'ios' | null>(null);

	useEffect(() => {
		if (isStandalone()) return;

		const dismissedAt = localStorage.getItem(DISMISS_KEY);
		if (dismissedAt && Date.now() - Number(dismissedAt) < REAPPEAR_AFTER_MS) return;

		if (isIos()) {
			setPlatform('ios');
			setVisible(true);
			return;
		}

		const handler = (e: Event) => {
			e.preventDefault();
			setDeferredEvent(e as BeforeInstallPromptEvent);
			setPlatform('android');
			setVisible(true);
		};
		window.addEventListener('beforeinstallprompt', handler);
		return () => window.removeEventListener('beforeinstallprompt', handler);
	}, []);

  const install = async (): Promise<void> => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    if (outcome === 'accepted') setVisible(false);
  };

	const dismiss = (): void => {
		localStorage.setItem(DISMISS_KEY, String(Date.now()));
		setVisible(false);
	};

  return { visible, platform, install, dismiss };
}