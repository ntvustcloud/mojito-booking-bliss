import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getService, services } from "@/data/services";
import { getDesign } from "@/data/gallery";

const STORAGE_KEY = "mojito.appointment.v1";

type Persisted = {
  serviceIds: string[];
  designId: string | null;
};

type AppointmentContextValue = {
  serviceIds: string[];
  designId: string | null;
  selectedServices: ReturnType<typeof getSelected>;
  savedDesign: ReturnType<typeof getDesign> | null;
  count: number;
  totalPrice: number;
  totalDuration: number;
  hasService: (id: string) => boolean;
  addService: (id: string) => void;
  removeService: (id: string) => void;
  saveDesign: (id: string) => void;
  removeDesign: () => void;
  clearAll: () => void;
  trayOpen: boolean;
  setTrayOpen: (open: boolean) => void;
};

function getSelected(ids: string[]) {
  return ids
    .map((id) => getService(id))
    .filter((service): service is NonNullable<typeof service> => Boolean(service));
}

const AppointmentContext = createContext<AppointmentContextValue | null>(null);

export function AppointmentProvider({ children }: { children: ReactNode }) {
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [designId, setDesignId] = useState<string | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Prototype persistence: localStorage. Swap for a real API later.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        const validIds = (parsed.serviceIds ?? []).filter((id) =>
          services.some((service) => service.id === id),
        );
        setServiceIds(validIds);
        setDesignId(parsed.designId && getDesign(parsed.designId) ? parsed.designId : null);
      }
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ serviceIds, designId }));
    } catch {
      /* storage unavailable */
    }
  }, [serviceIds, designId, hydrated]);

  const addService = useCallback((id: string) => {
    setServiceIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const removeService = useCallback((id: string) => {
    setServiceIds((current) => current.filter((item) => item !== id));
  }, []);

  const saveDesign = useCallback((id: string) => setDesignId(id), []);
  const removeDesign = useCallback(() => setDesignId(null), []);
  const clearAll = useCallback(() => {
    setServiceIds([]);
    setDesignId(null);
  }, []);

  const value = useMemo<AppointmentContextValue>(() => {
    const selectedServices = getSelected(serviceIds);
    return {
      serviceIds,
      designId,
      selectedServices,
      savedDesign: designId ? (getDesign(designId) ?? null) : null,
      count: selectedServices.length,
      totalPrice: selectedServices.reduce((sum, service) => sum + service.price, 0),
      totalDuration: selectedServices.reduce((sum, service) => sum + service.duration, 0),
      hasService: (id: string) => serviceIds.includes(id),
      addService,
      removeService,
      saveDesign,
      removeDesign,
      clearAll,
      trayOpen,
      setTrayOpen,
    };
  }, [serviceIds, designId, trayOpen, addService, removeService, saveDesign, removeDesign, clearAll]);

  return <AppointmentContext.Provider value={value}>{children}</AppointmentContext.Provider>;
}

export function useAppointment() {
  const context = useContext(AppointmentContext);
  if (!context) throw new Error("useAppointment must be used inside AppointmentProvider");
  return context;
}
