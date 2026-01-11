package com.yigitkagan.realtime_chat_backend.message;

import com.yigitkagan.realtime_chat_backend.user.User;
import jakarta.persistence.*;

@Entity
@Table(name = "message_reactions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"message_id", "user_id"}) // Aynı kişi aynı mesaja 2 kere tepki veremesin
})
public class MessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "reaction_content", nullable = false)
    private String content; // Emoji buraya gelecek: "❤️", "👍"

    // --- Constructors ---
    public MessageReaction() {
    }

    public MessageReaction(Message message, User user, String content) {
        this.message = message;
        this.user = user;
        this.content = content;
    }

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Message getMessage() { return message; }
    public void setMessage(Message message) { this.message = message; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}