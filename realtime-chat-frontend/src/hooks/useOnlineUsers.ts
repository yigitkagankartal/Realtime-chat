import { useEffect, useState } from "react";
import api from "../api/client";

export const useOnlineUsers = (meId: number) => {
  const [onlineIds, setOnlineIds] = useState<number[]>([]);

  useEffect(() => {
    let isMounted = true;

    const sendHeartbeat = async () => {
      try {
        await api.post("/api/presence/heartbeat", { userId: meId });
      } catch (e) {
        console.error("Failed to send heartbeat", e);
      }
    };

    const fetchOnline = async () => {
      try {
        const res = await api.get<number[]>("/api/presence/online");
        if (isMounted) {
          setOnlineIds(res.data);
        }
      } catch (e) {
        console.error("Failed to fetch online users", e);
      }
    };

    // İlk nabız + online liste
    sendHeartbeat();
    fetchOnline();

    // Her 5 saniyede bir nabız & online listesi
    const interval = setInterval(() => {
      sendHeartbeat();
      fetchOnline();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [meId]);

  return onlineIds;
};
