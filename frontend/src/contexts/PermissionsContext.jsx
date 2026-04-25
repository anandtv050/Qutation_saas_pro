import { createContext, useContext, useEffect, useState, useRef } from "react";
import userService from "@/services/userService";

// Shape: { lstModules: string[], lstNav: [{strKey,strLabel,strIcon,strPath,blnShowInSidebar,blnAdminOnly}, ...] }
const PermissionsContext = createContext({
  permissions: null,
  isLoading: true,
  refresh: () => {},
});

export function PermissionsProvider({ children }) {
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // useRef guards against React StrictMode's double-invocation in dev
  const fetchedRef = useRef(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await userService.getMyPermissions();
      setPermissions(res || { lstModules: [], lstNav: [] });
    } catch {
      setPermissions({ lstModules: [], lstNav: [] });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    load();
  }, []);

  return (
    <PermissionsContext.Provider value={{ permissions, isLoading, refresh: load }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

/**
 * Convenience hook: returns true if the current user has access to the given module.
 * Admin (user_id=1) always returns true.
 * Use for inline checks like: if (!usePermission("warranty")) return null;
 */
export function usePermission(moduleKey) {
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const { permissions } = useContext(PermissionsContext);
  if (userInfo.intUserId === 1) return true;
  return !!permissions?.lstModules?.includes(moduleKey);
}
