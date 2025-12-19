import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  createOrGetConversation,
  getMessages,
  listConversations,
  listUsers,
  markConversationSeen,
  getUserById,
  uploadAudio,
  uploadMedia,
  getAnnouncements,
  postAnnouncement,
  reactToAnnouncement
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
import {
  faPaperPlane, faMicrophone, faTrash, faCheck, faPlus,
  faFileAlt, faImages, faCamera, faUser, faChartBar, faCalendarAlt, faStickyNote,
  faTimes, faDownload, faFilePdf, faSpinner, faSmile
} from "@fortawesome/free-solid-svg-icons";
import AudioPlayer from "./AudioPlayer";
import { compressImage } from "../utils/imageUtils";
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';

interface ChatLayoutProps {
  me: MeResponse;
  onLogout: () => void;
}

// ✅ CSS: Animasyonlar ve Referans Tasarıma Uygun Emoji Picker Stilleri
const styles = `
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
  
  @keyframes popupMenuEnter {
    0% { opacity: 0; transform: scale(0.8) translateY(20px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* --- EMOJI PICKER STİLLERİ --- */
  .EmojiPickerReact.epr-main {
      border: none !important;
      border-radius: 24px !important;
      box-shadow: 0 10px 40px rgba(0,0,0,0.12) !important;
      font-family: 'Segoe UI', sans-serif !important;
      --epr-picker-border-radius: 24px !important;
      --epr-category-icon-active-color: #6F79FF !important;
  }
  
  .EmojiPickerReact button:focus, .EmojiPickerReact button:active, .EmojiPickerReact .epr-btn:focus {
      outline: none !important; box-shadow: none !important; background-color: transparent !important; border: none !important;
  }

  /* Kategori İkonları */
  .EmojiPickerReact .epr-category-nav {
      display: flex !important; justify-content: space-between !important; padding: 0px 15px 0 15px !important; width: 100% !important; box-sizing: border-box !important;
  }
  .EmojiPickerReact .epr-category-nav > button.epr-btn {
      flex: 1 !important; min-width: unset !important; padding: 8px 0 !important; margin: 0 !important; width: auto !important; opacity: 0.6; transition: opacity 0.2s;
  }
  .EmojiPickerReact .epr-category-nav > button.epr-btn:hover, .EmojiPickerReact .epr-category-nav > button.epr-btn.epr-active {
      opacity: 1; color: #6F79FF !important;
  }
  .EmojiPickerReact .epr-category-nav > button.epr-btn > span { display: flex; justify-content: center; }

  /* Arama Çubuğu */
  .EmojiPickerReact .epr-search-container { padding: 5px !important; }
  .EmojiPickerReact .epr-search-container input { border-radius: 20px !important; background-color: #F5F3FF !important; border: 1px solid #EAE6FF !important; height: 40px !important; padding-left: 40px !important; font-size: 15px !important; }
  .EmojiPickerReact .epr-search-container .epr-icn-search { left: 25px !important; color: #9B95C9 !important; }
  .EmojiPickerReact .epr-body { padding: 0 10px !important; }
  .EmojiPickerReact .epr-category-heading { font-size: 14px !important; font-weight: 600 !important; color: #9B95C9 !important; padding: 10px 5px !important; }
  .EmojiPickerReact .epr-preview { display: none !important; }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

// --- Yardımcı Fonksiyonlar ---
const startOfDay = (d: Date) => {
  const newDate = new Date(d);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const today = startOfDay(now);
  const messageDate = startOfDay(date);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDate.getTime() === today.getTime()) return "Bugün";
  if (messageDate.getTime() === yesterday.getTime()) return "Dün";

  const diffTime = Math.abs(today.getTime() - messageDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) return date.toLocaleDateString("tr-TR", { weekday: "long" });

  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatTime = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const renderStatusTicks = (status?: MessageStatus) => {
  if (status === "SEEN") return "✓✓";
  return "✓";
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const ChatLayout: React.FC<ChatLayoutProps> = ({ me, onLogout }) => {
  // --- STATE'LER ---
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [messageCache, setMessageCache] = useState<Record<number, ChatMessageResponse[]>>({});

  const [newMessage, setNewMessage] = useState("");
  const [typingUserId, setTypingUserId] = useState<number | null>(null);

  // Scroll & Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [prevScrollHeight, setPrevScrollHeight] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // UI State
  const [isProfileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<MeResponse>(me);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [contactSidebarOpen, setContactSidebarOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<UserListItem | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isPlusMenuOpen, setPlusMenuOpen] = useState(false);

  // Kamera & Ses
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const onlineIds = useOnlineUsers(me.id);
  const prevOnlineIdsRef = useRef<number[]>([]);

  // ADMIN & DUYURU
  const [activeTab, setActiveTab] = useState<"CHATS" | "CHANNELS">("CHATS"); // Sekme kontrolü
  const [announcements, setAnnouncements] = useState<any[]>([]); // Duyuru listesi
  const [channelMessage, setChannelMessage] = useState(""); // Admin duyuru yazısı

  // ✅ DOSYA ÖNİZLEME STATE'LERİ
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    type: "IMAGE" | "VIDEO" | "DOCUMENT";
    previewUrl: string
  } | null>(null);
  const [fileCaption, setFileCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // --- Emoji Picker State ---
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Emoji seçildiğinde çalışacak fonksiyon
  const onEmojiClick = (emojiData: any) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  // --- WebSocket Hooks ---
  const handleIncomingMessage = useCallback(
    async (msg: ChatMessageResponse) => {
      if (msg.conversationId === selectedConversation?.id) {
        setMessages((prev) => [...prev, msg]);
      }
      setMessageCache((prev) => {
        const existing = prev[msg.conversationId] ?? [];
        return { ...prev, [msg.conversationId]: [...existing, msg] };
      });

      if (msg.senderId !== me.id) {
        try {
          await markConversationSeen(msg.conversationId, me.id);
          const refreshed = await getMessages(msg.conversationId, me.id);
          setMessages((prev) => selectedConversation?.id === msg.conversationId ? refreshed : prev);
          setMessageCache((prev) => ({ ...prev, [msg.conversationId]: refreshed }));
        } catch (err) { console.error("SEEN ERROR:", err); }
      }
    },
    [selectedConversation, me.id]
  );

  const handleTyping = useCallback((senderId: number) => {
    if (senderId === me.id) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingUserId(senderId);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingUserId(null);
      typingTimeoutRef.current = null;
    }, 2000);
  }, [me.id]);

  const { sendMessage, sendTyping } = useChatWebSocket(
    selectedConversation ? selectedConversation.id : null,
    handleIncomingMessage,
    handleTyping
  );

  // ✅ Kullanıcı Offline Olduğunda "Last Seen" Güncelle
  useEffect(() => {
    const prevIds = prevOnlineIdsRef.current;
    const disconnectedUserIds = prevIds.filter(id => !onlineIds.includes(id));

    if (disconnectedUserIds.length > 0) {
      setUsers(prevUsers => prevUsers.map(user => {
        if (disconnectedUserIds.includes(user.id)) {
          return { ...user, lastSeen: new Date().toISOString() };
        }
        return user;
      }));
    }
    prevOnlineIdsRef.current = onlineIds;
  }, [onlineIds]);

  // --- Initial Data Load ---
  useEffect(() => {
    const load = async () => {
      const [userList, convList] = await Promise.all([listUsers(), listConversations()]);
      setUsers(userList);
      setConversations(convList);
      const cache: Record<number, ChatMessageResponse[]> = {};
      await Promise.all(
        convList.map(async (c) => {
          try {
            const history = await getMessages(c.id, me.id);
            cache[c.id] = [...history].reverse();
          } catch (e) { console.error(e); }
        })
      );
      setMessageCache(cache);
    };
    load();
  }, [me.id]);

  // --- Helper Logic ---
  const openConversationWith = async (otherUserId: number) => {
    setContactSidebarOpen(false);
    setContactInfo(null);
    const conv = await createOrGetConversation(otherUserId);
    setSelectedConversation(conv);
    setPage(0);
    setHasMore(true);
    setIsLoadingHistory(false);
    const history = await getMessages(conv.id, me.id, 0);
    if (history.length < 50) setHasMore(false);
    const sortedHistory = [...history].reverse();
    setMessages(sortedHistory);
    setMessageCache((prev) => ({ ...prev, [conv.id]: sortedHistory }));
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
    setNewMessage(e.target.value);
    if (!selectedConversation || !e.target.value.trim()) return;
    sendTyping(me.id);
  };

  // --- DOSYA YÖNETİMİ ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "IMAGE" | "VIDEO" | "DOCUMENT") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setSelectedFile({ file, type, previewUrl });
      setPlusMenuOpen(false);
    }
    e.target.value = "";
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: "image/jpeg" });
            const previewUrl = URL.createObjectURL(file);
            setSelectedFile({ file, type: "IMAGE", previewUrl });
            stopCamera();
          }
        }, "image/jpeg", 0.9);
      }
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile || !selectedConversation) return;
    setIsUploading(true);
    try {
      let fileToUpload = selectedFile.file;
      if (selectedFile.type === "IMAGE") {
        try {
          const compressedBlob = await compressImage(selectedFile.file, "SD");
          fileToUpload = new File([compressedBlob], selectedFile.file.name, { type: selectedFile.file.type });
        } catch (e) { console.log("Sıkıştırma atlandı", e); }
      }
      const mediaUrl = await uploadMedia(fileToUpload);
      const fileSizeMB = (selectedFile.file.size / (1024 * 1024)).toFixed(2) + " MB";
      const contentString = `${selectedFile.type}::${mediaUrl}::${selectedFile.file.name}::${fileSizeMB}::${fileCaption}`;
      sendMessage({
        conversationId: selectedConversation.id,
        senderId: me.id,
        content: contentString
      });
      setSelectedFile(null);
      setFileCaption("");
      setIsUploading(false);
    } catch (error) {
      console.error("Yükleme hatası:", error);
      setIsUploading(false);
      alert("Dosya yüklenirken hata oluştu.");
    }
  };

  // --- Kamera & Ses Logic ---
  const startCamera = async () => {
    setPlusMenuOpen(false);
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("Kamera izni gerekli."); setShowCameraModal(false); }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const localChunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) localChunks.push(e.data); };
      recorder.onstop = async () => {
        if (localChunks.length === 0) return;
        const audioBlob = new Blob(localChunks, { type: "audio/webm" });
        await sendAudioMessage(audioBlob);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
    } catch (err) { alert("Mikrofon izni gerekli."); }
  };

  const cancelRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    stopTimer();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const finishRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
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
    } catch (error) { console.error("Ses gönderilemedi:", error); }
  };

  // --- Scroll Logic ---
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasMore && !isLoadingHistory) {
      setIsLoadingHistory(true);
      setPrevScrollHeight(target.scrollHeight);
      const nextPage = page + 1;
      const oldMessages = await getMessages(selectedConversation!.id, me.id, nextPage);
      if (oldMessages.length === 0) { setHasMore(false); setIsLoadingHistory(false); return; }
      if (oldMessages.length < 50) setHasMore(false);
      const sortedOldMessages = [...oldMessages].reverse();
      setMessages((prev) => [...sortedOldMessages, ...prev]);
      setPage(nextPage);
      setIsLoadingHistory(false);
    }
  };

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

  const handleUpdateMe = (updated: MeResponse) => { setCurrentUser(updated); };

  const handleContactClick = async () => {
    if (!peer) return;
    setContactSidebarOpen(true);
    try {
      const data = await getUserById(peer.id);
      setContactInfo(data);
    } catch (error) { console.error("Kullanıcı detayı çekilemedi", error); }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      if (!isMobile) {
        setTimeout(() => { inputRef.current?.focus(); }, 100);
      }
    }
  }, [selectedConversation, isMobile]);

  useEffect(() => {
    if (me.displayName === me.phoneNumber) {
      setShowSetupModal(true);
    }
  }, [me]);

  // DUYURU & KANAL LOGIC
  useEffect(() => {
    if (activeTab === "CHANNELS") {
      loadAnnouncements();
    }
  }, [activeTab]);

  const loadAnnouncements = async () => {
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (error) { console.error("Duyurular yüklenemedi", error); }
  };

  const handleReaction = async (announcementId: number, emoji: string) => {
    try {
      await reactToAnnouncement(announcementId, me.id, emoji);
      loadAnnouncements();
    } catch (error) { console.error(error); }
  };

  const handlePostAnnouncement = async () => {
    if (!channelMessage.trim()) return;
    try {
      await postAnnouncement(channelMessage, null, me.id);
      setChannelMessage("");
      loadAnnouncements();
    } catch (error) { alert("Yetkiniz yok veya hata oluştu."); }
  };

  // --- Sidebar Logic ---
  const peer = (() => {
    if (!selectedConversation) return null;
    const peerId = selectedConversation.user1Id === me.id ? selectedConversation.user2Id : selectedConversation.user1Id;
    const userObj = users.find((u) => u.id === peerId);
    return {
      id: peerId,
      name: userObj ? userObj.displayName : (selectedConversation.user1Id === me.id ? selectedConversation.user2Name : selectedConversation.user1Name),
      profilePictureUrl: userObj?.profilePictureUrl,
    };
  })();

  const isPeerOnline = peer ? onlineIds.includes(peer.id) : false;
  let lastSeenText: string | null = null;

  if (peer) {
    const currentPeerUser = users.find(u => u.id === peer.id);
    if (currentPeerUser && currentPeerUser.lastSeen) {
      lastSeenText = "Son görülme " + formatTime(currentPeerUser.lastSeen);
    } else {
      const peerMessages = messages.filter((m) => m.senderId === peer.id);
      if (peerMessages.length > 0) {
        const latest = peerMessages[peerMessages.length - 1];
        lastSeenText = "Son görülme " + formatTime(latest.createdAt);
      }
    }
  }

  const sidebarItems = users
    .filter((u) => u.id !== me.id)
    .map((user) => {
      const conv = conversations.find((c) => (c.user1Id === me.id && c.user2Id === user.id) || (c.user2Id === me.id && c.user1Id === user.id));
      const convMessages = conv ? messageCache[conv.id] ?? [] : [];
      const lastMessage = convMessages.length > 0 ? convMessages[convMessages.length - 1] : undefined;
      let lastMessageText = "Henüz mesaj yok";
      if (lastMessage) {
        if (lastMessage.content.startsWith("AUDIO::")) lastMessageText = "🎤 Sesli Mesaj";
        else if (lastMessage.content.startsWith("IMAGE::")) lastMessageText = "📷 Fotoğraf";
        else if (lastMessage.content.startsWith("VIDEO::")) lastMessageText = "🎥 Video";
        else if (lastMessage.content.startsWith("DOCUMENT::")) lastMessageText = "📄 Belge";
        else lastMessageText = lastMessage.content;
      }
      return {
        user,
        conv,
        lastMessageText,
        lastMessageTime: lastMessage ? formatTime(lastMessage.createdAt) : "",
        unreadCount: convMessages.filter((m) => m.senderId !== me.id && m.status !== "SEEN").length,
        lastMessageDate: lastMessage ? new Date(lastMessage.createdAt).getTime() : 0,
        isOnline: onlineIds.includes(user.id)
      };
    })
    .sort((a, b) => b.lastMessageDate - a.lastMessageDate);

  // --- RENDER ---
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Segoe UI, sans-serif", background: "linear-gradient(180deg, #C6A7FF 0%, #9B8CFF 45%, #6F79FF 100%)" }}>

      {/* 1. ÖNİZLEME MODALI */}
      {selectedFile && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(245, 243, 255, 0.95)", backdropFilter: "blur(12px)",
          zIndex: 5000, display: "flex", flexDirection: "column", animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{ padding: "20px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(90deg, rgba(111, 121, 255, 0.05), rgba(155, 140, 255, 0.05))" }}>
            <h3 style={{ margin: 0, color: "#3E3663", fontSize: "18px", fontWeight: "700" }}>Önizleme</h3>
            <button onClick={() => setSelectedFile(null)} style={{ background: "#EAE6FF", border: "none", color: "#6F79FF", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ position: "relative", padding: "10px", backgroundColor: "white", borderRadius: "24px", boxShadow: "0 20px 50px rgba(111, 121, 255, 0.25)", maxWidth: "90%", maxHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {selectedFile.type === "IMAGE" ? (
                <img src={selectedFile.previewUrl} style={{ maxHeight: "60vh", maxWidth: "100%", borderRadius: "16px", display: "block" }} />
              ) : selectedFile.type === "VIDEO" ? (
                <video src={selectedFile.previewUrl} controls style={{ maxHeight: "60vh", maxWidth: "100%", borderRadius: "16px", display: "block" }} />
              ) : (
                <div style={{ padding: "40px 60px", textAlign: "center", color: "#3E3663" }}>
                  <div style={{ width: "100px", height: "100px", margin: "0 auto 20px auto", backgroundColor: "#FFEBEE", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FontAwesomeIcon icon={faFilePdf} style={{ fontSize: "50px", color: "#FF5252" }} />
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "8px" }}>{selectedFile.file.name}</div>
                  <div style={{ fontSize: "15px", color: "#9B95C9" }}>{(selectedFile.file.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ padding: "20px", backgroundColor: "white", display: "flex", gap: "15px", alignItems: "center", justifyContent: "center", boxShadow: "0 -4px 20px rgba(0,0,0,0.03)" }}>
            <input type="text" placeholder="Bir açıklama ekleyin..." value={fileCaption} onChange={(e) => setFileCaption(e.target.value)} style={{ flex: 1, maxWidth: "600px", padding: "14px 24px", borderRadius: "30px", border: "2px solid #EAE6FF", backgroundColor: "#F9F8FF", color: "#3E3663", fontSize: "16px", outline: "none" }} />
            <button onClick={handleSendFile} disabled={isUploading} style={{ width: "54px", height: "54px", borderRadius: "50%", background: "linear-gradient(135deg, #6F79FF 0%, #9B8CFF 100%)", color: "white", border: "none", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: isUploading ? "not-allowed" : "pointer", opacity: isUploading ? 0.7 : 1 }}>
              {isUploading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPaperPlane} style={{ marginLeft: "-2px" }} />}
            </button>
          </div>
        </div>
      )}

      {viewingImage && (
        <div style={{ position: "fixed", zIndex: 3000, top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setViewingImage(null)}>
          <img src={viewingImage} style={{ maxHeight: "85%", maxWidth: "85%", borderRadius: 10 }} />
          <button onClick={() => setViewingImage(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontSize: 24, cursor: "pointer", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      )}

      {showSetupModal && <ProfileSetupModal onComplete={(updated) => { setCurrentUser(updated); setShowSetupModal(false); }} />}
      <ProfileSidebar isOpen={isProfileSidebarOpen} onClose={() => setProfileSidebarOpen(false)} me={currentUser} onUpdateMe={handleUpdateMe} onViewImage={setViewingImage} />
      <ContactInfoSidebar isOpen={contactSidebarOpen} onClose={() => setContactSidebarOpen(false)} user={contactInfo} onViewImage={setViewingImage} lastSeenText={isPeerOnline ? "Çevrimiçi" : (lastSeenText ?? "")} />

      {/* --- SOL PANEL (Sohbet Listesi) --- */}
      <div style={{ width: isMobile ? "100%" : 350, display: isMobile && selectedConversation ? "none" : "flex", flexDirection: "column", borderRight: "1px solid #DDD6FF", backgroundColor: "#F5F3FF" }}>
        
        {/* Profil Header */}
        <div style={{ padding: "15px", borderBottom: "1px solid #EAE6FF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
           <div onClick={() => setProfileSidebarOpen(true)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
             <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: "#DDD6FF", backgroundImage: currentUser.profilePictureUrl ? `url(${currentUser.profilePictureUrl})` : "none", backgroundSize: "cover", display: "flex", alignItems: "center", justifyContent: "center", color: "#6F79FF", fontWeight: "bold", border: "2px solid white" }}>
               {!currentUser.profilePictureUrl && currentUser.displayName.charAt(0).toUpperCase()}
             </div>
             <span style={{ fontSize: 16, fontWeight: 700, color: "#3E3663" }}>Profilim</span>
           </div>
        </div>

        {/* Sekme Butonları */}
        <div style={{ display: "flex", gap: "10px", padding: "10px 10px 15px 10px" }}>
          <button onClick={() => { setActiveTab("CHATS"); setSelectedConversation(null); }} style={{ flex: 1, padding: "8px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s", backgroundColor: activeTab === "CHATS" ? "#6F79FF" : "rgba(111, 121, 255, 0.1)", color: activeTab === "CHATS" ? "white" : "#6F79FF" }}>Sohbetler</button>
          <button onClick={() => { setActiveTab("CHANNELS"); setSelectedConversation(null); }} style={{ flex: 1, padding: "8px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s", backgroundColor: activeTab === "CHANNELS" ? "#6F79FF" : "rgba(111, 121, 255, 0.1)", color: activeTab === "CHANNELS" ? "white" : "#6F79FF" }}>Kanallar</button>
        </div>

        {/* Liste İçeriği */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
          {activeTab === "CHATS" && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {sidebarItems.map(({ user, isOnline, lastMessageText, unreadCount }) => (
                <li key={user.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "10px 12px", borderRadius: 14, backgroundColor: "#FFFFFF", cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.03)" }} onClick={() => openConversationWith(user.id)}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#EAE6FF", backgroundImage: user.profilePictureUrl ? `url(${user.profilePictureUrl})` : "none", backgroundSize: "cover", display: "flex", alignItems: "center", justifyContent: "center", color: "#6F79FF", fontWeight: "bold" }}>{!user.profilePictureUrl && user.displayName[0]}</div>
                    {isOnline && <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, background: "#44b700", borderRadius: "50%", border: "2px solid white" }}></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#3E3663" }}>{user.displayName}</div>
                    <div style={{ fontSize: 11, color: "#9B95C9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lastMessageText}</div>
                  </div>
                  {unreadCount > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#6F79FF", color: "white", fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{unreadCount}</span>}
                </li>
              ))}
            </ul>
          )}
          {activeTab === "CHANNELS" && (
            <div onClick={() => setSelectedConversation({ id: -999 } as any)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", backgroundColor: "white", borderRadius: "14px", cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.08)" }}>
              <div style={{ width: 45, height: 45, borderRadius: "50%", background: "linear-gradient(135deg, #FF9800, #FF5722)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "20px" }}>📢</div>
              <div>
                <div style={{ fontWeight: "700", color: "#3E3663" }}>Vivoria Duyurular</div>
                <div style={{ fontSize: "12px", color: "#9B95C9" }}>Resmi güncellemeler</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- SAĞ PANEL --- */}
      <div style={{ flex: 1, display: isMobile && !selectedConversation ? "none" : "flex", flexDirection: "column", background: "linear-gradient(180deg, #EDE9FF, #DAD4FF)", height: "100vh" }}>
        
        {/* DUYURU EKRANI */}
        {selectedConversation && selectedConversation.id === -999 ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ height: "65px", background: "white", padding: "0 20px", display: "flex", alignItems: "center", borderBottom: "1px solid #ddd", gap: 15 }}>
              {isMobile && <button onClick={() => setSelectedConversation(null)} style={{border:"none", background:"transparent", fontSize:"24px"}}>‹</button>}
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FF9800", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>📢</div>
              <div style={{ fontWeight: "bold", fontSize: "18px", color: "#3E3663" }}>Vivoria Duyurular</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: "#E0E0E0" }}>
              {announcements.map((ann) => (
                <div key={ann.id} style={{ maxWidth: "600px", margin: "0 auto 20px auto", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
                  {ann.mediaUrl && <img src={ann.mediaUrl} style={{ width: "100%", maxHeight: "300px", objectFit: "cover" }} />}
                  <div style={{ padding: "12px 16px" }}>
                    <p style={{ whiteSpace: "pre-wrap", color: "#111", fontSize: "15px", lineHeight: "1.4", margin: "0 0 10px 0" }}>{ann.content}</p>
                    <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                      {["👍", "❤️", "😂", "😮", "😢", "👏"].map(emoji => {
                        const count = ann.reactions?.filter((r: any) => r.emoji === emoji).length || 0;
                        return (
                          <button key={emoji} onClick={() => handleReaction(ann.id, emoji)} style={{ background: count > 0 ? "#E7F3FF" : "#F0F2F5", border: count > 0 ? "1px solid #007BFF" : "none", borderRadius: "12px", padding: "4px 8px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
                            {emoji} {count > 0 && <span style={{ fontWeight: "bold", color: "#007BFF" }}>{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ textAlign: "right", fontSize: "11px", color: "#888", marginTop: "5px" }}>{new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
            {me.role === "ADMIN" && (
              <div style={{ padding: "10px", background: "white", display: "flex", gap: "10px" }}>
                <input value={channelMessage} onChange={(e) => setChannelMessage(e.target.value)} placeholder="Bir duyuru yayınla..." style={{ flex: 1, padding: "10px", borderRadius: "20px", border: "1px solid #ddd" }} />
                <button onClick={handlePostAnnouncement} style={{ background: "#6F79FF", color: "white", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer" }}><FontAwesomeIcon icon={faPaperPlane} /></button>
              </div>
            )}
          </div>
        ) : (
          /* NORMAL SOHBET EKRANI */
          <>
            <div style={{ height: "65px", background: "linear-gradient(90deg, #6F79FF, #9B8CFF)", color: "white", padding: "0 15px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, overflow: "hidden" }}>
                {isMobile && <button onClick={() => setSelectedConversation(null)} style={{ background: "transparent", border: "none", color: "white", fontSize: "26px", cursor: "pointer", padding: "0 8px 0 0" }}>‹</button>}
                {peer ? (
                  <div onClick={handleContactClick} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flex: 1 }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "16px", backgroundImage: peer.profilePictureUrl ? `url(${peer.profilePictureUrl})` : "none", backgroundSize: "cover", backgroundPosition: "center", border: "1.5px solid rgba(255,255,255,0.6)" }}>{!peer.profilePictureUrl && peer.name.charAt(0).toUpperCase()}</div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{peer.name}</div>
                      <div style={{ fontSize: 13, opacity: 0.95 }}>{isPeerOnline ? "Çevrimiçi" : lastSeenText ?? ""}</div>
                    </div>
                  </div>
                ) : <strong style={{ fontSize: "18px", marginLeft: "5px" }}>Sohbet Seç</strong>}
              </div>
              <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>Çıkış</button>
            </div>

            {/* --- BURAYI KOPYALA VE MEVCUT 'Mesaj Listesi' DİV'İ İLE DEĞİŞTİR --- */}
          <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, padding: "16px 24px", overflowY: "auto" }}>
            {isLoadingHistory && <div style={{ textAlign: "center", padding: "10px", color: "#6F79FF", fontSize: "13px" }}>⏳ Eski mesajlar yükleniyor...</div>}
            
            <div style={{ maxWidth: 1480, margin: "0 auto" }}>
              {[...messages].sort((a, b) => a.id - b.id).map((m, index) => {
                const isMine = m.senderId === me.id;
                const time = formatTime(m.createdAt);
                let showDateSeparator = index === 0;
                
                if (index > 0) {
                  const prevDate = new Date(messages[index - 1].createdAt).toDateString();
                  const currDate = new Date(m.createdAt).toDateString();
                  if (prevDate !== currDate) showDateSeparator = true;
                }

                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column" }}>
                    {/* Tarih Ayırıcı */}
                    {showDateSeparator && (
                      <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 12px 0" }}>
                        <div style={{ backgroundColor: "#EAE6FF", color: "#6F79FF", padding: "6px 14px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>{formatDateLabel(m.createdAt)}</div>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: 12 }}>
                      <div style={{ 
                        backgroundColor: isMine ? "#5865F2" : "#F3F4F6", 
                        color: isMine ? "white" : "#3E3663", 
                        borderRadius: 16, 
                        borderTopRightRadius: isMine ? 0 : 16, 
                        borderTopLeftRadius: !isMine ? 0 : 16, 
                        padding: "4px", 
                        maxWidth: "70%", 
                        boxShadow: "0 4px 10px rgba(0,0,0,0.1)", 
                        position: "relative" 
                      }}>
                        
                        {/* MESAJ TİPİNE GÖRE İÇERİK */}
                        {m.content.startsWith("AUDIO::") ? (
                          <div style={{ padding: "8px" }}>
                            <AudioPlayer audioUrl={m.content.replace("AUDIO::", "")} isMine={isMine} senderProfilePic={isMine ? me.profilePictureUrl : peer?.profilePictureUrl} />
                          </div>
                        ) : m.content.startsWith("IMAGE::") ? (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <img src={m.content.split("::")[1]} onClick={() => setViewingImage(m.content.split("::")[1])} style={{ borderRadius: "12px", maxWidth: "100%", maxHeight: "350px", objectFit: "cover", cursor: "pointer" }} />
                          </div>
                        ) : m.content.startsWith("VIDEO::") ? (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <video src={m.content.split("::")[1]} controls style={{ borderRadius: "12px", maxWidth: "100%", maxHeight: "350px" }} />
                          </div>
                        ) : m.content.startsWith("DOCUMENT::") ? (
                          // ✅ BELGE GÖRÜNÜMÜ (faDownload hatasını çözer)
                          (() => {
                            const parts = m.content.split("::");
                            const url = parts[1];
                            const fileName = parts[2] || "Dosya";
                            const fileSize = parts[3] || "";
                            const isPdf = fileName.toLowerCase().endsWith(".pdf");
                            const thumb = isPdf ? url.replace(".pdf", ".jpg") : null;

                            return (
                              <div style={{ width: "260px", overflow: "hidden" }}>
                                <div style={{ height: "140px", backgroundColor: "#E0E0E0", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderTopLeftRadius: "12px", borderTopRightRadius: "12px", overflow: "hidden" }}>
                                  {thumb ? (
                                    <img src={thumb} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.querySelector('.fallback-icon')!.removeAttribute('style'); }} />
                                  ) : null}
                                  
                                  <FontAwesomeIcon icon={faFileAlt} className="fallback-icon" style={{ fontSize: "50px", color: "#888", display: thumb ? 'none' : 'block' }} />
                                  
                                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {/* ✅ İndirme İkonu Burada Kullanılıyor */}
                                    <a href={url} download={fileName} style={{ color: "white" }}><FontAwesomeIcon icon={faDownload} /></a>
                                  </div>
                                </div>
                                <div style={{ padding: "10px", backgroundColor: isMine ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.03)", display: "flex", alignItems: "center", gap: "10px", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
                                  <div style={{ fontSize: "24px", color: "#F15C6D" }}><FontAwesomeIcon icon={isPdf ? faFilePdf : faFileAlt} /></div>
                                  <div style={{ flex: 1, overflow: "hidden" }}>
                                    <div style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName}</div>
                                    <div style={{ fontSize: "11px", opacity: 0.7 }}>{fileSize} • {isPdf ? "PDF" : "Dosya"}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          // NORMAL METİN MESAJI
                          <div style={{ padding: "8px 12px" }}>{m.content}</div>
                        )}

                        <div style={{ textAlign: "right", fontSize: 11, padding: "0 8px 4px 0", color: isMine ? "rgba(255,255,255,0.7)" : "#9B95C9" }}>
                          {time} {isMine && renderStatusTicks(m.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ✅ YAZIYOR ANİMASYONU (typingUserId hatasını çözer) */}
              <div style={{ padding: typingUserId === peer?.id ? "0 24px 16px 24px" : "0", opacity: typingUserId === peer?.id ? 1 : 0, transition: "all 0.5s ease", maxHeight: typingUserId === peer?.id ? 60 : 0, overflow: "hidden" }}>
                <div style={{ backgroundColor: "#FFFFFF", padding: "10px 14px", borderRadius: 16, borderTopLeftRadius: 0, display: "inline-flex", width: "fit-content" }}>
                  <div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div>
                </div>
              </div>
              
              <div ref={messagesEndRef} />
            </div>
          </div>

            <div style={{ minHeight: "80px", padding: "0 20px 20px 20px", display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 10 }}>
              {showCameraModal && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ position: "relative", width: "90%", maxWidth: "600px", borderRadius: "10px", overflow: "hidden" }}><video ref={videoRef} autoPlay playsInline style={{ width: "100%", display: "block" }} /><canvas ref={canvasRef} style={{ display: "none" }} /></div>
                  <div style={{ display: "flex", gap: 20, marginTop: 20 }}><button onClick={stopCamera} style={{ padding: "10px 20px", borderRadius: "20px", border: "none", background: "#FF4D4D", color: "white" }}>İptal</button><button onClick={capturePhoto} style={{ width: "60px", height: "60px", borderRadius: "50%", border: "4px solid white", background: "transparent" }}></button></div>
                </div>
              )}
              {isRecording ? (
                <><button onClick={cancelRecording} style={{ background: "white", border: "none", color: "#FF4D4D", width: 50, height: 50, borderRadius: "50%" }}><FontAwesomeIcon icon={faTrash} /></button><div style={{ flex: 1, background: "white", borderRadius: 30, height: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>{formatDuration(recordingDuration)}</div><button onClick={finishRecording} style={{ background: "#00C853", color: "white", width: 50, height: 50, borderRadius: "50%", border: "none" }}><FontAwesomeIcon icon={faCheck} /></button></>
              ) : (
                <>
                  <input type="file" ref={documentInputRef} onChange={(e) => handleFileSelect(e, "DOCUMENT")} style={{ display: "none" }} />
                  <input type="file" ref={galleryInputRef} onChange={(e) => handleFileSelect(e, "IMAGE")} style={{ display: "none" }} />
                  <div style={{ flex: 1, display: "flex", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: "25px", padding: "5px 10px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", height: "50px", position: "relative" }}>
                    
                    {/* ✅ EMOJI PICKER BURADA */}
                    {showEmojiPicker && (
                      <div style={{ position: "absolute", bottom: "80px", left: "0", zIndex: 100 }}>
                        <EmojiPicker onEmojiClick={onEmojiClick} autoFocusSearch={false} theme={Theme.LIGHT} emojiStyle={EmojiStyle.APPLE} width="100%" height={400} skinTonesDisabled={true} searchDisabled={false} previewConfig={{ showPreview: false }} />
                      </div>
                    )}

                    {/* ✅ PLUS MENÜ (Hatalı Kodun Olduğu Yer Burasıydı, Geri Eklendi) */}
                    {isPlusMenuOpen && (
                      <div style={{ position: "absolute", bottom: "80px", left: "0", backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "15px", zIndex: 100, minWidth: "200px", animation: "popupMenuEnter 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)", transformOrigin: "bottom left" }}>
                        {[
                          { icon: faFileAlt, label: "Belge", color: "#7F66FF", action: () => documentInputRef.current?.click() },
                          { icon: faImages, label: "Galeri", color: "#007BFF", action: () => galleryInputRef.current?.click() },
                          { icon: faCamera, label: "Kamera", color: "#FF4081", action: startCamera },
                          { icon: faUser, label: "Kişi", color: "#009688", action: () => alert("Kişi yakında...") },
                          { icon: faChartBar, label: "Anket", color: "#FFC107", action: () => alert("Anket yakında...") },
                          { icon: faCalendarAlt, label: "Etkinlik", color: "#FF9800", action: () => alert("Etkinlik yakında...") },
                          { icon: faStickyNote, label: "Çıkartma", color: "#4CAF50", action: () => alert("Çıkartma yakında...") },
                        ].map((item, idx) => (
                          <div key={idx} onClick={() => { item.action(); if (item.label !== "Kamera") setPlusMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", transition: "0.2s" }} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
                            <div style={{ width: "35px", height: "35px", borderRadius: "50%", background: `linear-gradient(135deg, ${item.color}, ${item.color}88)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "14px" }}><FontAwesomeIcon icon={item.icon} /></div>
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "#3E3663" }}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button onClick={() => { setPlusMenuOpen(!isPlusMenuOpen); setShowEmojiPicker(false); }} style={{ background: "transparent", border: "none", color: isPlusMenuOpen ? "#6F79FF" : "#9B95C9", fontSize: "20px", padding: "8px", cursor: "pointer", transform: isPlusMenuOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><FontAwesomeIcon icon={faPlus} /></button>
                    <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setPlusMenuOpen(false); }} style={{ background: "transparent", border: "none", color: showEmojiPicker ? "#6F79FF" : "#9B95C9", fontSize: "20px", padding: "8px", cursor: "pointer" }}><FontAwesomeIcon icon={faSmile} /></button>
                    <input ref={inputRef} style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "16px", color: "#3E3663", height: "100%", padding: "0 5px" }} value={newMessage} onChange={handleInputChange} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Bir mesaj yazın" />
                  </div>
                  <button onClick={() => { if (newMessage.trim()) handleSend(); else startRecording(); }} style={{ width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "#6F79FF", color: "white", border: "none", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><FontAwesomeIcon icon={newMessage.trim() ? faPaperPlane : faMicrophone} /></button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatLayout;