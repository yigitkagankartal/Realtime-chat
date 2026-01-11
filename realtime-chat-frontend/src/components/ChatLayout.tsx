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
  reactToAnnouncement,
  deleteAnnouncement,
  deleteMessage,
  editMessage,
  deleteMessageForEveryone,
  deleteMessageForMe
} from "../api/chat";
import type {
  ChatMessageResponse,
  ConversationResponse,
  UserListItem,
} from "../api/chat";
import type { MeResponse } from "../api/auth";
import { useSocket } from "../context/SocketContext"; //
import { useOnlineUsers } from "../hooks/useOnlineUsers";
import ProfileSidebar from "./ProfileSidebar";
import ProfileSetupModal from "./ProfileSetupModal";
import ContactInfoSidebar from "./ContactInfoSidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane, faMicrophone, faTrash, faCheck, faPlus,
  faFileAlt, faImages, faCamera, faUser, faChartBar, faCalendarAlt, faStickyNote,
  faTimes, faFilePdf, faSpinner, faSmile, faReply, faCopy
} from "@fortawesome/free-solid-svg-icons";
import { compressImage } from "../utils/imageUtils";
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import MessageBubble from "./MessageBubble";
import WelcomeScreen from "./WelcomeScreen";

interface ChatLayoutProps {
  me: MeResponse;
  onLogout: () => void;
}
interface ChatUser extends UserListItem {
  unreadCount?: number;
  lastMessageText?: string;
  lastMessageTime?: string;
  lastMessageDate?: number;
}
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
  /* --- SAĞ TIK MENÜSÜ (CONTEXT MENU) --- */
  .context-menu {
    position: fixed;
    z-index: 9999;
    background: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 4px 0;
    min-width: 180px;
    animation: fadeIn 0.1s ease-out;
  }
  .context-menu-item {
    padding: 10px 20px;
    font-size: 14px;
    color: #3b4a54;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .context-menu-item:hover {
    background-color: #f5f6f6;
  }

  /* --- SEÇİM MODU (CHECKBOX) --- */
  .msg-checkbox-container {
    width: 0;
    overflow: hidden;
    transition: width 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .selection-mode .msg-checkbox-container {
    width: 40px; 
  }
  
  .custom-checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid #C6A7FF; /* Pasifken açık mor */
    border-radius: 6px; /* Daha yumuşak köşe */
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    background-color: white;
  }
  
  /* Vivoria Moru */
  .custom-checkbox.checked {
    background-color: #6F79FF; 
    border-color: #6F79FF;
  }
  
  .custom-checkbox .check-icon {
    color: white;
    font-size: 12px;
    display: none;
  }
  .custom-checkbox.checked .check-icon {
    display: block;
  }

  /* --- SİLME MODALI (SİYAH KUTU) --- */
  .delete-modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.4); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
  }
  .delete-modal {
    background: white;
    padding: 24px;
    border-radius: 3px;
    width: 400px;
    box-shadow: 0 17px 50px 0 rgba(0,0,0,.19), 0 12px 15px 0 rgba(0,0,0,.24);
    animation: scaleIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
  }
  .delete-modal h3 {
    margin: 0 0 15px 0;
    font-size: 15px;
    color: #3b4a54;
  }
  .delete-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }
  .btn-flat {
    background: transparent;
    border: 1px solid #EAE6FF;
    padding: 8px 16px;
    border-radius: 20px;
    color: #6F79FF; /* Yazı Mor */
    font-weight: 600;
    cursor: pointer;
    font-size: 13px;
  }
  .btn-flat:hover {
    background: #F5F3FF;
  }
  
  .btn-filled {
    background: #6F79FF; /* Arkaplan Mor */
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    cursor: pointer;
    font-size: 13px;
  }
  .btn-filled:hover {
    background: #5A62D6;
    box-shadow: 0 4px 10px rgba(111, 121, 255, 0.3);
  }

  @keyframes scaleIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
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

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const ChatLayout: React.FC<ChatLayoutProps> = ({ me, onLogout }) => {
  // --- STATE'LER ---
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [messageCache, setMessageCache] = useState<Record<number, ChatMessageResponse[]>>({});

  const [newMessage, setNewMessage] = useState("");
  const [typingUserId, setTypingUserId] = useState<number | null>(null);

  const lastProcessedMessageId = useRef<number | null>(null);

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

  // --- SAĞ TIK & SEÇİM STATE'LERİ ---
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: ChatMessageResponse | null } | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ADMIN & DUYURU
  const [activeTab, setActiveTab] = useState<"CHATS" | "CHANNELS">("CHATS"); // Sekme kontrolü
  const [announcements, setAnnouncements] = useState<any[]>([]); // Duyuru listesi
  const [channelMessage, setChannelMessage] = useState(""); // Admin duyuru yazısı

  //  DOSYA ÖNİZLEME STATE'LERİ
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

  const [editingMessage, setEditingMessage] = useState<ChatMessageResponse | null>(null);

  // SOCKET ENTEGRASYONU (HİBRİT YAPI)
  const { sendMessage, sendTyping, subscribe, lastMessage, isConnected } = useSocket();

  const handleTyping = useCallback((senderId: number) => {
    if (senderId === me.id) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    setTypingUserId(senderId);
    
    typingTimeoutRef.current = setTimeout(() => {
      setTypingUserId(null);
      typingTimeoutRef.current = null;
    }, 2000);
  }, [me.id]);

  // 3. AKTİF SOHBETİ DİNLEME (Canlı Sohbet - /topic)
  useEffect(() => {
    if (!selectedConversation || !isConnected) return;

    // A) Sohbet Mesajlarını Dinle (/topic/conversations/{id})
    const unsubMessages = subscribe(`/topic/conversations/${selectedConversation.id}`, (msg: ChatMessageResponse) => {
      // Ekrana bas
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Görüldü bilgisini güncelle
      markConversationSeen(selectedConversation.id, me.id).catch(() => {});
      
      // Cache'i güncelle
      setMessageCache((prev) => {
          const list = prev[msg.conversationId] || [];
          if (list.some(m => m.id === msg.id)) return prev;
          return { ...prev, [msg.conversationId]: [...list, msg] };
      });
    });

    // B) Yazıyor... Eventini Dinle
    const unsubTyping = subscribe(`/topic/conversations/${selectedConversation.id}/typing`, (data: any) => {
        handleTyping(data.senderId);
    });

    return () => {
      unsubMessages();
      unsubTyping();
    };
  }, [selectedConversation, isConnected, subscribe, handleTyping, me.id]);

  // 4. BİLDİRİM YÖNETİMİ (Arka Plan - /topic/notifications)
  useEffect(() => {
    if (!lastMessage) return;

    if (lastProcessedMessageId.current === lastMessage.id) {
        return;
    }
    if (selectedConversation && lastMessage.conversationId === selectedConversation.id) {
  
        lastProcessedMessageId.current = lastMessage.id;
        return; 
    }
    lastProcessedMessageId.current = lastMessage.id;

    setUsers(prevUsers => {
        const updatedUsers = prevUsers.map(user => {
            if (user.id === lastMessage.senderId) {
                return {
                    ...user,
                    unreadCount: (user.unreadCount || 0) + 1,
                    lastMessageText: lastMessage.content.startsWith("AUDIO::") ? "🎤 Sesli Mesaj" : lastMessage.content,
                    lastMessageTime: formatTime(lastMessage.createdAt),
                    lastMessageDate: new Date(lastMessage.createdAt).getTime()
                };
            }
            return user;
        });
        return updatedUsers.sort((a, b) => (b.lastMessageDate || 0) - (a.lastMessageDate || 0));
    });

    // Cache'i güncelle
    setMessageCache((prev) => {
        const list = prev[lastMessage.conversationId] || [];
        if (list.some(m => m.id === lastMessage.id)) return prev;
        return { ...prev, [lastMessage.conversationId]: [...list, lastMessage] };
    });

  }, [lastMessage, selectedConversation]);

  useEffect(() => {
    // 1. Seçim modunu kapat
    setIsSelectionMode(false);
    // 2. Seçili mesaj listesini boşalt
    setSelectedIds([]);
    // 3. Yarım kalan yazıyı temizle
    setNewMessage(""); 
    // 4. Düzenleme modu açıksa kapat
    setEditingMessage(null); 
    // 5. Artı menüsü açıksa kapat
    setPlusMenuOpen(false); 
  }, [selectedConversation?.id]); 

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
      
      const mappedUsers: ChatUser[] = userList.map(u => ({ ...u, unreadCount: 0 }));
      setUsers(mappedUsers);
      
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
    
    const sortedHistory = [...history].filter(m => m !== null && m !== undefined).reverse();
    
    setMessages(sortedHistory);
    setMessageCache((prev) => ({ ...prev, [conv.id]: sortedHistory }));
    markConversationSeen(conv.id, me.id).catch(() => { });
  };

  // --- 1. SAĞ TIK (Context Menu) ---
  const handleContextMenu = (e: React.MouseEvent, msg: ChatMessageResponse) => {
    e.preventDefault();
    if (isSelectionMode) return;

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message: msg
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  // --- 2. SEÇİM MODU İŞLEMLERİ ---
  const toggleSelectionMode = (msgId: number) => {
    setIsSelectionMode(true);
    toggleMessageSelection(msgId);
    setContextMenu(null);
  };

  const toggleMessageSelection = (msgId: number) => {
    setSelectedIds(prev => {
      if (prev.includes(msgId)) {
        const newVal = prev.filter(id => id !== msgId);
        if (newVal.length === 0) setIsSelectionMode(false);
        return newVal;
      }
      return [...prev, msgId];
    });
  };

  // --- 3. SİLME İŞLEMLERİ ---
  const handleDeleteTrigger = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (type: "ME" | "EVERYONE") => {
    if (selectedIds.length === 0 && !contextMenu?.message) return;

    const idsToDelete = selectedIds.length > 0
      ? selectedIds
      : (contextMenu?.message ? [contextMenu.message.id] : []);

    try {
      for (const id of idsToDelete) {
        if (type === "EVERYONE") {
          await deleteMessageForEveryone(id, me.id);
        } else {
          await deleteMessageForMe(id, me.id);
        }
      }

      if (type === "ME") {
        setMessages(prev => prev.filter(m => m && !idsToDelete.includes(m.id)));
      } else {
        setMessages(prev => prev.map(m => {
            if (!m) return m; 
            return idsToDelete.includes(m.id) 
                ? { ...m, content: "Bu mesaj silindi", deletedForEveryone: true } 
                : m;
        }));
      }

      setShowDeleteModal(false);
      setIsSelectionMode(false);
      setSelectedIds([]);
      setContextMenu(null);

    } catch (error) {
      console.error("Silme hatası:", error);
      alert("Bir hata oluştu.");
    }
  };

  const handleSend = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    if (editingMessage) {
      try {
        await editMessage(editingMessage.id, me.id, newMessage);
        setMessages(prev => prev.map(m =>
          (m && m.id === editingMessage.id) ? { ...m, content: newMessage } : m
        ));
        setEditingMessage(null);
        setNewMessage("");
        return;
      } catch (error) { console.error("Düzenleme hatası", error); }
    }

    else {
      sendMessage(selectedConversation.id, newMessage, me.id);
      setNewMessage("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!selectedConversation || !e.target.value.trim()) return;
    sendTyping(selectedConversation.id, me.id);
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
 
      sendMessage(selectedConversation.id, contentString, me.id);

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

      if (selectedConversation.id === -999) {
        if (me.role === "ADMIN") {
          await postAnnouncement("🎤 Sesli Duyuru", audioUrl, me.id);
          loadAnnouncements();
        }
      }
      else {
        sendMessage(selectedConversation.id, "AUDIO::" + audioUrl, me.id);
      }
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

  // --- Initial Data Load ---
  useEffect(() => {
    if (activeTab === "CHANNELS" || (selectedConversation && selectedConversation.id === -999)) {
      loadAnnouncements();
    }
  }, [activeTab, selectedConversation]);

  useEffect(() => {
    if (selectedConversation?.id === -999) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [announcements, activeTab, selectedConversation]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 150) + "px";
    }
  }, [channelMessage]);

  const handleDeleteAnnouncement = async (id: number) => {
    if (!window.confirm("Bu duyuruyu silmek istediğine emin misin?")) return;
    try {
      await deleteAnnouncement(id, me.id);
      loadAnnouncements();
    } catch (e) { console.error(e); }
  };

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

  const handleEditClick = (msg: ChatMessageResponse) => {
    setEditingMessage(msg);
    setNewMessage(msg.content);
    inputRef.current?.focus();
  };

  const handleDeleteClick = async (msg: ChatMessageResponse) => {
    if (!window.confirm("Bu mesajı silmek istediğine emin misin?")) return;
    try {
      await deleteMessage(msg.id, me.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch (error) {
      console.error("Silme hatası:", error);
      alert("Mesaj silinemedi.");
    }
  };

  // --- Sidebar Logic ---
  const peer = (() => {
    if (!selectedConversation) return null;
    const peerId = selectedConversation.user1Id === me.id ? selectedConversation.user2Id : selectedConversation.user1Id;
    // ✅ DÜZELTME: ChatUser üzerinden erişim
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
      const peerMessages = messages.filter((m) => m && m.senderId === peer.id);
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
      
      const rawMessages = conv ? messageCache[conv.id] ?? [] : [];
      const convMessages = rawMessages.filter(m => m !== null && m !== undefined);

      const lastMessage = convMessages.length > 0 ? convMessages[convMessages.length - 1] : undefined;
      
      let lastMessageText = "Henüz mesaj yok";
      if (lastMessage && lastMessage.content) {
        if (lastMessage.content.startsWith("AUDIO::")) lastMessageText = "🎤 Sesli Mesaj";
        else if (lastMessage.content.startsWith("IMAGE::")) lastMessageText = "📷 Fotoğraf";
        else if (lastMessage.content.startsWith("VIDEO::")) lastMessageText = "🎥 Video";
        else if (lastMessage.content.startsWith("DOCUMENT::")) lastMessageText = "📄 Belge";
        else lastMessageText = lastMessage.content;
      }

      // Eğer Socket'ten gelen canlı veri varsa onu kullan, yoksa cache'den hesapla
      const displayUnreadCount = user.unreadCount || convMessages.filter((m) => m && m.senderId && m.senderId !== me.id && m.status !== "SEEN").length;
      const displayLastMessageText = user.lastMessageText || lastMessageText;
      const displayLastMessageTime = user.lastMessageTime || (lastMessage ? formatTime(lastMessage.createdAt) : "");
      const displayLastMessageDate = user.lastMessageDate || (lastMessage ? new Date(lastMessage.createdAt).getTime() : 0);

      return {
        user,
        conv,
        lastMessageText: displayLastMessageText,
        lastMessageTime: displayLastMessageTime,
        unreadCount: displayUnreadCount, //
        lastMessageDate: displayLastMessageDate, //
        isOnline: onlineIds.includes(user.id)
      };
    })
    .sort((a, b) => b.lastMessageDate - a.lastMessageDate);

  // --- RENDER ---
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Segoe UI, sans-serif", background: "linear-gradient(180deg, #C6A7FF 0%, #9B8CFF 45%, #6F79FF 100%)" }} onClick={closeContextMenu}>
      {showDeleteModal && (
        <div className="delete-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {selectedIds.length > 1
                ? `${selectedIds.length} mesaj silinsin mi?`
                : "Bu mesaj silinsin mi?"}
            </h3>

            <div className="delete-modal-actions">
              <button className="btn-flat" onClick={() => setShowDeleteModal(false)}>İptal</button>
              <button className="btn-flat" onClick={() => handleConfirmDelete("ME")}>Benden sil</button>
              {(() => {
                const idsToCheck = selectedIds.length > 0 ? selectedIds : (contextMenu?.message ? [contextMenu.message.id] : []);
                const allMine = idsToCheck.every(id => {
                  const m = messages.find(msg => msg.id === id);
                  return m?.senderId === me.id;
                });
                if (allMine) {
                  return <button className="btn-filled" onClick={() => handleConfirmDelete("EVERYONE")}>Herkesten sil</button>;
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* --- 🔥 2. SAĞ TIK MENÜSÜ (CONTEXT MENU) --- */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={() => { setNewMessage(`Alıntı: "${contextMenu.message?.content.substring(0, 20)}..." `); closeContextMenu(); }}>
            <FontAwesomeIcon icon={faReply} /> Cevapla
          </div>
          <div className="context-menu-item" onClick={() => { navigator.clipboard.writeText(contextMenu.message?.content || ""); closeContextMenu(); }}>
            <FontAwesomeIcon icon={faCopy} /> Kopyala
          </div>
          <div className="context-menu-item" onClick={() => contextMenu.message && toggleSelectionMode(contextMenu.message.id)}>
            <FontAwesomeIcon icon={faCheck} /> Seç
          </div>
          <div className="context-menu-item" onClick={handleDeleteTrigger}>
            <FontAwesomeIcon icon={faTrash} /> Sil
          </div>
        </div>
      )}

      {/* 3. DOSYA ÖNİZLEME MODALI */}
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

        {/* 1. DURUM: HİÇBİR SOHBET SEÇİLİ DEĞİLSE -> WELCOME SCREEN */}
        {!selectedConversation ? (
          <WelcomeScreen />
        ) :

          /* 2. DURUM: DUYURU KANALI SEÇİLİYSE */
          selectedConversation.id === -999 ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* ... (Duyuru ekranı kodları aynı, değişiklik yok) ... */}
              <div style={{ height: "65px", background: "white", padding: "0 20px", display: "flex", alignItems: "center", borderBottom: "1px solid #EAE6FF", gap: 15, boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
                {isMobile && <button onClick={() => setSelectedConversation(null)} style={{ border: "none", background: "transparent", fontSize: "24px", color: "#3E3663" }}>‹</button>}
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #FF9800, #FF5722)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: "0 2px 8px rgba(255, 152, 0, 0.3)" }}>📢</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontWeight: "bold", fontSize: "17px", color: "#3E3663" }}>Vivoria Duyurular</div>
                  <div style={{ fontSize: "12px", color: "#9B95C9" }}>Resmi güncellemeler</div>
                </div>
              </div>

              {/* Duyuru Akışı */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: "linear-gradient(180deg, #F5F3FF, #EAE6FF)" }}>
                {announcements.map((ann) => (
                  <div key={ann.id} style={{ maxWidth: "600px", margin: "0 auto 25px auto", backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", overflow: "hidden", border: "1px solid #fff", position: "relative" }}>
                    {me.role === "ADMIN" && (
                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        style={{
                          position: "absolute", top: "10px", right: "10px", zIndex: 5,
                          background: "rgba(255, 255, 255, 0.9)", border: "none", cursor: "pointer",
                          color: "#FF4D4D", width: "30px", height: "30px", borderRadius: "50%",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                        title="Duyuruyu Sil"
                      >
                        <FontAwesomeIcon icon={faTrash} fontSize={14} />
                      </button>
                    )}

                    {ann.mediaUrl && <img src={ann.mediaUrl} style={{ width: "100%", maxHeight: "350px", objectFit: "cover" }} />}
                    <div style={{ padding: "20px" }}>
                      <p style={{ whiteSpace: "pre-wrap", color: "#3E3663", fontSize: "15px", lineHeight: "1.6", margin: "0 0 15px 0", fontFamily: "'Segoe UI', sans-serif" }}>{ann.content}</p>

                      {/* Tepkiler */}
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {["👍", "❤️", "😂", "😮", "😢", "👏"].map(emoji => {
                          const count = ann.reactions?.filter((r: any) => r.emoji === emoji).length || 0;
                          const isReactedByMe = ann.reactions?.some((r: any) => r.emoji === emoji && Number(r.userId) === me.id);
                          return (
                            <button key={emoji} onClick={() => handleReaction(ann.id, emoji)} style={{ background: isReactedByMe ? "#E7F3FF" : "#F8F9FA", border: isReactedByMe ? "1px solid #6F79FF" : "1px solid #EEE", borderRadius: "20px", padding: "6px 12px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
                              {emoji} {count > 0 && <span style={{ fontWeight: "bold", color: isReactedByMe ? "#6F79FF" : "#999", fontSize: "12px" }}>{count}</span>}
                            </button>
                          )
                        })}
                      </div>
                      <div style={{ textAlign: "right", fontSize: "11px", color: "#9B95C9", marginTop: "10px", fontWeight: "600" }}>{new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Admin Input Alanı */}
              {me.role === "ADMIN" && (
                <div style={{ minHeight: "80px", padding: "10px 20px 20px 20px", display: "flex", alignItems: "flex-end", gap: 12, position: "relative", zIndex: 10 }}>
                  {isRecording ? (
                    <>
                      <button onClick={cancelRecording} style={{ background: "white", border: "none", color: "#FF4D4D", width: 50, height: 50, borderRadius: "50%", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", cursor: "pointer", marginBottom: "2px" }}><FontAwesomeIcon icon={faTrash} /></button>
                      <div style={{ flex: 1, background: "white", borderRadius: 30, height: 50, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", color: "#FF4D4D", fontWeight: "bold", fontSize: "18px", marginBottom: "2px" }}><div style={{ width: 10, height: 10, background: "#FF4D4D", borderRadius: "50%", marginRight: 10, animation: "bounce 1s infinite" }}></div>{formatDuration(recordingDuration)}</div>
                      <button onClick={finishRecording} style={{ background: "#00C853", color: "white", width: 50, height: 50, borderRadius: "50%", border: "none", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", cursor: "pointer", marginBottom: "2px" }}><FontAwesomeIcon icon={faCheck} /></button>
                    </>
                  ) : (
                    <>
                      <input type="file" ref={documentInputRef} onChange={(e) => handleFileSelect(e, "DOCUMENT")} style={{ display: "none" }} />
                      <input type="file" ref={galleryInputRef} onChange={(e) => handleFileSelect(e, "IMAGE")} style={{ display: "none" }} />

                      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", backgroundColor: "#FFFFFF", borderRadius: "24px", padding: "12px 10px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", minHeight: "50px", position: "relative" }}>
                        {showEmojiPicker && (
                          <div style={{ position: "absolute", bottom: "60px", left: "0", zIndex: 100 }}>
                            <EmojiPicker onEmojiClick={(emojiData) => setChannelMessage((prev) => prev + emojiData.emoji)} autoFocusSearch={false} theme={Theme.LIGHT} emojiStyle={EmojiStyle.APPLE} width="100%" height={400} skinTonesDisabled={true} searchDisabled={false} previewConfig={{ showPreview: false }} />
                          </div>
                        )}
                        {isPlusMenuOpen && (
                          <div style={{ position: "absolute", bottom: "60px", left: "0", backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "15px", zIndex: 100, minWidth: "200px", animation: "popupMenuEnter 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)", transformOrigin: "bottom left" }}>
                            {[
                              { icon: faFileAlt, label: "Belge", color: "#7F66FF", action: () => documentInputRef.current?.click() },
                              { icon: faImages, label: "Galeri", color: "#007BFF", action: () => galleryInputRef.current?.click() },
                              { icon: faCamera, label: "Kamera", color: "#FF4081", action: startCamera },
                            ].map((item, idx) => (
                              <div key={idx} onClick={() => { item.action(); if (item.label !== "Kamera") setPlusMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", transition: "0.2s" }}>
                                <div style={{ width: "35px", height: "35px", borderRadius: "50%", background: `linear-gradient(135deg, ${item.color}, ${item.color}88)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "14px" }}><FontAwesomeIcon icon={item.icon} /></div>
                                <span style={{ fontSize: "14px", fontWeight: "600", color: "#3E3663" }}>{item.label}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <button onClick={() => { setPlusMenuOpen(!isPlusMenuOpen); setShowEmojiPicker(false); }} style={{ background: "transparent", border: "none", color: isPlusMenuOpen ? "#6F79FF" : "#9B95C9", fontSize: "20px", padding: "0 8px", cursor: "pointer", transform: isPlusMenuOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s", marginBottom: "2px" }}><FontAwesomeIcon icon={faPlus} /></button>
                        <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setPlusMenuOpen(false); }} style={{ background: "transparent", border: "none", color: showEmojiPicker ? "#6F79FF" : "#9B95C9", fontSize: "20px", padding: "0 8px", cursor: "pointer", marginBottom: "2px" }}><FontAwesomeIcon icon={faSmile} /></button>

                        <textarea
                          ref={textareaRef}
                          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "16px", color: "#3E3663", padding: "4px 5px", resize: "none", fontFamily: "inherit", maxHeight: "150px", overflowY: "auto", height: "24px", lineHeight: "24px" }}
                          rows={1}
                          value={channelMessage}
                          onChange={(e) => setChannelMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handlePostAnnouncement();
                            }
                          }}
                          placeholder="Bir mesaj yazın"
                        />
                      </div>

                      <button onClick={() => { if (channelMessage.trim()) handlePostAnnouncement(); else startRecording(); }} style={{ width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "#6F79FF", color: "white", border: "none", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 15px rgba(111, 121, 255, 0.4)", transition: "transform 0.1s", marginBottom: "2px" }} onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"} onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}>
                        <FontAwesomeIcon icon={channelMessage.trim() ? faPaperPlane : faMicrophone} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* 3. DURUM: NORMAL SOHBET EKRANI */
            <>
              {/* --- HEADER --- */}
              {isSelectionMode ? (
                /* 🔥 SEÇİM MODU BAŞLIĞI */
                <div style={{ height: "65px", background: "white", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 20, borderBottom: "1px solid #ddd" }}>
                  <button onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
                  <div style={{ fontSize: "18px", fontWeight: "600" }}>{selectedIds.length} seçildi</div>
                  <div style={{ flex: 1 }}></div>
                  <button onClick={handleDeleteTrigger} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#FF4D4D" }}><FontAwesomeIcon icon={faTrash} /></button>
                </div>
              ) : (
                /* NORMAL BAŞLIK */
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
              )}

              {/* --- MESAJ LİSTESİ --- */}
              <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, padding: "16px 24px", overflowY: "auto" }}>
                {isLoadingHistory && <div style={{ textAlign: "center", padding: "10px", color: "#6F79FF", fontSize: "13px" }}>⏳ Eski mesajlar yükleniyor...</div>}

                <div style={{ maxWidth: 1480, margin: "0 auto" }}>
                  {[...messages]
                    .filter(m => m !== null && m !== undefined && m.senderId !== undefined)
                    .sort((a, b) => (a.id || 0) - (b.id || 0))
                    .map((m, index) => {

                      if (!m || !m.senderId) return null;

                      const isMine = m.senderId === me.id;
                      let showDateSeparator = index === 0;

                      if (index > 0) {
                        const prevMsg = messages[index - 1];
                        if (prevMsg && prevMsg.createdAt) {
                          const prevDate = new Date(prevMsg.createdAt).toDateString();
                          const currDate = new Date(m.createdAt).toDateString();
                          if (prevDate !== currDate) showDateSeparator = true;
                        }
                      }

                      return (
                        <div
                          key={m.id}
                          onContextMenu={(e) => handleContextMenu(e, m)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            marginBottom: 4,
                            backgroundColor: selectedIds.includes(m.id) ? "rgba(111, 121, 255, 0.08)" : "transparent", // Seçili mesajı parlat
                            transition: "background-color 0.2s"
                          }}
                          className={isSelectionMode ? "selection-mode" : ""}
                        >
                          {/* ... Tarih Ayracı ... */}
                          {showDateSeparator && (
                            <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 12px 0" }}>
                              <div style={{ backgroundColor: "#EAE6FF", color: "#6F79FF", padding: "6px 14px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>{formatDateLabel(m.createdAt)}</div>
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                            {/* Checkbox Alanı */}
                            <div className="msg-checkbox-container" style={{ width: isSelectionMode ? "40px" : "0px", overflow: "hidden", transition: "width 0.2s" }}>
                              <div className={`custom-checkbox ${selectedIds.includes(m.id) ? "checked" : ""}`} onClick={() => toggleMessageSelection(m.id)}>
                                <FontAwesomeIcon icon={faCheck} className="check-icon" />
                              </div>
                            </div>

                            {/* Mesaj Balonu */}
                            <div style={{ flex: 1, display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                              {m.deletedForEveryone ? (
                                <div style={{ padding: "8px 12px", background: isMine ? "#5865F2" : "#F3F4F6", borderRadius: 10, color: isMine ? "#DDD" : "#888", fontStyle: "italic", fontSize: "14px", display: "flex", alignItems: "center", gap: 5 }}>
                                  <FontAwesomeIcon icon={faTrash} size="sm" /> Bu mesaj silindi
                                </div>
                              ) : (
                                <MessageBubble
                                  message={m}
                                  me={me}
                                  isMine={isMine}
                                  onViewImage={setViewingImage}
                                  onReply={(msg) => setNewMessage(`Alıntı: "${msg.content.substring(0, 20)}..." `)}
                                  onEdit={handleEditClick}
                                  onDelete={handleDeleteClick}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {/* YAZIYOR ANİMASYONU */}
                  <div style={{ padding: typingUserId === peer?.id ? "0 24px 16px 24px" : "0", opacity: typingUserId === peer?.id ? 1 : 0, transition: "all 0.5s ease", maxHeight: typingUserId === peer?.id ? 60 : 0, overflow: "hidden" }}>
                    <div style={{ backgroundColor: "#FFFFFF", padding: "10px 14px", borderRadius: 16, borderTopLeftRadius: 0, display: "inline-flex", width: "fit-content" }}>
                      <div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div>
                    </div>
                  </div>

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* --- INPUT ALANI --- */}
              {!isSelectionMode && (
                <div style={{ minHeight: "80px", padding: "0 20px 20px 20px", display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 10 }}>
                  {/* Kamera Modal */}
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

                        {editingMessage && (
                          <div style={{ position: "absolute", bottom: "60px", left: "0px", right: "0px", background: "#f0f0f0", padding: "10px", borderRadius: "10px", borderLeft: "4px solid #6F79FF", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50, fontSize: "13px", color: "#666" }}>
                            <div><span style={{ color: "#6F79FF", fontWeight: "bold" }}>Düzenleniyor:</span> {editingMessage.content.substring(0, 50)}...</div>
                            <button onClick={() => { setEditingMessage(null); setNewMessage(""); }} style={{ border: "none", background: "transparent", color: "#FF4D4D", cursor: "pointer", fontWeight: "bold" }}>✕ İptal</button>
                          </div>
                        )}

                        {showEmojiPicker && (
                          <div style={{ position: "absolute", bottom: "80px", left: "0", zIndex: 100 }}>
                            <EmojiPicker onEmojiClick={onEmojiClick} autoFocusSearch={false} theme={Theme.LIGHT} emojiStyle={EmojiStyle.APPLE} width="100%" height={400} skinTonesDisabled={true} searchDisabled={false} previewConfig={{ showPreview: false }} />
                          </div>
                        )}

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
                        <input
                          ref={inputRef}
                          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "16px", color: "#3E3663", height: "100%", padding: "0 5px" }}
                          value={newMessage}
                          onChange={handleInputChange}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          placeholder="Bir mesaj yazın"
                        />
                      </div>
                      <button onClick={() => { if (newMessage.trim()) handleSend(); else startRecording(); }} style={{ width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "#6F79FF", color: "white", border: "none", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><FontAwesomeIcon icon={newMessage.trim() ? faPaperPlane : faMicrophone} /></button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
};

export default ChatLayout;