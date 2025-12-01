package com.yigitkagan.realtime_chat_backend.conversation;

// Sohbet başlatırken karşı tarafın userId'sini göndereceğiz
public record ConversationCreateRequest(
        Long otherUserId
) {}
