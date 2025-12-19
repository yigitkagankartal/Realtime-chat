import api from "./client";

export interface UserListItem {
  id: number;
  email: string;
  displayName: string;
  profilePictureUrl?: string;
  about?: string;
  phoneNumber: string;
  lastSeen?: string;
}

export interface ConversationResponse {
  id: number;
  user1Id: number;
  user1Name: string;
  user2Id: number;
  user2Name: string;
}

export type MessageStatus = "SENT" | "DELIVERED" | "SEEN";

export interface ChatMessageResponse {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  createdAt: string;
  status?: MessageStatus;
}

export const listUsers = async (): Promise<UserListItem[]> => {
  const res = await api.get<UserListItem[]>("/api/users");
  return res.data;
};

export const listConversations = async (): Promise<ConversationResponse[]> => {
  const res = await api.get<ConversationResponse[]>("/api/conversations");
  return res.data;
};

export const createOrGetConversation = async (
  otherUserId: number
): Promise<ConversationResponse> => {
  const res = await api.post<ConversationResponse>("/api/conversations", {
    otherUserId,
  });
  return res.data;
};

export const getMessages = async (
  conversationId: number,
  viewerId: number,
  page: number = 0
): Promise<ChatMessageResponse[]> => {
  const res = await api.get(`/api/conversations/${conversationId}/messages`, {
    params: { page: page, size: 50, viewerId },
  });
  if (res.data && Array.isArray(res.data.content)) {
    return res.data.content as ChatMessageResponse[];
  }
  if (Array.isArray(res.data)) {
    return res.data as ChatMessageResponse[];
  }
  return [];
};

export const markConversationSeen = async (
  conversationId: number,
  viewerId: number
) => {
  await api.post(`/api/conversations/${conversationId}/seen`, null, {
    params: { viewerId },
  });
};

export const getUserById = async (userId: number): Promise<UserListItem> => {
  const res = await api.get<UserListItem>(`/api/users/${userId}`);
  return res.data;
};

export const uploadAudio = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData();
  const fileName = `voice_msg_${Date.now()}.webm`; 
  formData.append("file", audioBlob, fileName);

  const res = await api.post<{ url: string }>("/api/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.url;
};

export const uploadMedia = async (file: File | Blob): Promise<string> => {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append("file", file);
  } else {
    formData.append("file", file, `camera_capture_${Date.now()}.jpg`);
  }

  const res = await api.post<{ url: string }>("/api/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  
  return res.data.url;
};

// --- DUYURU & KANAL API (DÜZELTİLDİ: 'api' instance kullanıldı) ---

// Duyuruları getir
export const getAnnouncements = async () => {
  // api.get zaten base url ve auth header'ı halleder
  const res = await api.get("/api/announcements");
  return res.data;
};

// Yeni duyuru paylaş (Sadece Admin)
export const postAnnouncement = async (content: string, mediaUrl: string | null, userId: number) => {
  const res = await api.post(`/api/announcements`, 
    { content, mediaUrl }, 
    { params: { userId } } // Query param olarak userId gönderiyoruz
  );
  return res.data;
};

// Tepki ver
export const reactToAnnouncement = async (announcementId: number, userId: number, emoji: string) => {
  const res = await api.post(`/api/announcements/${announcementId}/react`, null, {
    params: { userId, emoji } // Query params olarak gönderiyoruz
  });
  return res.data;
};