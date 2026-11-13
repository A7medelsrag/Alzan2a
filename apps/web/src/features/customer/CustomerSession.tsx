import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getCurrentCustomer,
  logoutCustomer,
  type Customer,
} from "./api/account";

type CustomerSession = NonNullable<Awaited<ReturnType<typeof getCurrentCustomer>>>;
type SessionStatus = "checking" | "authenticated" | "anonymous" | "unavailable";
type CustomerSessionContextValue = {
  customer: Customer | null;
  csrfToken: string | null;
  status: SessionStatus;
  acceptSession: (session: CustomerSession) => void;
  updateCustomer: (customer: Customer) => void;
  refresh: () => void;
  logout: () => Promise<void>;
};

const CustomerSessionContext = createContext<CustomerSessionContextValue | null>(null);

export default function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>("checking");
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("checking");
    void getCurrentCustomer()
      .then((current) => {
        if (!active) return;
        setSession(current);
        setStatus(current ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setStatus("unavailable");
      });
    return () => {
      active = false;
    };
  }, [refreshVersion]);

  const value = useMemo<CustomerSessionContextValue>(() => ({
    customer: session?.data ?? null,
    csrfToken: session?.csrfToken ?? null,
    status,
    acceptSession: (nextSession) => {
      setSession(nextSession);
      setStatus("authenticated");
    },
    updateCustomer: (customer) => {
      setSession((current) => current ? { ...current, data: customer } : current);
    },
    refresh: () => setRefreshVersion((version) => version + 1),
    logout: async () => {
      if (session?.csrfToken) await logoutCustomer(session.csrfToken);
      setSession(null);
      setStatus("anonymous");
    },
  }), [session, status]);

  return <CustomerSessionContext.Provider value={value}>{children}</CustomerSessionContext.Provider>;
}

export function useCustomerSession(): CustomerSessionContextValue {
  const context = useContext(CustomerSessionContext);
  if (!context) throw new Error("CustomerSessionProvider is missing");
  return context;
}
