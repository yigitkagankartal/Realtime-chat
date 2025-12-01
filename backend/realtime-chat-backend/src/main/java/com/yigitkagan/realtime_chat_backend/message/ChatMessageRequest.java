package com.yigitkagan.realtime_chat_backend.message;

public record ChatMessageRequest (
    Long conversationId,
    Long senderId,
    String content
) {}
