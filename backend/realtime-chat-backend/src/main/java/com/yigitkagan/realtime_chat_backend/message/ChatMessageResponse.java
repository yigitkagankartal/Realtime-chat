package com.yigitkagan.realtime_chat_backend.message;

import java.time.Instant;
import java.util.List;

// Ana Response
public record ChatMessageResponse(
        Long id,
        Long conversationId,
        Long senderId,
        String content,
        Instant createdAt,
        Instant updatedAt,
        MessageStatus status,
        List<ReactionSummary> reactions,
        boolean deletedForEveryone
) {}
record ReactionSummary(
        String emoji,
        int count,      // Kaç kişi tıkladı?
        boolean isMe    // Görüntüleyen kişi buna tıkladı mı? (Rengi mavi yapmak için)
) {}