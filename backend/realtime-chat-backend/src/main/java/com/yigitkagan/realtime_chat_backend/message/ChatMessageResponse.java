package com.yigitkagan.realtime_chat_backend.message;

import java.time.Instant;

public record ChatMessageResponse(
        Long id,
        Long conversationId,
        Long senderId,
        String content,
        Instant createdAt,
        MessageStatus status
) {}
