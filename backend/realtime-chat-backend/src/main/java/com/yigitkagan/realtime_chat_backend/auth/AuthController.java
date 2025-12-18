package com.yigitkagan.realtime_chat_backend.auth;

import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.VerifyActivationRequest;
import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginRequest;
import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final ActivationAuthService activationAuthService;

    public AuthController(ActivationAuthService activationAuthService) {
        this.activationAuthService = activationAuthService;
    }

    // 1. Mevcut Login Endpoint'i
    @PostMapping("/activate")
    public ResponseEntity<ActivationLoginResponse> activate(
            @RequestBody ActivationLoginRequest request
    ) {
        ActivationLoginResponse response =
                activationAuthService.loginWithActivationCode(request);
        return ResponseEntity.ok(response);
    }

    // 2. ✅ EKSİK OLAN KISIM: Master Key Doğrulama Endpoint'i
    @PostMapping("/verify-master-key")
    public ResponseEntity<ActivationLoginResponse> verifyMasterKey(
            @RequestBody VerifyActivationRequest request
    ) {
        ActivationLoginResponse response =
                activationAuthService.verifyAccountActivation(request);
        return ResponseEntity.ok(response);
    }
}