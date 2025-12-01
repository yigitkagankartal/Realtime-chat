package com.yigitkagan.realtime_chat_backend.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "activation_codes")
public class ActivationCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private boolean used = false;

    @Column
    private Instant usedAt;

    @Column
    private String usedByPhone; // hangi telefon kullandı (log için)

    public ActivationCode() {}

    public ActivationCode(String code) {
        this.code = code;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public boolean isUsed() {
        return used;
    }

    public Instant getUsedAt() {
        return usedAt;
    }

    public String getUsedByPhone() {
        return usedByPhone;
    }

    public void setUsed(boolean used) {
        this.used = used;
    }

    public void setUsedAt(Instant usedAt) {
        this.usedAt = usedAt;
    }

    public void setUsedByPhone(String usedByPhone) {
        this.usedByPhone = usedByPhone;
    }
}
