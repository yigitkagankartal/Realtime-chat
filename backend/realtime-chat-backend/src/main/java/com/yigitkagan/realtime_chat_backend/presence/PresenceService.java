package com.yigitkagan.realtime_chat_backend.presence;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PresenceService {

    // WebSocket sessionId -> userId
    private final Map<String, Long> sessionUserMap = new ConcurrentHashMap<>();
    // o anda online olan kullanıcı id'leri
    private final Set<Long> onlineUsers = ConcurrentHashMap.newKeySet();

    public void userConnected(String sessionId, Long userId) {
        sessionUserMap.put(sessionId, userId);
        onlineUsers.add(userId);
    }

    public void userDisconnected(String sessionId) {
        Long userId = sessionUserMap.remove(sessionId);
        if (userId != null) {
            boolean stillConnected = sessionUserMap.containsValue(userId);
            if (!stillConnected) {
                onlineUsers.remove(userId);
            }
        }
    }

    public Set<Long> getOnlineUsers() {
        return onlineUsers;
    }
}
