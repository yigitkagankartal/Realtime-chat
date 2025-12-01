import { useEffect, useRef } from "react";
import { Client, type IMessage } from "@stomp/stompjs";

export const useChatWebSocket = (
  conversationId: number | null,
  onMessage: (msg: any) => void,
  onTyping?: (senderId: number) => void
) => {

  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const client = new Client({
      brokerURL: "ws://localhost:8080/ws",
      reconnectDelay: 5000,
      debug: () => {
        // console.log("STOMP:", msg);
      },
      onConnect: () => {
  // Normal mesajları dinle
  client.subscribe(
    `/topic/conversations/${conversationId}`,
    (message: IMessage) => {
      const body = JSON.parse(message.body);
      onMessage(body);
    }
  );

  // "Yazıyor" eventini dinle
  if (onTyping) {
    client.subscribe(
      `/topic/conversations/${conversationId}/typing`,
      (message: IMessage) => {
        const body = JSON.parse(message.body) as {
          conversationId: number;
          senderId: number;
        };
        onTyping(body.senderId);
      }
    );
  }
},
    });

    clientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [conversationId, onMessage]);

  const sendMessage = (payload: any) => {
    if (!clientRef.current || !clientRef.current.connected || !conversationId) {
      return;
    }

    clientRef.current.publish({
      destination: "/app/chat.sendMessage",
      body: JSON.stringify(payload),
    });
    
  };
    const sendTyping = (senderId: number) => {
    if (!clientRef.current || !clientRef.current.connected || !conversationId) {
      return;
    }

    clientRef.current.publish({
      destination: "/app/chat.typing",
      body: JSON.stringify({
        conversationId,
        senderId,
      }),
    });
  };

  

  return { sendMessage, sendTyping};
  
  
};
