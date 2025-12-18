import { useCallback, useEffect, useRef, useState } from "react";
import {
  createOrGetConversation,
  getMessages,
  listConversations,
  listUsers,
  markConversationSeen,
  getUserById
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


// Tarih nesnesini alıp günün başlangıcına (00:00) çeker (karşılaştırma için)
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

  // 1. Durum: Bugün
  if (messageDate.getTime() === today.getTime()) {
    return "Bugün";
  }

  // 2. Durum: Dün
  if (messageDate.getTime() === yesterday.getTime()) {
    return "Dün";
  }

  // 3. Durum: Son 1 hafta içindeyse Gün İsmi (Pazartesi, Salı...)
  const diffTime = Math.abs(today.getTime() - messageDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return date.toLocaleDateString("tr-TR", { weekday: "long" });
  }

  // 4. Durum: Daha eskiyse tam tarih (09/12/2025)
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
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

const ChatLayout: React.FC<ChatLayoutProps> = ({ me, onLogout }) => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [page, setPage] = useState(0); // Şu an kaçıncı sayfadayız?
  const [hasMore, setHasMore] = useState(true); // Daha eski mesaj var mı?
  const [isLoadingHistory, setIsLoadingHistory] = useState(false); // Yükleniyor mu?
  const scrollRef = useRef<HTMLDivElement>(null); // Mesaj kutusunu seçmek için
  const [prevScrollHeight, setPrevScrollHeight] = useState<number | null>(null); // Zıplamayı önlemek için
  const [isProfileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<MeResponse>(me);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [contactSidebarOpen, setContactSidebarOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<UserListItem | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  // Her konuşmanın mesajlarını cachelemek için (sol listede son mesaj & unread için)
  const [messageCache, setMessageCache] = useState<
    Record<number, ChatMessageResponse[]>
  >({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const onlineIds = useOnlineUsers(me.id);
  const typingTimeoutRef = useRef<any>(null);

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

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // 2. "Yazıyor..." durumunu aktif et (veya aktif tut)
      setTypingUserId(senderId);

      // 3. Yeni bir sayaç başlat: "Eğer 2 saniye boyunca başka sinyal gelmezse kapat"
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUserId(null);
        typingTimeoutRef.current = null;
      }, 2000); // 2 saniye bekleme süresi
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

  // Sohbet aç
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

    // cache'i güncelle
    setMessageCache((prev) => ({
      ...prev,
      [conv.id]: sortedHistory,
    }));

    // sohbeti açar açmaz SEEN olarak işaretle
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


  // Seçili konuşmadaki karşı tarafın bilgisi
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
  // Auto-scroll
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
  }, [messages]); // Mesajlar değişince çalışır
  useEffect(() => {
    // Backend'de display name varsayılan olarak telefon nosu atandığını varsayıyoruz.
    // +905... formatını temizleyip kıyaslayabilirsin veya direkt eşitlik kontrolü.
    if (me.displayName === me.phoneNumber) {
      setShowSetupModal(true);
    }
  }, [me]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sidebar'dan gelen güncellemeyi işle
  const handleUpdateMe = (updated: MeResponse) => {
    setCurrentUser(updated);
  };

  // Sağ Header'a tıklayınca çalışacak
  const handleContactClick = async () => {
    if (!peer) return;

    // Sidebar'ı aç
    setContactSidebarOpen(true);

    try {
      // Backend'den güncel veriyi (About, Resim vs) çek
      const data = await getUserById(peer.id);
      setContactInfo(data);
    } catch (error) {
      console.error("Kullanıcı detayı çekilemedi", error);
    }
  };


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
          onClick={() => setViewingImage(null)} // Boşluğa tıklayınca kapat
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
        onViewImage={(url) => setViewingImage(url)} // Resmi büyütmek için
      />

      {/* 4. YENİ BİLEŞEN: CONTACT INFO SIDEBAR (SAĞ) */}
      <ContactInfoSidebar
        isOpen={contactSidebarOpen}
        onClose={() => setContactSidebarOpen(false)}
        user={contactInfo} // API'den gelen detaylı veri
        onViewImage={(url) => setViewingImage(url)}
        lastSeenText={isPeerOnline ? "Çevrimiçi" : (lastSeenText ?? "")}
      />

      {/* SOL PANEL */}
      <div
        style={{
          width: isMobile ? "100%" : 300, // Mobilde tam ekran, masaüstünde 350px
          display: isMobile && selectedConversation ? "none" : "flex", // Mobilde sohbet açıksa gizle
          borderRight: isMobile ? "none" : "1px solid #DDD6FF", // Mobilde çizgiye gerek yok
          backgroundColor: "#F5F3FF",
          padding: "12px 14px",
          flexDirection: "column",
          overflowY: "auto", // Scroll olsun
        }}
      >
        {/* SOL PANEL HEADER (Profil Resmi & Tıklama Alanı) */}
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
          {/* Profilim (Sidebar Tetikleyici) */}
          <div
            onClick={() => setProfileSidebarOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
              padding: "6px", borderRadius: "12px", transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
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
              }}
            >
              {!currentUser.profilePictureUrl && currentUser.displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#3E3663" }}>Profilim</span>
              <span style={{ fontSize: 11, color: "#8E88B9" }}>Düzenlemek için tıkla</span>
            </div>
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

      {/* SAĞ PANEL (Bu div'i bul ve style kısmını güncelle) */}
      <div
        style={{
          flex: 1,
          display: isMobile && !selectedConversation ? "none" : "flex", // Mobilde sohbet yoksa gizle
          flexDirection: "column",
          background: "linear-gradient(180deg, #EDE9FF, #DAD4FF)",
          height: "100vh" // Yüksekliği garantiye al
        }}
      >
        {/* ÜST BAR (Sağ Panel Header) - TAMAMEN BU BLOĞU YAPIŞTIR */}
        <div
          style={{
            height: "65px",
            background: "linear-gradient(90deg, #6F79FF, #9B8CFF)",
            color: "white",
            padding: "0 10px", // Mobilde kenarlara yapışmasın diye padding
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)" // Hafif gölge ekledim, şık durur
          }}
        >
          {/* SOL TARAFTAKİ GRUP (Geri Butonu + Profil Bilgisi) */}
          <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            
            {/* 1. GERİ BUTONU (Sadece Mobilde Görünür) */}
            {isMobile && (
              <button
                onClick={() => setSelectedConversation(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: "28px", // Biraz büyüttüm kolay basılsın
                  cursor: "pointer",
                  marginRight: "4px",
                  padding: "0 8px",
                  lineHeight: "1",
                  display: "flex", alignItems: "center"
                }}
              >
                ‹
              </button>
            )}

            {/* 2. KULLANICI BİLGİSİ (Peer Info) */}
            {peer ? (
              <div
                onClick={handleContactClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  padding: "4px 8px 4px 0",
                  borderRadius: "8px",
                  transition: "background 0.2s",
                  minWidth: 0 // Flexbox içinde text taşmasını önler
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {/* Profil Resmi */}
                <div
                  style={{
                    width: 40, height: 40,
                    borderRadius: "50%",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: "bold", fontSize: "16px",
                    backgroundImage: peer.profilePictureUrl ? `url(${peer.profilePictureUrl})` : "none",
                    backgroundSize: "cover", backgroundPosition: "center",
                    border: "1.5px solid rgba(255,255,255,0.6)",
                    flexShrink: 0 // Resim büzüşmesin
                  }}
                >
                  {!peer.profilePictureUrl && peer.name.charAt(0).toUpperCase()}
                </div>

                {/* İsim ve Durum */}
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <div style={{ 
                    fontWeight: 600, fontSize: 15, lineHeight: "1.2",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" // Uzun isimler taşmasın
                  }}>
                    {peer.name}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.9, lineHeight: "1.2", whiteSpace: "nowrap" }}>
                    {isPeerOnline ? "Çevrimiçi" : lastSeenText ?? "Son görülme yakınlarda"}
                  </div>
                </div>
              </div>
            ) : (
              // Sohbet Seçili Değilse (Masaüstünde görünür sadece)
              <strong style={{ fontSize: "18px", marginLeft: "10px" }}>Sohbet Seç</strong>
            )}
          </div>

          {/* SAĞ TARAFTAKİ GRUP (Çıkış Butonu) */}
          <button
            onClick={onLogout}
            title="Çıkış Yap"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "white",
              padding: "8px 16px",
              borderRadius: 20,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              marginLeft: "10px",
              flexShrink: 0
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
                        backgroundColor: isMine ? "#CFC7FF" : "#FFFFFF",
                        borderRadius: 16, borderTopRightRadius: isMine ? 0 : 16, borderTopLeftRadius: !isMine ? 0 : 16,
                        padding: "10px 14px", maxWidth: "70%", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", position: "relative"
                      }}>
                        <div style={{ color: "#3E3663" }}>{m.content}</div>
                        <div style={{ textAlign: "right", fontSize: 11, marginTop: 4, color: "#6F79FF" }}>
                          {time} {isMine && renderStatusTicks(m.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* ✅ YENİ EKLENECEK KISIM: YAZIYOR BALONCUĞU */}
            <div
              style={{
                // Görünürken alt padding var, gizlenirken padding yok (yer kaplamasın diye)
                padding: typingUserId === peer?.id ? "0 24px 16px 24px" : "0 24px 0 24px",

                // Yazıyorsa görünür (opacity 1), yoksa gizli (opacity 0)
                opacity: typingUserId === peer?.id ? 1 : 0,

                // Yazıyorsa olduğu yerde, yoksa 10px aşağıda dursun (yukarı kayma efekti)
                transform: typingUserId === peer?.id ? "translateY(0)" : "translateY(10px)",

                // ⚠️ ÖNEMLİ DÜZELTME: max-height ve padding geçişlerini de ekliyoruz
                // Bu sayede aniden değil, yumuşak bir şekilde küçülerek ve solarak kaybolacak
                transition: "opacity 0.5s ease-in-out, transform 0.5s ease-in-out, max-height 0.5s ease-in-out, padding 0.5s ease-in-out",

                // Görünmezken tıklamayı engelle
                pointerEvents: typingUserId === peer?.id ? "auto" : "none",

                // Görünmezken yer kaplamasın (akışı bozmasın)
                // height yerine max-height kullanıyoruz ve animasyonluyoruz
                maxHeight: typingUserId === peer?.id ? 60 : 0, // Baloncuğun yüksekliğine göre bir değer

                overflow: "hidden"
              }}
            >
              <div style={{
                backgroundColor: "#FFFFFF", // Karşı taraf mesaj rengi
                padding: "10px 14px",       // Biraz daha kompakt
                borderRadius: 16,
                borderTopLeftRadius: 0,     // Sol üst köşe sivri
                display: "inline-flex",
                alignItems: "center",
                boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                width: "fit-content",
                minHeight: 36
              }}>
                {/* Üç Nokta Animasyonu */}
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INPUT */}
        <div style={{ padding: 12, display: "flex", gap: 10, backgroundColor: "#F5F3FF", borderTop: "1px solid #DDD6FF" }}>
          <input
            style={{ flex: 1, padding: 12, borderRadius: 25, border: "1px solid #DDD6FF", outline: "none", backgroundColor: "#FFFFFF", color: "#3E3663" }}
            value={newMessage} onChange={handleInputChange} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Mesaj yaz..."
          />
          <button onClick={handleSend} style={{ padding: "12px 22px", borderRadius: 25, background: "linear-gradient(90deg, #6F79FF, #9B8CFF)", border: "none", color: "white", fontWeight: 600, cursor: "pointer" }}>
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;