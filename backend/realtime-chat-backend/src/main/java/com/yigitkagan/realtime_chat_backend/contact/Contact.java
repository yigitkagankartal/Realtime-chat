package com.yigitkagan.realtime_chat_backend.contact;

import com.yigitkagan.realtime_chat_backend.user.User;
import jakarta.persistence.*;

@Entity
@Table(name = "contacts", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"owner_id", "saved_user_id"})
})
public class Contact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "owner_id") // Kim kaydetti? (Sen)
    private User owner;

    @ManyToOne(optional = false)
    @JoinColumn(name = "saved_user_id") // Kimi kaydetti? (Peder)
    private User savedUser;

    @Column(nullable = false)
    private String nickname; // Verdiğin isim (Örn: "Peder")

    // Constructos, Getters, Setters
    public Contact() {}

    public Contact(User owner, User savedUser, String nickname) {
        this.owner = owner;
        this.savedUser = savedUser;
        this.nickname = nickname;
    }

    public Long getId() { return id; }
    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
    public User getSavedUser() { return savedUser; }
    public void setSavedUser(User savedUser) { this.savedUser = savedUser; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
}