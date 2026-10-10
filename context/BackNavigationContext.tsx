'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export interface ModalRegistration {
  id: string;
  onClose: () => void;
}

export interface BackNavigationContextType {
  registerModal: (id: string, onClose: () => void) => () => void;
  registerBackHandler: (handler: () => boolean) => () => void;
  showExitDialog: boolean;
  setShowExitDialog: (show: boolean) => void;
  confirmExitApp: () => void;
  cancelExitApp: () => void;
  triggerBackButton: (canGoBack?: boolean) => Promise<boolean>;
  historyDepth: number;
}

const BackNavigationContext = createContext<BackNavigationContextType | null>(null);

export const BackNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [historyDepth, setHistoryDepth] = useState(1);

  // Stack of registered modals/drawers/dialogs (highest index is topmost)
  const modalStackRef = useRef<ModalRegistration[]>([]);
  // Custom screen back handler for state-based views (e.g. mobile steps)
  const customHandlerRef = useRef<(() => boolean) | null>(null);

  const latestPathnameRef = useRef(location.pathname);
  latestPathnameRef.current = location.pathname;

  const showExitDialogRef = useRef(showExitDialog);
  showExitDialogRef.current = showExitDialog;

  const historyDepthRef = useRef(historyDepth);
  historyDepthRef.current = historyDepth;

  // Track in-app history navigation depth
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    setHistoryDepth((prev) => prev + 1);
  }, [location.pathname]);

  const registerModal = useCallback((id: string, onClose: () => void) => {
    modalStackRef.current.push({ id, onClose });
    return () => {
      modalStackRef.current = modalStackRef.current.filter((m) => m.id !== id);
    };
  }, []);

  const registerBackHandler = useCallback((handler: () => boolean) => {
    customHandlerRef.current = handler;
    return () => {
      if (customHandlerRef.current === handler) {
        customHandlerRef.current = null;
      }
    };
  }, []);

  const cancelExitApp = useCallback(() => {
    setShowExitDialog(false);
  }, []);

  const confirmExitApp = useCallback(async () => {
    setShowExitDialog(false);
    if (Capacitor.isNativePlatform()) {
      try {
        await App.exitApp();
      } catch (err) {
        console.warn('App.exitApp failed:', err);
      }
    }
  }, []);

  /**
   * Core Back Button Handler Logic
   * Evaluates priorities:
   * 1. If Exit Dialog is open -> dismiss it (Stay)
   * 2. If Modal is open -> close topmost modal
   * 3. If DOM modal exists -> trigger close button
   * 4. If State-driven custom handler exists -> let screen handle back transition
   * 5. Route-based navigation -> screen behavior & history fallback
   * 6. Root/Home screen -> trigger Exit Confirmation Dialog
   */
  const handleBackButtonPress = useCallback(
    async (canGoBack?: boolean): Promise<boolean> => {
      // 1. Exit Dialog dismissal
      if (showExitDialogRef.current) {
        setShowExitDialog(false);
        return true;
      }

      // 2. Registered modal/sheet dismissal
      if (modalStackRef.current.length > 0) {
        const topModal = modalStackRef.current[modalStackRef.current.length - 1];
        topModal.onClose();
        return true;
      }

      // 3. Fallback check for any active unmanaged DOM modal/overlay
      if (typeof document !== 'undefined') {
        const openDomModal = document.querySelector('[role="dialog"], .fixed.z-50') as HTMLElement;
        if (openDomModal) {
          const closeBtn = openDomModal.querySelector('button[aria-label="Close"], button:has(svg.lucide-x)') as HTMLButtonElement;
          if (closeBtn) {
            closeBtn.click();
            return true;
          }
        }
      }

      // 4. State-based nested screen handling
      if (customHandlerRef.current) {
        const handled = customHandlerRef.current();
        if (handled) return true;
      }

      // 5. Route-based navigation rules
      const currentPath = latestPathnameRef.current;

      if (currentPath !== '/') {
        // Specific screen behavior rules:
        // Profile -> Home
        if (currentPath === '/dashboard' || currentPath === '/owner') {
          navigate('/');
          return true;
        }

        // Success / Pass -> Passes or Home
        if (currentPath.startsWith('/pass/')) {
          if (historyDepthRef.current > 1) {
            navigate(-1);
          } else {
            navigate('/my-bookings');
          }
          return true;
        }

        // Explore -> Home
        if (currentPath === '/explore') {
          navigate('/');
          return true;
        }

        // Login / Signup -> Previous page or Home fallback
        if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/forgot-password') {
          if (historyDepthRef.current > 1) {
            navigate(-1);
          } else {
            navigate('/');
          }
          return true;
        }

        // Other sub-routes: preserve history if meaningful, fallback to '/'
        if (historyDepthRef.current > 1 && canGoBack !== false) {
          navigate(-1);
        } else {
          navigate('/');
        }
        return true;
      }

      // 6. User is on Root/Home screen -> trigger Exit Confirmation Dialog
      setShowExitDialog(true);
      return true;
    },
    [navigate]
  );

  return (
    <BackNavigationContext.Provider
      value={{
        registerModal,
        registerBackHandler,
        showExitDialog,
        setShowExitDialog,
        confirmExitApp,
        cancelExitApp,
        triggerBackButton: handleBackButtonPress,
        historyDepth
      }}
    >
      {children}
    </BackNavigationContext.Provider>
  );
};

export const useBackNavigation = () => {
  const ctx = useContext(BackNavigationContext);
  if (!ctx) {
    throw new Error('useBackNavigation must be used within a BackNavigationProvider');
  }
  return ctx;
};

/**
 * Hook to automatically register a modal with the back button stack while open.
 */
export const useRegisterModal = (isOpen: boolean, onClose: () => void, modalId?: string) => {
  const { registerModal } = useBackNavigation();
  const idRef = useRef(modalId || `modal-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!isOpen) return;
    return registerModal(idRef.current, onClose);
  }, [isOpen, onClose, registerModal]);
};
