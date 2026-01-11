package com.yigitkagan.realtime_chat_backend.message;

import com.yigitkagan.realtime_chat_backend.conversation.Conversation;
import com.yigitkagan.realtime_chat_backend.user.User;
import jakarta.persistence.*;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Conversation conversation;

    @ManyToOne(optional = false)
    private User sender;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    private boolean readFlag = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MessageStatus status = MessageStatus.SENT;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    @OneToMany(mappedBy = "message", fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    private List<MessageReaction> reactions = new ArrayList<>();

    @Column(name = "deleted_for_everyone")
    private boolean deletedForEveryone = false;


    // basic getters & setters

    public Long getId() {
        return id;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public void setConversation(Conversation conversation) {
        this.conversation = conversation;
    }

    public User getSender() {
        return sender;
    }

    public void setSender(User sender) {
        this.sender = sender;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Instant getCreatedAt() { return createdAt;}

    public Instant getUpdatedAt() { return updatedAt; }

    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public boolean isReadFlag() {
        return readFlag;
    }

    public void setReadFlag(boolean readFlag) {
        this.readFlag = readFlag;
    }

    public MessageStatus getStatus() {
        return status;
    }

    public void setStatus(MessageStatus status) {
        this.status = status;
    }

    public List<MessageReaction> getReactions() { return reactions; }

    public void setReactions(List<MessageReaction> reactions) { this.reactions = reactions; }

    public boolean isDeletedForEveryone() { return deletedForEveryone; }

    public void setDeletedForEveryone(boolean deletedForEveryone) { this.deletedForEveryone = deletedForEveryone; }

}
