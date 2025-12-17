package com.yigitkagan.realtime_chat_backend.user;

import com.yigitkagan.realtime_chat_backend.file.FileService;
import com.yigitkagan.realtime_chat_backend.presence.PresenceService;
import com.yigitkagan.realtime_chat_backend.user.UserDTOs.UserListItem;
import com.yigitkagan.realtime_chat_backend.user.UserDTOs.UserMeResponse;
// DİKKAT: Aşağıdaki satır UserDTOs içindekini DEĞİL, harici dosyayı işaret ediyor. Doğrusu bu:
import com.yigitkagan.realtime_chat_backend.user.UpdateProfileRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PresenceService presenceService;
    private final FileService fileService;

    public UserController(UserRepository userRepository,
                          PresenceService presenceService,
                          FileService fileService) {
        this.userRepository = userRepository;
        this.presenceService = presenceService;
        this.fileService = fileService;
    }

    // Profil Resmi Yükleme
    @PostMapping("/me/image")
    public ResponseEntity<UserMeResponse> uploadProfileImage(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        String email = (String) authentication.getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String imageUrl = fileService.uploadImage(file);
        user.setProfilePictureUrl(imageUrl);
        userRepository.save(user);

        return ResponseEntity.ok(new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.getAbout()
        ));
    }

    // Tüm kullanıcıları listele
    @GetMapping
    public List<UserListItem> listUsers() {
        return userRepository.findAll()
                .stream()
                .map(u -> new UserListItem(
                        u.getId(),
                        u.getEmail(),
                        u.getDisplayName(),
                        u.getProfilePictureUrl(),
                        u.getAbout(),
                        u.getPhoneNumber()
                ))
                .toList();
    }

    // Profil güncelleme (Display Name & About)
    @PutMapping("/me")
    public UserMeResponse updateProfile(
            @RequestBody UpdateProfileRequest request,
            Authentication authentication
    ) {
        // Kontrol Logları
        System.out.println("Update İsteği Geldi: " + request);
        System.out.println("Gelen About Verisi: " + request.getAbout());

        String email = (String) authentication.getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getDisplayName() != null && !request.getDisplayName().isBlank()) {
            user.setDisplayName(request.getDisplayName());
        }

        // KRİTİK NOKTA: About verisini set ediyoruz
        if (request.getAbout() != null) {
            user.setAbout(request.getAbout());
        }

        if (request.getProfilePictureUrl() != null) {
            user.setProfilePictureUrl(request.getProfilePictureUrl());
        }

        userRepository.save(user);

        return new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.getAbout()
        );
    }

    @GetMapping("/me")
    public UserMeResponse me(Authentication authentication) {
        String email = (String) authentication.getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.getAbout()
        );
    }

    @GetMapping("/online")
    public Set<Long> onlineUsers() {
        return presenceService.getOnlineUsers();
    }

    @GetMapping("/{userId}")
    public UserListItem getUserPublicInfo(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        return new UserListItem(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.getAbout(),
                user.getPhoneNumber()
        );
    }
}