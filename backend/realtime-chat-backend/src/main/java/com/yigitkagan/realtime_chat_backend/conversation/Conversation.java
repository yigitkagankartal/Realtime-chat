package com.yigitkagan.realtime_chat_backend.conversation;

import com.yigitkagan.realtime_chat_backend.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Sohbetteki iki kullanıcı
    @ManyToOne(optional = false)
    private User user1;

    @ManyToOne(optional = false)
    private User user2;

    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    // --- GETTER / SETTER ---

    public Long getId() {
        return id;
    }

    public User getUser1() {
        return user1;
    }

    public void setUser1(User user1) {
        this.user1 = user1;
    }

    public User getUser2() {
        return user2;
    }

    public void setUser2(User user2) {
        this.user2 = user2;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
