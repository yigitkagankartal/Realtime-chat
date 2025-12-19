import { useCallback, useEffect, useRef, useState } from "react";
import {
  createOrGetConversation,
  getMessages,
  listConversations,
  listUsers,
  markConversationSeen,
  getUserById,
  uploadAudio
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
import ProfileSidebar from "./ProfileSidebar";
import ProfileSetupModal from "./ProfileSetupModal";
import ContactInfoSidebar from "./ContactInfoSidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faMicrophone, faTrash, faCheck, faPlus} from "@fortawesome/free-solid-svg-icons";
import AudioPlayer from "./AudioPlayer";
interface ChatLayoutProps {
  me: MeResponse;
  onLogout: () => void;
}

// ✅ CSS: Animasyon Kodları
const typingIndicatorStyles = `
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
    40% { transform: scale(1.0); opacity: 1; }
  }
  .typing-dot {
    width: 6px; height: 6px; background-color: #9B95C9; border-radius: 50%;
    display: inline-block; animation: bounce 1.4s infinite ease-in-out both; margin: 0 2px;
  }
  .typing-dot:nth-child(1) { animation-delay: -0.32s; }
  .typing-dot:nth-child(2) { animation-delay: -0.16s; }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = typingIndicatorStyles;
document.head.appendChild(styleSheet);


// Tarih nesnesini alıp günün başlangıcına (00:00) çeker
const startOfDay = (d: Date) => {
  const newDate = new Date(d);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

// WhatsApp tarzı tarih etiketi oluşturur
const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();

  const today = startOfDay(now);
  const messageDate = startOfDay(date);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDate.getTime() === today.getTime()) {
    return "Bugün";
  }
  if (messageDate.getTime() === yesterday.getTime()) {
    return "Dün";
  }

  const diffTime = Math.abs(today.getTime() - messageDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return date.toLocaleDateString("tr-TR", { weekday: "long" });
  }

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (iso: string | undefined) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    : "";

const renderStatusTicks = (status?: MessageStatus) => {
  if (status === "SEEN") return "✓✓";
  return "✓";
};

const ChatLayout: React.FC<ChatLayoutProps> = ({ me, onLogout }) => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prevScrollHeight, setPrevScrollHeight] = useState<number | null>(null);
  const [isProfileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<MeResponse>(me);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [contactSidebarOpen, setContactSidebarOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<UserListItem | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // TypeScript için timer ref tipleri düzeltildi
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [messageCache, setMessageCache] = useState<
    Record<number, ChatMessageResponse[]>
  >({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const onlineIds = useOnlineUsers(me.id);

  // Mesaj dinleyici
  const handleIncomingMessage = useCallback(
    async (msg: ChatMessageResponse) => {
      if (msg.conversationId === selectedConversation?.id) {
        setMessages((prev) => [...prev, msg]);
      }

      setMessageCache((prev) => {
        const existing = prev[msg.conversationId] ?? [];
        return {
          ...prev,
          [msg.conversationId]: [...existing, msg],
        };
      });

      if (msg.senderId !== me.id) {
        try {
          await markConversationSeen(msg.conversationId, me.id);
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

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      setTypingUserId(senderId);

      typingTimeoutRef.current = setTimeout(() => {
        setTypingUserId(null);
        typingTimeoutRef.current = null;
      }, 2000);
    },
    [me.id]
  );

  const { sendMessage, sendTyping } = useChatWebSocket(
    selectedConversation ? selectedConversation.id : null,
    handleIncomingMessage,
    handleTyping
  );

  useEffect(() => {
    const load = async () => {
      const [userList, convList] = await Promise.all([
        listUsers(),
        listConversations(),
      ]);
      setUsers(userList);
      setConversations(convList);

      const cache: Record<number, ChatMessageResponse[]> = {};

      await Promise.all(
        convList.map(async (c) => {
          try {
            const history = await getMessages(c.id, me.id);
            cache[c.id] = [...history].reverse();
          } catch (e) {
            console.error("Mesajlar yüklenirken hata (conversationId=", c.id, "):", e);
          }
        })
      );

      setMessageCache(cache);
    };

    load();
  }, [me.id]);

  const openConversationWith = async (otherUserId: number) => {
    setContactSidebarOpen(false);
    setContactInfo(null);
    const conv = await createOrGetConversation(otherUserId);
    setSelectedConversation(conv);
    setPage(0);
    setHasMore(true);
    setIsLoadingHistory(false);

    const history = await getMessages(conv.id, me.id, 0);

    if (history.length < 50) {
      setHasMore(false);
    }

    const sortedHistory = [...history].reverse();

    setMessages(sortedHistory);

    setMessageCache((prev) => ({
      ...prev,
      [conv.id]: sortedHistory,
    }));

    markConversationSeen(conv.id, me.id).catch(() => { });
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

  const getPeerInfo = () => {
    if (!selectedConversation) return null;
    const peerId =
      selectedConversation.user1Id === me.id
        ? selectedConversation.user2Id
        : selectedConversation.user1Id;
    const userObj = users.find((u) => u.id === peerId);
    return {
      id: peerId,
      name: userObj
        ? userObj.displayName
        : selectedConversation.user1Id === me.id
          ? selectedConversation.user2Name
          : selectedConversation.user1Name,
      profilePictureUrl: userObj?.profilePictureUrl,
    };
  };

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;

    if (target.scrollTop === 0 && hasMore && !isLoadingHistory) {
      setIsLoadingHistory(true);
      setPrevScrollHeight(target.scrollHeight);

      const nextPage = page + 1;
      const oldMessages = await getMessages(selectedConversation!.id, me.id, nextPage);

      if (oldMessages.length === 0) {
        setHasMore(false);
        setIsLoadingHistory(false);
        return;
      }

      if (oldMessages.length < 50) {
        setHasMore(false);
      }

      const sortedOldMessages = [...oldMessages].reverse();
      setMessages((prev) => [...sortedOldMessages, ...prev]);
      setPage(nextPage);
      setIsLoadingHistory(false);
    }
  };

  const peer = getPeerInfo();
  const isPeerOnline = peer ? onlineIds.includes(peer.id) : false;

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

  useEffect(() => {
    if (!selectedConversation) return;
    if (prevScrollHeight) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, selectedConversation?.id]);

  useEffect(() => {
    if (prevScrollHeight && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevScrollHeight;
      setPrevScrollHeight(null);
    }
  }, [messages]);

  useEffect(() => {
    if (me.displayName === me.phoneNumber) {
      setShowSetupModal(true);
    }
  }, [me]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      if (!isMobile) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [selectedConversation, isMobile]);

  // BU FONKSİYONU ESKİSİNİN YERİNE YAPIŞTIR
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const localChunks: Blob[] = []; // Veriyi burada tutacağız

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };

      // Kayıt durduğunda (stop() çağrıldığında) burası çalışır
      recorder.onstop = async () => {
        // Eğer kayıt çok kısaysa (yanlışlıkla basıldıysa) iptal et
        if (localChunks.length === 0) return;

        const audioBlob = new Blob(localChunks, { type: "audio/webm" });

        // Eğer kullanıcı "İptal" butonuna bastıysa bu fonksiyon çalışmasın diye bir flag kontrolü yapılabilir
        // Ama şimdilik basit tutalım: onstop her zaman göndermeye çalışır. 
        // İptal etmek için cancelRecording içinde onstop'u null yapacağız.

        await sendAudioMessage(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error(err);
      alert("Mikrofon izni gerekli.");
    }
  };

  // İPTAL FONKSİYONU (Güncel)
  const cancelRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.onstop = null; // ✅ Göndermeyi engelle
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    stopTimer();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  // GÖNDERME FONKSİYONU (Güncel)
  const finishRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop(); // Bu, onstop'u tetikler -> sendAudioMessage çalışır
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    stopTimer();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!selectedConversation) return;
    try {
      const audioUrl = await uploadAudio(audioBlob);
      sendMessage({
        conversationId: selectedConversation.id,
        senderId: me.id,
        content: "AUDIO::" + audioUrl,
      });
    } catch (error) {
      console.error("Ses gönderilemedi:", error);
    }
  };

  const handleUpdateMe = (updated: MeResponse) => {
    setCurrentUser(updated);
  };

  const handleContactClick = async () => {
    if (!peer) return;
    setContactSidebarOpen(true);
    try {
      const data = await getUserById(peer.id);
      setContactInfo(data);
    } catch (error) {
      console.error("Kullanıcı detayı çekilemedi", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const sidebarItems = users
    .filter((u) => u.id !== me.id)
    .map((user) => {
      const isOnline = onlineIds.includes(user.id);
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
  ? (
      lastMessage.content.startsWith("AUDIO::") ? (
          // Eğer ses kaydıysa: Mikrofon İkonu + "Sesli Mesaj" yazısı
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FontAwesomeIcon icon={faMicrophone} /> Sesli Mesaj
          </span>
      ) : (
          // Normal mesajsa: "Sen: selam" gibi göster
          (lastMessage.senderId === me.id ? "Sen: " : "") + lastMessage.content
      )
    )
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
    .sort((a, b) => b.lastMessageDate - a.lastMessageDate);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Segoe UI, sans-serif",
        background: "linear-gradient(180deg, #C6A7FF 0%, #9B8CFF 45%, #6F79FF 100%)",
      }}
    >
      {/* 1. BÜYÜK RESİM POPUP (LIGHTBOX) */}
      {viewingImage && (
        <div
          style={{
            position: "fixed", zIndex: 3000, top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center"
          }}
          onClick={() => setViewingImage(null)}
        >
          <img
            src={viewingImage}
            alt="Full Size"
            style={{ maxHeight: "85%", maxWidth: "85%", borderRadius: 10, boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}
          />
          <button
            onClick={() => setViewingImage(null)}
            style={{
              position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.2)",
              border: "none", color: "white", fontSize: 24, cursor: "pointer", borderRadius: "50%",
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. İLK GİRİŞ POPUP'I */}
      {showSetupModal && (
        <ProfileSetupModal
          onComplete={(updated) => {
            setCurrentUser(updated);
            setShowSetupModal(false);
          }}
        />
      )}

      {/* 3. PROFİL SIDEBAR */}
      <ProfileSidebar
        isOpen={isProfileSidebarOpen}
        onClose={() => setProfileSidebarOpen(false)}
        me={currentUser}
        onUpdateMe={handleUpdateMe}
        onViewImage={(url) => setViewingImage(url)}
      />

      {/* 4. CONTACT INFO SIDEBAR (SAĞ) */}
      <ContactInfoSidebar
        isOpen={contactSidebarOpen}
        onClose={() => setContactSidebarOpen(false)}
        user={contactInfo}
        onViewImage={(url) => setViewingImage(url)}
        lastSeenText={isPeerOnline ? "Çevrimiçi" : (lastSeenText ?? "")}
      />

      {/* SOL PANEL */}
      <div
        style={{
          width: isMobile ? "100%" : 300,
          display: isMobile && selectedConversation ? "none" : "flex",
          borderRight: isMobile ? "none" : "1px solid #DDD6FF",
          backgroundColor: "#F5F3FF",
          padding: "12px 14px",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* SOL PANEL HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
            paddingBottom: 10,
            borderBottom: "1px solid #EAE6FF",
          }}
        >
          <div
            onClick={() => setProfileSidebarOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
              flex: 1,
              padding: "8px",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                width: 42, height: 42, borderRadius: "50%",
                backgroundColor: "#DDD6FF",
                backgroundImage: currentUser.profilePictureUrl
                  ? `url(${currentUser.profilePictureUrl})`
                  : "none",
                backgroundSize: "cover", backgroundPosition: "center",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", color: "#6F79FF", fontWeight: "bold",
                border: "2px solid white", boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                flexShrink: 0
              }}
            >
              {!currentUser.profilePictureUrl && currentUser.displayName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#3E3663" }}>
              Profilim
            </span>
          </div>
        </div>

        <h3 style={{ marginTop: 5, marginBottom: 15, color: "#3E3663", paddingLeft: 6 }}>Sohbetler</h3>

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {sidebarItems.map(({ user, isOnline, lastMessageText, lastMessageTime, unreadCount }) => (
            <li
              key={user.id}
              style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
                padding: "10px 12px", borderRadius: 14, backgroundColor: "#FFFFFF",
                cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
              }}
              onClick={() => openConversationWith(user.id)}
            >
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  backgroundColor: "#EAE6FF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "16px", color: "#6F79FF", fontWeight: "600",
                  backgroundImage: user.profilePictureUrl ? `url(${user.profilePictureUrl})` : "none",
                  backgroundSize: "cover", backgroundPosition: "center"
                }}>
                  {!user.profilePictureUrl && user.displayName.charAt(0).toUpperCase()}
                </div>
                <span
                  style={{
                    position: "absolute", bottom: 0, right: 0, width: 12, height: 12,
                    backgroundColor: isOnline ? "#44b700" : "#CCC",
                    borderRadius: "50%", border: "2px solid white"
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#3E3663" }}>{user.displayName}</div>
                <div
                  style={{
                    fontSize: 11, color: "#9B95C9", marginTop: 2, display: "flex",
                    justifyContent: "space-between", gap: 8,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                    {lastMessageText}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {lastMessageTime && <span>{lastMessageTime}</span>}
                    {unreadCount > 0 && (
                      <span style={{
                        minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#6F79FF",
                        color: "white", fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center",
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
          display: isMobile && !selectedConversation ? "none" : "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #EDE9FF, #DAD4FF)",
          height: "100vh"
        }}
      >
        {/* ÜST BAR */}
        <div
          style={{
            height: "65px",
            background: "linear-gradient(90deg, #6F79FF, #9B8CFF)",
            color: "white",
            padding: "0 15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
          }}
        >
          {/* SOL GRUP */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, overflow: "hidden" }}>
            {isMobile && (
              <button
                onClick={() => setSelectedConversation(null)}
                style={{
                  background: "transparent", border: "none", color: "white",
                  fontSize: "26px", cursor: "pointer", padding: "0 8px 0 0",
                  display: "flex", alignItems: "center"
                }}
              >
                ‹
              </button>
            )}

            {peer ? (
              <div
                onClick={handleContactClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  padding: "5px 0",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 42, height: 42,
                    borderRadius: "50%",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: "bold", fontSize: "16px",
                    backgroundImage: peer.profilePictureUrl ? `url(${peer.profilePictureUrl})` : "none",
                    backgroundSize: "cover", backgroundPosition: "center",
                    border: "1.5px solid rgba(255,255,255,0.6)",
                    flexShrink: 0
                  }}
                >
                  {!peer.profilePictureUrl && peer.name.charAt(0).toUpperCase()}
                </div>

                <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ fontWeight: 600, fontSize: 16, lineHeight: "1.2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {peer.name}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.95, lineHeight: "1.2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {isPeerOnline ? "Çevrimiçi" : lastSeenText ?? "Son görülme yakınlarda"}
                  </div>
                </div>
              </div>
            ) : (
              <strong style={{ fontSize: "18px", marginLeft: "5px" }}>Sohbet Seç</strong>
            )}
          </div>

          <button
            onClick={onLogout}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none", color: "white",
              padding: "8px 16px", borderRadius: 20,
              cursor: "pointer", fontWeight: 600, fontSize: "13px",
              marginLeft: "10px",
              flexShrink: 0,
              outline: 0
            }}
          >
            Çıkış
          </button>
        </div>

        {/* MESAJLAR ALANI */}
        <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, padding: "16px 24px", overflowY: "auto" }}>
          {isLoadingHistory && (
            <div style={{ textAlign: "center", padding: "10px", color: "#6F79FF", fontSize: "13px", fontWeight: 600 }}>⏳ Eski mesajlar yükleniyor...</div>
          )}
          <div style={{ maxWidth: 1480, margin: "0 auto" }}>
            {[...messages]
              .sort((a, b) => a.id - b.id)
              .map((m, index) => {
                const isMine = m.senderId === me.id;
                const time = formatTime(m.createdAt);

                let showDateSeparator = false;
                const currentMessageDate = new Date(m.createdAt).toDateString();
                if (index === 0) {
                  showDateSeparator = true;
                } else {
                  const prevMessage = messages[index - 1];
                  const prevMessageDate = new Date(prevMessage.createdAt).toDateString();
                  if (currentMessageDate !== prevMessageDate) showDateSeparator = true;
                }

                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column" }}>
                    {showDateSeparator && (
                      <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 12px 0" }}>
                        <div style={{ backgroundColor: "#EAE6FF", color: "#6F79FF", padding: "6px 14px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, boxShadow: "0 2px 5px rgba(0,0,0,0.05)", textAlign: "center" }}>
                          {formatDateLabel(m.createdAt)}
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: 12 }}>
                      <div style={{
                        backgroundColor: isMine ? "#5865F2" : "#F3F4F6",
                        borderRadius: 16, borderTopRightRadius: isMine ? 0 : 16, borderTopLeftRadius: !isMine ? 0 : 16,
                        padding: "10px 14px", maxWidth: "70%", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", position: "relative"
                      }}>
                        <div style={{ color: isMine ? "white" : "#3E3663" }}>
                          {m.content.startsWith("AUDIO::") ? (
                            // ✅ YENİ AUDIO PLAYER BİLEŞENİ
                            <AudioPlayer
                              audioUrl={m.content.replace("AUDIO::", "")}
                              isMine={isMine}
                              // Profil resmini bulmak için biraz mantık gerekiyor:
                              senderProfilePic={
                                isMine
                                  ? me.profilePictureUrl
                                  : (selectedConversation?.user1Id === m.senderId
                                    ? users.find(u => u.id === m.senderId)?.profilePictureUrl // Cache veya user listesinden bul
                                    : peer?.profilePictureUrl) // Peer zaten karşı taraf
                              }
                            />
                          ) : (
                            m.content
                          )}
                        </div>

                        {/* Saat ve Tikler (Mevcut kodun) */}
                        <div style={{ textAlign: "right", fontSize: 11, marginTop: 4, color: isMine ? "rgba(255,255,255,0.7)" : "#9B95C9" }}>
                          {time} {isMine && renderStatusTicks(m.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* YAZIYOR BALONCUĞU */}
            <div
              style={{
                padding: typingUserId === peer?.id ? "0 24px 16px 24px" : "0 24px 0 24px",
                opacity: typingUserId === peer?.id ? 1 : 0,
                transform: typingUserId === peer?.id ? "translateY(0)" : "translateY(10px)",
                transition: "opacity 0.5s ease-in-out, transform 0.5s ease-in-out, max-height 0.5s ease-in-out, padding 0.5s ease-in-out",
                pointerEvents: typingUserId === peer?.id ? "auto" : "none",
                maxHeight: typingUserId === peer?.id ? 60 : 0,
                overflow: "hidden"
              }}
            >
              <div style={{
                backgroundColor: "#FFFFFF",
                padding: "10px 14px",
                borderRadius: 16,
                borderTopLeftRadius: 0,
                display: "inline-flex",
                alignItems: "center",
                boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                width: "fit-content",
                minHeight: 36
              }}>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ✅ INPUT ALANI (TAMAMEN "FLOATING" / HAVADA DURAN TASARIM) */}
        <div style={{
          minHeight: "80px",
          padding: "0 20px 20px 20px", // Alttan ve yanlardan boşluk bıraktık
          display: "flex",
          alignItems: "center",
          gap: 12,
          // 👇 KRİTİK DEĞİŞİKLİKLER BURADA:
          backgroundColor: "transparent", // ❌ Arka plan YOK (Sohbet rengi gözükecek)
          borderTop: "none",              // ❌ Çizgi YOK
          boxShadow: "none",              // ❌ Dış kutuda gölge YOK
          position: "relative",
          zIndex: 10
        }}>

          {isRecording ? (
            // 🔴 KAYIT MODU
            <>
              {/* İptal Butonu */}
              <button
                onClick={cancelRecording}
                style={{
                  background: "#FFFFFF", // Butonun kendi arka planı olsun
                  border: "none", color: "#FF4D4D",
                  width: "50px", height: "50px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "20px", cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)", // Kendi gölgesi
                  transition: "0.2s", outline: "none"
                }}
                title="İptal Et"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>

              {/* Sayaç Animasyonu */}
              <div style={{ 
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  background: "#FFFFFF", // Beyaz Hap
                  borderRadius: 30, height: 50,
                  boxShadow: "0 4px 15px rgba(0,0,0,0.05)" // Kendi gölgesi
              }}>
                <div style={{
                  width: 12, height: 12, borderRadius: "50%", backgroundColor: "#FF4D4D",
                  animation: "pulseRed 1s infinite"
                }} />
                <span style={{ fontSize: "18px", color: "#6F79FF", fontWeight: "bold", fontFamily: "monospace" }}>
                  {formatDuration(recordingDuration)}
                </span>
              </div>

              {/* Gönder (Tik) Butonu */}
              <button
                onClick={finishRecording}
                style={{
                  width: "50px", height: "50px", borderRadius: "50%",
                  backgroundColor: "#00C853", 
                  color: "white", border: "none", fontSize: "20px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", boxShadow: "0 4px 15px rgba(0,200,83, 0.4)",
                  transition: "0.2s", outline: "none"
                }}
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>
            </>
          ) : (
            // 🔵 NORMAL MOD
            <>
              {/* Artı Butonu (Yuvarlak beyaz zemin içinde) */}
              <button style={{
                backgroundColor: "#FFFFFF", // Kendi zemini
                border: "none", color: "#9B95C9",
                width: "50px", height: "50px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px", cursor: "pointer",
                boxShadow: "0 4px 10px rgba(0,0,0,0.05)", // Hafif gölge
                outline: "none", transition: "transform 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>

              {/* 👇 INPUT KUTUSU (BEYAZ, GÖLGELİ, HAP) */}
              <input
                ref={inputRef}
                style={{
                  flex: 1,
                  height: "50px", // Yükseklik sabitlendi
                  padding: "0 24px",
                  borderRadius: "25px",
                  border: "none", 
                  backgroundColor: "#FFFFFF", // Beyaz Zemin
                  color: "#3E3663",
                  fontSize: "16px",
                  outline: "none",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.05)" // Havada durma efekti burada
                }}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Bir mesaj yazın"
              />

              {/* Dinamik Buton */}
              <button
                onClick={() => {
                  if (newMessage.trim()) handleSend();
                  else startRecording();
                }}
                style={{
                  width: "50px", height: "50px", borderRadius: "50%",
                  backgroundColor: "#6F79FF",
                  color: "white",
                  border: "none",
                  fontSize: "20px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 15px rgba(111, 121, 255, 0.4)", // Mor gölge
                  outline: "none"
                }}
              >
                <FontAwesomeIcon icon={newMessage.trim() ? faPaperPlane : faMicrophone} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;