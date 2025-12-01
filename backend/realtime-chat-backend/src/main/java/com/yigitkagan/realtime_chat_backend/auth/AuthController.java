package com.yigitkagan.realtime_chat_backend.auth;

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

    @PostMapping("/activate")
    public ResponseEntity<ActivationLoginResponse> activate(
            @RequestBody ActivationLoginRequest request
    ) {
        ActivationLoginResponse response =
                activationAuthService.loginWithActivationCode(request);
        return ResponseEntity.ok(response);
    }
}
