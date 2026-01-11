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

    @GetMapping("/{conversationId}/messages")
    public Page<ChatMessageResponse> getMessages(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam Long viewerId
    ) {
        return chatService.getMessages(conversationId, page, size, viewerId);
    }

    @PostMapping("/{conversationId}/seen")
    public void markSeen(@PathVariable Long conversationId, @RequestParam Long viewerId) {
        chatService.markConversationAsSeen(conversationId, viewerId);
    }

    @PostMapping("/{messageId}/reaction")
    public void reactToMessage(@PathVariable Long messageId, @RequestParam Long viewerId, @RequestParam String emoji) {
        chatService.toggleReaction(messageId, viewerId, emoji);
    }

    @PutMapping("/{messageId}")
    public void editMessage(@PathVariable Long messageId, @RequestParam Long userId, @RequestBody String newContent) {
        chatService.editMessage(messageId, userId, newContent);
    }

    // 🔥 YENİ: Herkesten Sil (DELETE isteğine type parametresi ekledik)
    @DeleteMapping("/{messageId}/everyone")
    public void deleteForEveryone(@PathVariable Long messageId, @RequestParam Long userId) {
        chatService.deleteMessageForEveryone(messageId, userId);
    }

    // 🔥 YENİ: Benden Sil
    @DeleteMapping("/{messageId}/me")
    public void deleteForMe(@PathVariable Long messageId, @RequestParam Long userId) {
        chatService.deleteMessageForMe(messageId, userId);
    }
}