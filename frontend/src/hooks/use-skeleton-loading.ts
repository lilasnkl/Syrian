import { useEffect, useState } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { useDataStore } from "@/stores/data-store";

export const useSkeletonLoading = (delay = 800) => {
  const [delayLoading, setDelayLoading] = useState(true);
  const authHydrated = useAuthStore((state) => state.isHydrated);
  const dataHydrated = useDataStore((state) => state.isHydrated);
  const dataSyncing = useDataStore((state) => state.isSyncing);

  useEffect(() => {
    const timer = setTimeout(() => setDelayLoading(false), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const isLoading = delayLoading || !authHydrated || !dataHydrated || dataSyncing;

  return { isLoading };
};