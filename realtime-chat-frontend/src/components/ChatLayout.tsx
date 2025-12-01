import { useCallback, useEffect, useRef, useState } from "react";
import {
  createOrGetConversation,
  getMessages,
  listConversations,
  listUsers,
  markConversationSeen,
} from "../api/chat";
import type {
  ChatMessageResponse,
  ConversationResponse,
  UserListItem,
  MessageStatus,
} from "../api/chat";
import type { MeResponse } from "../api/auth";
import { useChatWebSocket } from "../hooks/useWebSocket";
import { useOnlineUsers } from "../hooks/useOnlineUsers";

interface ChatLayoutProps {
  me: MeResponse;
}

// Saat formatı (sadece saat:dakika)
const formatTime = (iso: string | undefined) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

// Tik seçici – sadece SEEN → çift tik, diğerleri tek tik
const renderStatusTicks = (status?: MessageStatus) => {
  if (status === "SEEN") return "✓✓";
  return "✓";
};

const ChatLayout: React.FC<ChatLayoutProps> = ({ me }) => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Her konuşmanın mesajlarını cachelemek için (sol listede son mesaj & unread için)
  const [messageCache, setMessageCache] = useState<
    Record<number, ChatMessageResponse[]>
  >({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const onlineIds = useOnlineUsers(me.id);

  // Mesaj dinleyici (WebSocket)
  const handleIncomingMessage = useCallback(
    async (msg: ChatMessageResponse) => {
      if (msg.conversationId === selectedConversation?.id) {
        // UI'ya direkt ekle
        setMessages((prev) => [...prev, msg]);
      }

      // Gelen mesajı cache'e de ekle (hangi sohbetten geliyorsa)
      setMessageCache((prev) => {
        const existing = prev[msg.conversationId] ?? [];
        return {
          ...prev,
          [msg.conversationId]: [...existing, msg],
        };
      });

      // Bu mesajı ben göndermediysem → SEEN tetikle
      if (msg.senderId !== me.id) {
        try {
          await markConversationSeen(msg.conversationId, me.id);
          console.log("SEEN gönderildi");

          // SEEN güncellemesi DB'de yapıldıktan sonra mesajları tazele
          const refreshed = await getMessages(msg.conversationId, me.id);

          setMessages((prev) =>
            selectedConversation?.id === msg.conversationId ? refreshed : prev
          );

          setMessageCache((prev) => ({
            ...prev,
            [msg.conversationId]: refreshed,
          }));
        } catch (err) {
          console.error("SEEN ERROR:", err);
        }
      }
    },
    [selectedConversation, me.id]
  );

  // Typing listener
  const handleTyping = useCallback(
    (senderId: number) => {
      if (senderId === me.id) return;
      setTypingUserId(senderId);
      setTimeout(() => {
        setTypingUserId((prev) => (prev === senderId ? null : prev));
      }, 2000);
    },
    [me.id]
  );

  const { sendMessage, sendTyping } = useChatWebSocket(
    selectedConversation ? selectedConversation.id : null,
    handleIncomingMessage,
    handleTyping
  );

  // Kullanıcı + sohbet + her sohbet için mesajları preload et
  useEffect(() => {
    const load = async () => {
      const [userList, convList] = await Promise.all([
        listUsers(),
        listConversations(),
      ]);
      setUsers(userList);
      setConversations(convList);

      // Tüm konuşmalar için son mesaj / unread gösterebilmek adına mesajları önden çek
      const cache: Record<number, ChatMessageResponse[]> = {};

      await Promise.all(
        convList.map(async (c) => {
          try {
            const history = await getMessages(c.id, me.id);
            cache[c.id] = history;
          } catch (e) {
            console.error("Mesajlar yüklenirken hata (conversationId=", c.id, "):", e);
          }
        })
      );

      setMessageCache(cache);
    };

    load();
  }, [me.id]);

  // Sohbet aç
  const openConversationWith = async (otherUserId: number) => {
    const conv = await createOrGetConversation(otherUserId);

    // Eğer yeni bir conversation oluştuysa state'e ekle
    setConversations((prev) =>
      prev.some((c) => c.id === conv.id) ? prev : [...prev, conv]
    );

    setSelectedConversation(conv);

    const history = await getMessages(conv.id, me.id); // viewerId olarak me.id
    setMessages(history);

    // cache'i güncelle
    setMessageCache((prev) => ({
      ...prev,
      [conv.id]: history,
    }));

    // sohbeti açar açmaz SEEN olarak işaretle
    markConversationSeen(conv.id, me.id).catch(() => {});
  };

  const handleSend = () => {
    if (!selectedConversation || !newMessage.trim()) return;

    sendMessage({
      conversationId: selectedConversation.id,
      senderId: me.id,
      content: newMessage,
    });

    setNewMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!selectedConversation || !value.trim()) return;
    sendTyping(me.id);
  };

  const typingUser =
    typingUserId !== null
      ? users.find((u) => u.id === typingUserId)
      : undefined;

  // Seçili konuşmadaki karşı tarafın bilgisi
  const getPeerInfo = () => {
    if (!selectedConversation) return null;

    if (selectedConversation.user1Id === me.id) {
      return {
        id: selectedConversation.user2Id,
        name: selectedConversation.user2Name,
      };
    }

    return {
      id: selectedConversation.user1Id,
      name: selectedConversation.user1Name,
    };
  };

  const peer = getPeerInfo();
  const isPeerOnline = peer ? onlineIds.includes(peer.id) : false;

  // Son görülme metni (bugün, dün, yakınlarda)
  let lastSeenText: string | null = null;

  if (peer) {
    const peerMessages = messages.filter((m) => m.senderId === peer.id);

    if (peerMessages.length > 0) {
      const latest = peerMessages[peerMessages.length - 1];
      const d = new Date(latest.createdAt);
      const now = new Date();

      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const startOfThatDay = new Date(d);
      startOfThatDay.setHours(0, 0, 0, 0);

      const diffMs = startOfToday.getTime() - startOfThatDay.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const timeStr = d.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (diffDays === 0) {
        lastSeenText = `Son görülme bugün ${timeStr}`;
      } else if (diffDays === 1) {
        lastSeenText = `Son görülme dün ${timeStr}`;
      } else {
        lastSeenText = "Son görülme yakınlarda";
      }
    }
  }

  // Aynı gün mü?
  const isSameDay = (a: Date, b: Date) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  // Tarih label (Bugün / Dün / gg.aa)
  const formatDateLabel = (d: Date) => {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfThatDay = new Date(d);
    startOfThatDay.setHours(0, 0, 0, 0);

    const diffMs = startOfToday.getTime() - startOfThatDay.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Bugün";
    if (diffDays === 1) return "Dün";

    return d.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  // Auto-scroll
  useEffect(() => {
    if (!selectedConversation) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedConversation?.id]);

  // Sol panel için: kullanıcı + conversation + son mesaj + unread bilgisi
  const sidebarItems = users
    .filter((u) => u.id !== me.id)
    .map((user) => {
      const isOnline = onlineIds.includes(user.id);

      // Bu kullanıcı ile olan conversation'ı bul
      const conv = conversations.find(
        (c) =>
          (c.user1Id === me.id && c.user2Id === user.id) ||
          (c.user2Id === me.id && c.user1Id === user.id)
      );

      const convMessages = conv ? messageCache[conv.id] ?? [] : [];

      const lastMessage =
        convMessages.length > 0
          ? convMessages[convMessages.length - 1]
          : undefined;

      const lastMessageText = lastMessage
        ? (lastMessage.senderId === me.id ? "Sen: " : "") +
          lastMessage.content
        : "Henüz mesaj yok";

      const lastMessageTime = lastMessage
        ? formatTime(lastMessage.createdAt)
        : "";

      const unreadCount = convMessages.filter(
        (m) => m.senderId !== me.id && m.status !== "SEEN"
      ).length;

      const lastMessageDate = lastMessage
        ? new Date(lastMessage.createdAt).getTime()
        : 0;

      return {
        user,
        isOnline,
        conv,
        lastMessageText,
        lastMessageTime,
        unreadCount,
        lastMessageDate,
      };
    })
    // En son mesaj atan konuşma en üstte olacak şekilde sırala
    .sort((a, b) => b.lastMessageDate - a.lastMessageDate);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Segoe UI, sans-serif",
        backgroundColor: "#E8DFFC",
      }}
    >
      {/* SOL PANEL */}
      <div
        style={{
          width: 260,
          borderRight: "1px solid #CCC",
          backgroundColor: "#F3F1F9",
          padding: 8,
          overflowY: "auto",
        }}
      >
        <h3 style={{ marginTop: 0, color: "#4A3F71" }}>Sohbetler</h3>

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {sidebarItems.map(
            ({
              user,
              isOnline,
              lastMessageText,
              lastMessageTime,
              unreadCount,
            }) => (
              <li
                key={user.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                  padding: "8px 10px",
                  borderRadius: 10,
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                }}
                onClick={() => openConversationWith(user.id)}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: isOnline ? "#9B5DE5" : "#bbb",
                    borderRadius: "50%",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#4A3F71" }}>
                    {user.displayName}
                  </div>
                  <div style={{ fontSize: 12, color: "#7C6FA5" }}>
                    {user.email}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9a8fb8",
                      marginTop: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 120,
                      }}
                    >
                      {lastMessageText}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {lastMessageTime && <span>{lastMessageTime}</span>}
                      {unreadCount > 0 && (
                        <span
                          style={{
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: "#9B5DE5",
                            color: "white",
                            fontSize: 11,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 4px",
                          }}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          )}
        </ul>
      </div>

      {/* SAĞ PANEL */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(#E8DFFC, #C9B9F7)",
        }}
      >
        {/* ÜST BAR */}
        <div
          style={{
            backgroundColor: "#6C4AB6",
            color: "white",
            padding: "14px 18px",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {peer ? (
            <div>
              <div style={{ fontWeight: 600 }}>{peer.name}</div>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.85,
                }}
              >
                {isPeerOnline
                  ? "Çevrimiçi"
                  : lastSeenText ?? "Son görülme yakınlarda"}
              </div>
            </div>
          ) : (
            <strong>Sohbet Seç</strong>
          )}
        </div>

        {/* MESAJLAR */}
        <div
          style={{
            flex: 1,
            padding: 16,
            overflowY: "auto",
          }}
        >
          {selectedConversation ? (
            <>
              {messages.map((m, index) => {
                const isMine = m.senderId === me.id;
                const ticks = renderStatusTicks(m.status);
                const time = formatTime(m.createdAt);
                const tickColor =
                  m.status === "SEEN" ? "#9B5DE5" : "#777";

                const currentDate = new Date(m.createdAt);
                const prev = messages[index - 1];
                const showDateDivider =
                  index === 0 ||
                  (prev &&
                    !isSameDay(currentDate, new Date(prev.createdAt)));

                return (
                  <div key={m.id}>
                    {showDateDivider && (
                      <div
                        style={{
                          textAlign: "center",
                          margin: "8px 0",
                          fontSize: 12,
                          color: "#999",
                        }}
                      >
                        {formatDateLabel(currentDate)}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: isMine ? "flex-end" : "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: isMine ? "#DCC7FF" : "#FFFFFF",
                          borderRadius: 10,
                          padding: "10px 12px",
                          maxWidth: "70%",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                        }}
                      >
                        <div style={{ color: "#333" }}>{m.content}</div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            fontSize: 11,
                            marginTop: 4,
                            color: tickColor,
                            gap: 4,
                          }}
                        >
                          <span style={{ color: "#555" }}>{time}</span>
                          {isMine && <span>{ticks}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <p style={{ color: "#777" }}>Soldan bir kullanıcı seç.</p>
          )}
        </div>

        {/* YAZIYOR */}
        {selectedConversation && typingUser && (
          <div
            style={{
              padding: "4px 18px",
              fontSize: 13,
              color: "#5A4A85",
              fontStyle: "italic",
            }}
          >
            {typingUser.displayName} yazıyor...
          </div>
        )}

        {/* INPUT */}
        <div
          style={{
            padding: 12,
            display: "flex",
            gap: 10,
            backgroundColor: "#F3F1F9",
            borderTop: "1px solid #CCC",
          }}
        >
          <input
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 25,
              border: "1px solid #C5B8E6",
              outline: "none",
              backgroundColor: "#FFFFFF",
              color: "#4A3F71",
            }}
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Mesaj yaz..."
          />

          <button
            onClick={handleSend}
            style={{
              padding: "12px 20px",
              borderRadius: 25,
              backgroundColor: "#6C4AB6",
              border: "none",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;
