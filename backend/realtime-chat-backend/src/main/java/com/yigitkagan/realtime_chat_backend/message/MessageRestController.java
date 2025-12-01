package com.yigitkagan.realtime_chat_backend.message;

import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/conversations")
public class MessageRestController {

    private final ChatService chatService;

    public MessageRestController(ChatService chatService) {
        this.chatService = chatService;
    }

    // 👇 Mesaj listesini getir + DELIVERED güncelle (viewerId parametresi eklendi)
    @GetMapping("/{conversationId}/messages")
    public Page<ChatMessageResponse> getMessages(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam Long viewerId   // 🔥 yeni
    ) {
        return chatService.getMessages(conversationId, page, size, viewerId);
    }

    // 👇 SEEN endpoint'i
    @PostMapping("/{conversationId}/seen")
    public void markSeen(
            @PathVariable Long conversationId,
            @RequestParam Long viewerId
    ) {
        chatService.markConversationAsSeen(conversationId, viewerId);
    }
}
