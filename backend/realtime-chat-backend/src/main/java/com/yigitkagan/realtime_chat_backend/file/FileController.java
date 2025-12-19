package com.yigitkagan.realtime_chat_backend.file;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*") // Render ve Localhost için izin
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        Map<String, String> response = new HashMap<>();

        try {
            // Eski 'disk' işlemleri yerine tek satırda Service'i çağırıyoruz
            String fileUrl = fileService.uploadFile(file);

            // Dönen URL: "https://res.cloudinary.com/..."
            response.put("url", fileUrl);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("error", "Yükleme başarısız: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    // NOT: @GetMapping("/{fileName:.+}") metodunu SİLDİK.
    // Çünkü artık resimleri biz sunmuyoruz, Cloudinary linki üzerinden direkt açılıyor.
}