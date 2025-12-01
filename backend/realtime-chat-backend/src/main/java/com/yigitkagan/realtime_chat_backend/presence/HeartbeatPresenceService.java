package com.yigitkagan.realtime_chat_backend.presence;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class HeartbeatPresenceService {

    // userId -> lastSeen
    private final ConcurrentHashMap<Long, Instant> lastSeenMap = new ConcurrentHashMap<>();

    public void heartbeat(Long userId) {
        lastSeenMap.put(userId, Instant.now());
    }

    public Set<Long> getOnlineUsers(Duration maxAge) {
        Instant now = Instant.now();
        return lastSeenMap.entrySet().stream()
                .filter(entry -> Duration.between(entry.getValue(), now).compareTo(maxAge) <= 0)
                .map(entry -> entry.getKey())
                .collect(Collectors.toSet());
    }
}
