package com.yigitkagan.realtime_chat_backend.announcement;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    // Duyuruları en yeniden eskiye doğru sırala
    List<Announcement> findAllByOrderByCreatedAtDesc();
}