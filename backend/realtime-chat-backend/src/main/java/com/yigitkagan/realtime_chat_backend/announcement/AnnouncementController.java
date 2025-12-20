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

    // ✅ DÜZELTME 1: Bu satır eksikti, bu yüzden "cannot find symbol" diyordu.
    @Autowired
    private ReactionRepository reactionRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // 1. Tüm Duyuruları Getir (Herkese Açık - ASC Sıralı)
    @GetMapping
    public List<Announcement> getAllAnnouncements() {
        return announcementRepository.findAllByOrderByCreatedAtAsc();
    }

    // 2. Yeni Duyuru Oluştur (SADECE ADMIN)
    @PostMapping
    public ResponseEntity<?> createAnnouncement(@RequestBody Announcement announcement, @RequestParam Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).body("Bu işlem için yetkiniz yok. Sadece ADMIN duyuru atabilir.");
        }

        Announcement savedAnnouncement = announcementRepository.save(announcement);
        return ResponseEntity.ok(savedAnnouncement);
    }

    // 3. Tepki Ver / Geri Al
    @PostMapping("/{id}/react")
    public ResponseEntity<Void> reactToAnnouncement(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestParam String emoji
    ) {
        // ✅ DÜZELTME 2: Reaction'a ID değil, Nesne (Announcement) vermemiz lazım.
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Duyuru bulunamadı"));

        // ReactionRepository içindeki metot ismine dikkat (findByAnnouncement_Id...)
        Optional<Reaction> existingReaction = reactionRepository.findByAnnouncement_IdAndUserIdAndEmoji(id, userId, emoji);

        if (existingReaction.isPresent()) {
            // VARSA SİL (Geri al)
            reactionRepository.delete(existingReaction.get());
        } else {
            // YOKSA EKLE
            Reaction reaction = new Reaction();

            // ✅ DÜZELTME 3: setAnnouncementId yerine setAnnouncement
            reaction.setAnnouncement(announcement);
            reaction.setUserId(userId);
            reaction.setEmoji(emoji);

            reactionRepository.save(reaction);
        }

        return ResponseEntity.ok().build();
    }

    // 4. Duyuru Silme (Sadece Admin)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable Long id, @RequestParam Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        if (user.getRole() != Role.ADMIN) return ResponseEntity.status(403).body("Yetkisiz işlem");

        announcementRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // 5. Duyuru Düzenleme (Sadece Admin)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAnnouncement(@PathVariable Long id, @RequestParam Long userId, @RequestBody String newContent) {
        User user = userRepository.findById(userId).orElseThrow();
        if (user.getRole() != Role.ADMIN) return ResponseEntity.status(403).body("Yetkisiz işlem");

        Announcement announcement = announcementRepository.findById(id).orElseThrow();
        announcement.setContent(newContent);
        return ResponseEntity.ok(announcementRepository.save(announcement));
    }
}