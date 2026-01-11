package com.yigitkagan.realtime_chat_backend.message;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {
    // Bu kullanıcı bu mesaja daha önce tepki vermiş mi?
    Optional<MessageReaction> findByMessageIdAndUserId(Long messageId, Long viewerId);
}