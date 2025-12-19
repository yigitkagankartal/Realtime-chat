package com.yigitkagan.realtime_chat_backend.user;

import com.yigitkagan.realtime_chat_backend.file.FileService;
import com.yigitkagan.realtime_chat_backend.presence.PresenceService;
import com.yigitkagan.realtime_chat_backend.user.UserDTOs.UserListItem;
import com.yigitkagan.realtime_chat_backend.user.UserDTOs.UserMeResponse;
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
            imageUrl = fileService.uploadFile(file);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Resim yüklenirken hata oluştu: " + e.getMessage());
        }

        user.setProfilePictureUrl(imageUrl);
        userRepository.save(user);

        // ✅ GÜNCELLENDİ: Yeni alanlar eklendi
        return ResponseEntity.ok(new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.getAbout(),
                user.isActivated(),
                user.isPhoneNumberVisible(),
                user.getRole().name()
        ));
    }

    // Kullanıcı Listesi (Gizlilik Ayarına Göre Filtreli)
    @GetMapping
    public List<UserListItem> listUsers(Authentication authentication) {
        String currentEmail = (String) authentication.getPrincipal();

        // Admin olup olmadığını kontrol edebiliriz (Opsiyonel)
        // User currentUser = userRepository.findByEmail(currentEmail).orElseThrow();

        return userRepository.findAllByIsActivatedTrue()
                .stream()
                .filter(u -> !u.getEmail().equals(currentEmail))
                .map(u -> {
                    // ✅ GİZLİLİK MANTIĞI:
                    // Eğer kullanıcı numarasını gizlediyse, boş string veya "Gizli" dön.
                    String phoneToSend = u.isPhoneNumberVisible() ? u.getPhoneNumber() : "";

                    return new UserListItem(
                            u.getId(),
                            u.getEmail(),
                            u.getDisplayName(),
                            u.getProfilePictureUrl(),
                            u.getAbout(),
                            phoneToSend // Gizlenmiş veya açık numara
                    );
                })
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

        // ✅ EKLENDİ: Telefon Numarası Görünürlüğü Ayarı
        if (request.getIsPhoneNumberVisible() != null) {
            user.setPhoneNumberVisible(request.getIsPhoneNumberVisible());
        }

        userRepository.save(user);

        // ✅ GÜNCELLENDİ: Response'a yeni alanlar eklendi
        return new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.getAbout(),
                user.isActivated(),
                user.isPhoneNumberVisible(),
                user.getRole().name()
        );
    }

    @GetMapping("/me")
    public UserMeResponse me(Authentication authentication) {
        String email = (String) authentication.getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // ✅ GÜNCELLENDİ
        return new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.getAbout(),
                user.isActivated(),
                user.isPhoneNumberVisible(),
                user.getRole().name()
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

        // ✅ GİZLİLİK MANTIĞI BURADA DA GEÇERLİ
        String phoneToSend = user.isPhoneNumberVisible() ? user.getPhoneNumber() : "";

        return new UserListItem(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.getAbout(),
                phoneToSend
        );
    }
}