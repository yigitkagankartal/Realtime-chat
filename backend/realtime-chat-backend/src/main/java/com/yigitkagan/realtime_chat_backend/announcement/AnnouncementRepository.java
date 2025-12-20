package com.yigitkagan.realtime_chat_backend.announcement;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    // ⚠️ DİKKAT: Metot ismi tam olarak bu olmalı. Harf hatası olursa çalışmaz.
    List<Announcement> findAllByOrderByCreatedAtAsc();
}