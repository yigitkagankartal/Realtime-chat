package com.yigitkagan.realtime_chat_backend.announcement;

import com.yigitkagan.realtime_chat_backend.user.Role;
import com.yigitkagan.realtime_chat_backend.user.User;
import com.yigitkagan.realtime_chat_backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/announcements")
public class AnnouncementController {

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private UserRepository userRepository;

    // WebSocket ile canlı bildirim atmak için (İleride frontend'e bağlayacağız)
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // 1. Tüm Duyuruları Getir (Herkese Açık)
    @GetMapping
    public List<Announcement> getAllAnnouncements() {
        return announcementRepository.findAllByOrderByCreatedAtDesc();
    }

    // 2. Yeni Duyuru Oluştur (SADECE ADMIN)
    @PostMapping
    public ResponseEntity<?> createAnnouncement(@RequestBody Announcement announcement, @RequestParam Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        // Rol Kontrolü: Senin User.java'daki Enum yapına göre
        if (user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).body("Bu işlem için yetkiniz yok. Sadece ADMIN duyuru atabilir.");
        }

        Announcement savedAnnouncement = announcementRepository.save(announcement);

        // (Opsiyonel) Canlı bildirim gönder
        // messagingTemplate.convertAndSend("/topic/announcements", savedAnnouncement);

        return ResponseEntity.ok(savedAnnouncement);
    }

    // 3. Tepki Ver (Reaction) - Kullanıcılar için
    @PostMapping("/{id}/react")
    public ResponseEntity<?> reactToAnnouncement(@PathVariable Long id,
                                                 @RequestParam Long userId,
                                                 @RequestParam String emoji) {

        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Duyuru bulunamadı"));

        // Aynı kullanıcı aynı emojiyle tekrar tepki verirse silebiliriz (toggle mantığı)
        // Şimdilik basitçe ekleme yapıyoruz:

        Reaction reaction = new Reaction();
        reaction.setAnnouncement(announcement);
        reaction.setUserId(userId);
        reaction.setEmoji(emoji);

        // Listeye ekle
        announcement.getReactions().add(reaction);

        // Kaydet (CascadeType.ALL olduğu için reaction da kaydedilir)
        announcementRepository.save(announcement);

        return ResponseEntity.ok(announcement);
    }
}