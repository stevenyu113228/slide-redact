import { useState, useEffect, useCallback } from "react";
import { checkApiSupport } from "../core/office-api";

interface OfficeContextState {
  isReady: boolean;
  isSupported: boolean;
  missingApis: string[];
  error: string | null;
}

// Module-level flag so HMR re-mounts can detect that Office already initialized
let officeInitialized = false;
let officeHost: Office.HostType | null = null;

export function useOfficeContext() {
  const [state, setState] = useState<OfficeContextState>(() => {
    // If Office was already initialized (e.g. HMR reload), set ready immediately
    if (officeInitialized) {
      if (officeHost !== Office.HostType.PowerPoint) {
        return {
          isReady: true,
          isSupported: false,
          missingApis: [],
          error: "This add-in only works in PowerPoint.",
        };
      }
      const apiCheck = checkApiSupport();
      return {
        isReady: true,
        isSupported: apiCheck.supported,
        missingApis: apiCheck.missingApis,
        error: apiCheck.supported
          ? null
          : "Some required APIs are not available. Please update Office.",
      };
    }
    return {
      isReady: false,
      isSupported: false,
      missingApis: [],
      error: null,
    };
  });

  useEffect(() => {
    if (officeInitialized) return; // Already handled in initial state

    Office.onReady((info) => {
      officeInitialized = true;
      officeHost = info.host;

      if (info.host !== Office.HostType.PowerPoint) {
        setState({
          isReady: true,
          isSupported: false,
          missingApis: [],
          error: "This add-in only works in PowerPoint.",
        });
        return;
      }

      const apiCheck = checkApiSupport();
      setState({
        isReady: true,
        isSupported: apiCheck.supported,
        missingApis: apiCheck.missingApis,
        error: apiCheck.supported
          ? null
          : "Some required APIs are not available. Please update Office.",
      });
    });
  }, []);

  const refresh = useCallback(() => {
    if (state.isReady) {
      const apiCheck = checkApiSupport();
      setState((prev) => ({
        ...prev,
        isSupported: apiCheck.supported,
        missingApis: apiCheck.missingApis,
      }));
    }
  }, [state.isReady]);

  return { ...state, refresh };
}
