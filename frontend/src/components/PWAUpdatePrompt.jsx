import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_INTERVAL = 60 * 1000; // Check every 60 seconds

function PWAUpdatePrompt() {
  const [isUpdating, setIsUpdating] = useState(false);

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
    await updateServiceWorker(true); // true = reload page
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] flex justify-center">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-md w-full border border-gray-700">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">പുതിയ അപ്ഡേറ്റ് ലഭ്യമാണ്!</p>
          <p className="text-xs text-gray-400 mt-0.5">ആപ്പ് അപ്ഡേറ്റ് ചെയ്യാൻ ക്ലിക്ക് ചെയ്യുക</p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
        >
          {isUpdating ? 'അപ്ഡേറ്റ്...' : 'അപ്ഡേറ്റ്'}
        </button>
      </div>
    </div>
  );
}

export default PWAUpdatePrompt;
