package com.yigitkagan.realtime_chat_backend.presence;

import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Set;

@RestController
@RequestMapping("/api/presence")
public class PresenceController {

    private final HeartbeatPresenceService presenceService;

    public PresenceController(HeartbeatPresenceService presenceService) {
        this.presenceService = presenceService;
    }

    // Frontend her birkaç saniyede bir buraya userId ile POST atacak
    public record HeartbeatRequest(Long userId) {}

    @PostMapping("/heartbeat")
    public void heartbeat(@RequestBody HeartbeatRequest request) {
        if (request.userId() != null) {
            presenceService.heartbeat(request.userId());
        }
    }

    // Online kullanıcı ID listesini döner
    @GetMapping("/online")
    public Set<Long> onlineUsers() {
        // Son 10 saniyede nabız gönderenleri online say
        return presenceService.getOnlineUsers(Duration.ofSeconds(10));
    }
}
