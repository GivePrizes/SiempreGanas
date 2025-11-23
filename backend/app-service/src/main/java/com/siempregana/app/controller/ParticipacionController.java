// backend/app-service/src/main/java/com/siempregana/app/controller/ParticipanteController.java

package com.siempregana.app.controller;

import com.siempregana.app.entity.NumeroParticipacion;
import com.siempregana.app.dto.ParticipacionRequest;
import com.siempregana.app.dto.ErrorResponse;
import com.siempregana.app.dto.ApiResponse;
import com.siempregana.app.service.ParticipanteService;
import com.siempregana.app.repository.NumeroParticipacionRepository;
import com.siempregana.app.config.JwtConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/participante")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ParticipacionController {

    @Autowired
    private ParticipanteService participanteService;

    @Autowired
    private NumeroParticipacionRepository numeroParticipacionRepository;

    @Autowired
    private JwtConfig jwtConfig;

    @PostMapping("/guardar-numeros")
    public ResponseEntity<?> guardarNumeros(
        @RequestHeader("Authorization") String token,
        @RequestBody ParticipacionRequest request) {
        try {
            Long usuarioId = jwtConfig.extractUserId(token);
            NumeroParticipacion participacion = participanteService.guardarNumero(request, usuarioId);
            return ResponseEntity.status(HttpStatus.CREATED).body(participacion);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/mis-participaciones")
    public ResponseEntity<?> misParticipaciones(
        @RequestHeader("Authorization") String token) {
        try {
            Long usuarioId = jwtConfig.extractUserId(token);
            List<NumeroParticipacion> participaciones = numeroParticipacionRepository.findByUsuarioId(usuarioId);
            return ResponseEntity.ok(participaciones);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(e.getMessage()));
        }
    }
}