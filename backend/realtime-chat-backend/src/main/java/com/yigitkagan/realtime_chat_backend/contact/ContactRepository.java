package com.yigitkagan.realtime_chat_backend.contact;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ContactRepository extends JpaRepository<Contact, Long> {
    // Benim kaydettiğim tüm kişiler
    List<Contact> findByOwnerId(Long ownerId);

    // Spesifik bir kişiyi bul (zaten kayıtlı mı diye bakmak için)
    Optional<Contact> findByOwnerIdAndSavedUserId(Long ownerId, Long savedUserId);
}