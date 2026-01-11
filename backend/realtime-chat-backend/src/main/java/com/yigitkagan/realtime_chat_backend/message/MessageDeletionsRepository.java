package com.yigitkagan.realtime_chat_backend.message;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface MessageDeletionsRepository extends JpaRepository<Message, Long> {
    // Not: MessageDeletions entity'si oluşturmadık, native query ile hallediyoruz
    // Pratik çözüm.

    @Query(value = "SELECT COUNT(*) > 0 FROM message_deletions WHERE message_id = :messageId AND user_id = :userId", nativeQuery = true)
    boolean existsByMessageIdAndUserId(Long messageId, Long userId);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO message_deletions (message_id, user_id) VALUES (:messageId, :userId)", nativeQuery = true)
    void insertDeletion(Long messageId, Long userId);
}