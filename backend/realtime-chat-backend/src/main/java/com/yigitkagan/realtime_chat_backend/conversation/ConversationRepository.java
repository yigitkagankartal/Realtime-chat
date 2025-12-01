package com.yigitkagan.realtime_chat_backend.conversation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    // Bir kullanıcının içinde olduğu tüm konuşmalar
    List<Conversation> findByUser1IdOrUser2Id(Long user1Id, Long user2Id);

    // İki kullanıcı arasındaki (varsa) konuşmayı bulmak için
    Conversation findFirstByUser1IdAndUser2IdOrUser2IdAndUser1Id(
            Long user1Id, Long user2Id,
            Long user2IdAlt, Long user1IdAlt
    );
}
