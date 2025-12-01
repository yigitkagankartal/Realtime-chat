package com.yigitkagan.realtime_chat_backend.conversation;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    // Konuşma başlat / mevcutsa getir
    @PostMapping
    public ConversationResponse createOrGet(
            @RequestBody ConversationCreateRequest request,
            Authentication authentication
    ) {
        return conversationService.createOrGetConversation(request, authentication);
    }

    // Kullanıcının konuşma listesi
    @GetMapping
    public List<ConversationResponse> myConversations(Authentication authentication) {
        return conversationService.listMyConversations(authentication);
    }
}
