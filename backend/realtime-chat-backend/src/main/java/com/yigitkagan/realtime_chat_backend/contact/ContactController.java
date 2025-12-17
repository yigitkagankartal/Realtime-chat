package com.yigitkagan.realtime_chat_backend.contact;

import com.yigitkagan.realtime_chat_backend.user.User;
import com.yigitkagan.realtime_chat_backend.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;

    public ContactController(ContactRepository contactRepository, UserRepository userRepository) {
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<Void> saveContact(@RequestBody ContactDto request, Authentication authentication) {
        String email = (String) authentication.getPrincipal();
        User currentUser = userRepository.findByEmail(email).orElseThrow();

        User targetUser = userRepository.findById(request.userId())
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (currentUser.getId().equals(targetUser.getId())) {
            throw new RuntimeException("Kendinizi rehbere ekleyemezsiniz.");
        }

        Optional<Contact> existing = contactRepository.findByOwnerIdAndSavedUserId(currentUser.getId(), targetUser.getId());

        if (existing.isPresent()) {
            Contact contact = existing.get();
            contact.setNickname(request.nickname());
            contactRepository.save(contact);
        } else {
            Contact contact = new Contact(currentUser, targetUser, request.nickname());
            contactRepository.save(contact);
        }

        return ResponseEntity.ok().build();
    }
}