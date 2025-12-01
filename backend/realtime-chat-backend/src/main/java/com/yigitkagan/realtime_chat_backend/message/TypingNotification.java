package com.yigitkagan.realtime_chat_backend.message;

public record TypingNotification(
        Long conversationId,
        Long senderId
) {}
