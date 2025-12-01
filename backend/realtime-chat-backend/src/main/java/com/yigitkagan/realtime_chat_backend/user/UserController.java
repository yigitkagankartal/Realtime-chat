package com.yigitkagan.realtime_chat_backend.user;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.yigitkagan.realtime_chat_backend.presence.PresenceService;
import java.util.Set;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PresenceService presenceService;

    public UserController(UserRepository userRepository,
                          PresenceService presenceService) {
        this.userRepository = userRepository;
        this.presenceService = presenceService;
    }

    // Tüm kullanıcıları listele
    @GetMapping
    public List<UserListItem> listUsers() {
        return userRepository.findAll()
                .stream()
                .map(u -> new UserListItem(
                        u.getId(),
                        u.getEmail(),
                        u.getDisplayName()
                ))
                .toList();
    }
    // Giriş yapmış kullanıcıyı döndür (/api/users/me)
    @GetMapping("/me")
    public UserMeResponse me(Authentication authentication) {
        String email = (String) authentication.getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName()
        );
    }
    @GetMapping("/online")
    public Set<Long> onlineUsers() {
        return presenceService.getOnlineUsers();
    }
}
