package com.yigitkagan.realtime_chat_backend.auth;

import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginRequest;
import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginResponse;
import com.yigitkagan.realtime_chat_backend.user.User;
import com.yigitkagan.realtime_chat_backend.user.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class ActivationAuthService {

    private final ActivationCodeRepository activationCodeRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public ActivationAuthService(
            ActivationCodeRepository activationCodeRepository,
            UserRepository userRepository,
            JwtService jwtService
    ) {
        this.activationCodeRepository = activationCodeRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    public ActivationLoginResponse loginWithActivationCode(ActivationLoginRequest request) {
        String phone = request.phoneNumber().trim();
        String code = request.activationCode().trim();

        // 1) Kodu bul
        ActivationCode activation = activationCodeRepository
                .findByCode(code)
                .orElseThrow(() -> new RuntimeException("Geçersiz kod."));

        // 2) Kullanım durumuna göre kontrol
        if (activation.isUsed()) {
            // Kod daha önce kullanılmış
            String usedBy = activation.getUsedByPhone();
            if (usedBy == null || !usedBy.equals(phone)) {
                // Farklı bir telefon kullanmaya çalışıyor
                throw new RuntimeException("Bu kod başka bir cihaz tarafından kullanılmış.");
            }
            // Aynı telefon tekrar giriş yapıyor → izin ver, kaydı değiştirmiyoruz
        } else {
            // İlk defa kullanılacak
            activation.setUsed(true);
            activation.setUsedAt(Instant.now());
            activation.setUsedByPhone(phone);
            activationCodeRepository.save(activation);
        }

        // 3) Kullanıcıyı bul / oluştur
        User user = userRepository.findByPhoneNumber(phone)
                .orElseGet(() -> {
                    User u = new User();
                    u.setPhoneNumber(phone);
                    u.setDisplayName("User " + phone);
                    // JWT için subject; email zorunlu olduğu için dummy email
                    u.setEmail(phone + "@phone.local");
                    // password_hash NOT NULL, dummy bir değer veriyoruz
                    u.setPasswordHash("ACTIVATION_LOGIN_DUMMY");
                    return userRepository.save(u);
                });

        // 4) JWT üret
        String token = jwtService.generateToken(user);

        return new ActivationLoginResponse(
                user.getId(),
                user.getDisplayName(),
                user.getPhoneNumber(),
                token
        );
    }
}
