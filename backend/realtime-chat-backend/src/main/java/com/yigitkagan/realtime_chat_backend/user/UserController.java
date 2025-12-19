package com.yigitkagan.realtime_chat_backend.user;

import com.yigitkagan.realtime_chat_backend.file.FileService;
import com.yigitkagan.realtime_chat_backend.presence.PresenceService;
import com.yigitkagan.realtime_chat_backend.user.UserDTOs.UserListItem;
import com.yigitkagan.realtime_chat_backend.user.UserDTOs.UserMeResponse;
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

        String imageUrl;

        try {
            // HATA VEREN KISIM BURASIYDI, try-catch içine aldık.
            imageUrl = fileService.uploadFile(file);
        } catch (java.io.IOException e) {
            // Eğer Cloudinary'ye yüklerken hata olursa 500 hatası fırlat
            throw new RuntimeException("Resim yüklenirken hata oluştu: " + e.getMessage());
        }

        user.setProfilePictureUrl(imageUrl);
        userRepository.save(user);

        return ResponseEntity.ok(new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.getAbout(),
                user.isActivated()
        ));
    }

    @GetMapping
    public List<UserListItem> listUsers(Authentication authentication) {
        String currentEmail = (String) authentication.getPrincipal();

        return userRepository.findAllByIsActivatedTrue()
                .stream()
                .filter(u -> !u.getEmail().equals(currentEmail))
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

    // Profil güncelleme
    @PutMapping("/me")
    public UserMeResponse updateProfile(
            @RequestBody UpdateProfileRequest request,
            Authentication authentication
    ) {
        String email = (String) authentication.getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getDisplayName() != null && !request.getDisplayName().isBlank()) {
            user.setDisplayName(request.getDisplayName());
        }

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
                user.getAbout(),
                user.isActivated()
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
                user.getAbout(),
                user.isActivated()
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