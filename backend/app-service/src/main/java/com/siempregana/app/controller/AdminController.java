// backend/app-service/src/main/java/com/siempregana/app/controller/AdminController.java

package com.siempregana.app.controller;

import com.siempregana.app.entity.NumeroParticipacion;
import com.siempregana.app.dto.ComprobantesResponse;
import com.siempregana.app.dto.ErrorResponse;
import com.siempregana.app.dto.ApiResponse;
import com.siempregana.app.service.ComprobantesService;
import com.siempregana.app.repository.NumeroParticipacionRepository;
import com.siempregana.app.config.JwtConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AdminController {

    @Autowired
    private ComprobantesService comprobantesService;

    @Autowired
    private JwtConfig jwtConfig;

    @Autowired
    private NumeroParticipacionRepository numeroParticipacionRepository;

    @GetMapping("/comprobantes")
    public ResponseEntity<?> obtenerComprobantes(
        @RequestHeader("Authorization") String token) {
        try {
            jwtConfig.extractUserId(token);
            List<NumeroParticipacion> comprobantes = comprobantesService.obtenerPendientes();
            return ResponseEntity.ok(comprobantes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/comprobantes/aprobar/{id}")
    public ResponseEntity<?> aprobarComprobante(
        @RequestHeader("Authorization") String token,
        @PathVariable Long id) {
        try {
            jwtConfig.extractUserId(token);
            NumeroParticipacion resultado = comprobantesService.aprobarComprobante(id);
            return ResponseEntity.ok(new ApiResponse("Comprobante aprobado"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/comprobantes/rechazar/{id}")
    public ResponseEntity<?> rechazarComprobante(
        @RequestHeader("Authorization") String token,
        @PathVariable Long id,
        @RequestParam String razon) {
        try {
            jwtConfig.extractUserId(token);
            NumeroParticipacion resultado = comprobantesService.rechazarComprobante(id, razon);
            return ResponseEntity.ok(new ApiResponse("Comprobante rechazado"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(e.getMessage()));
        }
    }
}
