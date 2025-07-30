import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone || 
          document.referrer.includes('android-app://')) {
        setIsInstalled(true);
      }
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install prompt after user has been on site for a bit
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallPrompt(true);
        }
      }, 10000); // Show after 10 seconds
    };

    // Listen for app installed event
    const handleAppInstalled = (e) => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const installPWA = async () => {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return false;
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for user response
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`Install prompt outcome: ${outcome}`);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      // Clear the prompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    // Store dismissal in localStorage to avoid showing again soon
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Check if install prompt was recently dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      if (dismissedTime > oneDayAgo) {
        setShowInstallPrompt(false);
      }
    }
  }, []);

  return {
    canInstall: !!deferredPrompt,
    showInstallPrompt,
    isInstalled,
    installPWA,
    dismissInstallPrompt
  };
};