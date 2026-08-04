import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { MyAccountResponse } from "@shared/api.interface";
import { fetchMyAccount } from "@client/src/api";

interface ExtokenAccountContextValue {
  data: MyAccountResponse | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const ExtokenAccountContext =
  createContext<ExtokenAccountContextValue | null>(null);

export const ExtokenAccountProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [data, setData] = useState<MyAccountResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchMyAccount();
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ExtokenAccountContext.Provider
      value={{ data, loading, error, refresh: load }}
    >
      {children}
    </ExtokenAccountContext.Provider>
  );
};

export function useExtokenAccount(): ExtokenAccountContextValue {
  const ctx = useContext(ExtokenAccountContext);
  if (!ctx) {
    throw new Error("useExtokenAccount 必须在 ExtokenAccountProvider 内使用");
  }
  return ctx;
}
