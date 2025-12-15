package com.yigitkagan.realtime_chat_backend.auth;

import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginRequest;
import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginResponse;
import com.yigitkagan.realtime_chat_backend.user.User;
import com.yigitkagan.realtime_chat_backend.user.UserRepository;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Optional;

@Service
public class ActivationAuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    public ActivationAuthService(UserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    public ActivationLoginResponse loginWithActivationCode(ActivationLoginRequest request) {
        String rawPhone = request.phoneNumber();
        if (rawPhone == null) rawPhone = "";

        if (rawPhone.matches(".*[^0-9+\\s-].*")) {
            throw new RuntimeException("Telefon numarası sadece rakam içerebilir! Harf girmeyiniz.");
        }
        String phone = rawPhone.replaceAll("[^0-9+]", "");
        String incomingCode = request.activationCode() != null ? request.activationCode().trim() : "";

        if (!phone.matches("^\\+?[0-9]{7,15}$")) {
            throw new RuntimeException("Geçersiz telefon numarası formatı! Lütfen kontrol ediniz.");
        }
        // Şifrenin (Kodun) kurallarını burada belirtmelisin.
        // ÖRNEK: "En az 6 karakter olmalı" kuralı:
        if (incomingCode.length() < 6) {
            throw new RuntimeException("Şifre/Kod en az 6 karakter olmalıdır!");
        }

        // --- BURADAN SONRASI AYNI MANTIK ---

        Optional<User> userOptional = userRepository.findByPhoneNumber(phone);
        User user;

        if (userOptional.isPresent()) {
            // --- KULLANICI ZATEN VAR (Giriş Yapıyor) ---
            user = userOptional.get();
            String currentPassword = user.getPasswordHash();

            // Şifre boşsa veya eşleşmiyorsa hata ver
            if (currentPassword == null || !currentPassword.equals(incomingCode)) {
                throw new RuntimeException("Giriş Başarısız: Bu numara için şifre hatalı.");
            }

            // Başarılı giriş -> Son görülme güncelle
            user.setLastLoginAt(Instant.now());
            userRepository.save(user);

        } else {
            // --- KULLANICI YOK (Yeni Kayıt) ---
            // Numarayı kaydet ve ilk girişteki kodu şifre olarak belirle.
            user = new User();
            user.setPhoneNumber(phone);
            user.setDisplayName(phone); // İsim şimdilik numara olsun
            user.setEmail(phone + "@mobile.chat");
            user.setPasswordHash(incomingCode);

            userRepository.save(user);
        }

        String token = jwtService.generateToken(user);

        return new ActivationLoginResponse(
                user.getId(),
                user.getDisplayName(),
                user.getPhoneNumber(),
                token
        );
    }
}