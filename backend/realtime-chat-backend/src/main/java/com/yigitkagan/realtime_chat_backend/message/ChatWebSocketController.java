package com.yigitkagan.realtime_chat_backend.message;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatWebSocketController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatWebSocketController(ChatService chatService,
                                   SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(ChatMessageRequest request) {
        chatService.handleIncomingMessage(request);
    }

    // ✅ YAZIYOR (typing) EVENT'I
    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingNotification notification) {

        System.out.println("TYPING EVENT: " + notification);

        String destination =
                "/topic/conversations/" + notification.conversationId() + "/typing";

        messagingTemplate.convertAndSend(destination, notification);
    }
}
