package com.yigitkagan.realtime_chat_backend.conversation;

public record ConversationResponse(
        Long id,
        Long user1Id,
        String user1Name,
        Long user2Id,
        String user2Name
) {}
