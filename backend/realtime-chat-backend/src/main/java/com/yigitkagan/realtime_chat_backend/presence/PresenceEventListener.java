package com.yigitkagan.realtime_chat_backend.presence;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Set;

@Component
public class PresenceEventListener {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    public PresenceEventListener(PresenceService presenceService,
                                 SimpMessagingTemplate messagingTemplate) {
        this.presenceService = presenceService;
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handleSessionConnected(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        String userIdHeader = accessor.getFirstNativeHeader("user-id");

        if (sessionId == null || userIdHeader == null) {
            return;
        }

        try {
            Long userId = Long.parseLong(userIdHeader);
            presenceService.userConnected(sessionId, userId);
            broadcastOnlineUsers();
        } catch (NumberFormatException ignored) {
        }
    }

    @EventListener
    public void handleSessionDisconnected(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        if (sessionId == null) {
            return;
        }

        presenceService.userDisconnected(sessionId);
        broadcastOnlineUsers();
    }

    private void broadcastOnlineUsers() {
        Set<Long> onlineUserIds = presenceService.getOnlineUsers();

        System.out.println("ONLINE USERS: " + onlineUserIds); // 👈 BUNU EKLE

        messagingTemplate.convertAndSend("/topic/online-users", onlineUserIds);
    }

}
