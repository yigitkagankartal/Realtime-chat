import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Client} from "@stomp/stompjs";
import type { IMessage } from "@stomp/stompjs";
import type { StompSubscription } from "@stomp/stompjs";
import type{ ChatMessageResponse } from "../api/chat";

interface SocketContextType {
  client: Client | null;
  isConnected: boolean;
  lastMessage: ChatMessageResponse | null;
  sendMessage: (conversationId: number, content: string, senderId: number) => void;
  sendTyping: (conversationId: number, senderId: number) => void;
  subscribe: (destination: string, callback: (msg: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode; userId: number }> = ({ children, userId }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<ChatMessageResponse | null>(null);
  
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!userId) return;
    // Zaten bağlıysa tekrar bağlanma
    if (clientRef.current && clientRef.current.active) return;

    const newClient = new Client({
      brokerURL: import.meta.env.VITE_WS_URL,
      reconnectDelay: 5000,
      onConnect: () => {
        setIsConnected(true);
        console.log("🟢 Global Socket Bağlandı. User ID:", userId);

        newClient.subscribe(`/topic/notifications/${userId}`, (msg: IMessage) => {
          try {
            const body = JSON.parse(msg.body) as ChatMessageResponse;
            setLastMessage(body); 
          } catch (e) {
            console.error("Bildirim parse hatası:", e);
          }
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
        console.log("🔴 Socket Koptu");
      }
    });

    newClient.activate();
    clientRef.current = newClient;
    setClient(newClient);

    return () => {
      newClient.deactivate();
    };
  }, [userId]);

  const sendMessage = (conversationId: number, content: string, senderId: number) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: "/app/chat.sendMessage",
        body: JSON.stringify({ conversationId, content, senderId }),
      });
    }
  };

  const sendTyping = (conversationId: number, senderId: number) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: "/app/chat.typing",
        body: JSON.stringify({ conversationId, senderId }),
      });
    }
  };

  const subscribe = (destination: string, callback: (msg: any) => void) => {
    if (!clientRef.current || !clientRef.current.connected) {
      return () => {};
    }

    const subscription: StompSubscription = clientRef.current.subscribe(destination, (message) => {
      const body = JSON.parse(message.body);
      callback(body);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  };

  return (
    <SocketContext.Provider value={{ client, isConnected, lastMessage, sendMessage, sendTyping, subscribe }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within a SocketProvider");
  return context;
};