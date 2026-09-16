import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_INTERVAL = 60 * 1000; // Check every 60 seconds

function PWAUpdatePrompt() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        // Periodically check for updates
        setInterval(() => {
          registration.update();
        }, UPDATE_CHECK_INTERVAL);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const handleUpdate = async () => {
    setIsUpdating(true);

    const updateEvent = new CustomEvent('beforepwareload', {
      cancelable: true,
      detail: { source: 'update-prompt' },
    });
    if (!window.dispatchEvent(updateEvent)) {
      setIsUpdating(false);
      return;
    }

    // Existing dirty-form guards use beforeunload. Give them the same chance
    // to prevent the service-worker-triggered reload.
    const beforeUnloadEvent = new Event('beforeunload', { cancelable: true });
    if (!window.dispatchEvent(beforeUnloadEvent)) {
      setIsUpdating(false);
      return;
    }

    await updateServiceWorker(true); // true = reload page
  };

  if (!needRefresh || isDismissed) return null;

  return (
    <div className="fixed bottom-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] left-3 right-3 z-[9999] flex justify-center sm:bottom-6 sm:left-4 sm:right-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white shadow-2xl">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">പുതിയ അപ്ഡേറ്റ് ലഭ്യമാണ്!</p>
          <p className="text-xs text-gray-400 mt-0.5">ആപ്പ് അപ്ഡേറ്റ് ചെയ്യാൻ ക്ലിക്ക് ചെയ്യുക</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setIsDismissed(true)}
            disabled={isUpdating}
            className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            പിന്നീട്
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="min-h-11 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            {isUpdating ? 'അപ്ഡേറ്റ്...' : 'അപ്ഡേറ്റ്'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAUpdatePrompt;
