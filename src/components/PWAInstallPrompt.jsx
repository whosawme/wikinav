import { usePWAInstall } from '../hooks/usePWAInstall';

const PWAInstallPrompt = () => {
  const { showInstallPrompt, installPWA, dismissInstallPrompt } = usePWAInstall();

  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <img 
            src="/wikirabbit_transparent.svg" 
            alt="WikiNav" 
            className="w-10 h-10"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">
            Install WikiNav
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Add to your home screen for quick access and offline use.
          </p>
          <div className="flex space-x-2 mt-3">
            <button
              onClick={installPWA}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Install
            </button>
            <button
              onClick={dismissInstallPrompt}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismissInstallPrompt}
          className="flex-shrink-0 ml-2 p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;