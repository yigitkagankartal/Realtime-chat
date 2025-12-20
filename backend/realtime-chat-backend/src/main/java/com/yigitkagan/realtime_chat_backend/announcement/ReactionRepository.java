package com.yigitkagan.realtime_chat_backend.announcement;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ReactionRepository extends JpaRepository<Reaction, Long> {
    // DÜZELTME: 'Announcement' nesnesinin 'Id' alanına gitmek için "Announcement_Id" yazıyoruz.
    Optional<Reaction> findByAnnouncement_IdAndUserIdAndEmoji(Long announcementId, Long userId, String emoji);
}