import api from "./client";
export interface UserListItem {
  id: number;
  email: string;
  displayName: string;
  profilePictureUrl?: string;
  about?: string;
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
  status?: MessageStatus; // <-- yeni alan (opsiyonel, backend ekleyince dolacak)
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

  // Backend'e page parametresini gönderiyoruz
  const res = await api.get(`/api/conversations/${conversationId}/messages`, {
    params: { page: page, size: 50, viewerId },
  });
  if (res.data && Array.isArray(res.data.content)) {
    return res.data.content as ChatMessageResponse[];
  }
  // Eğer backend bir gün değişir de direkt array dönerse diye önlem:
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

