// ========== ARCHIVO 2: Controllers Corregidos ==========

// backend/app-service/src/main/java/com/siempregana/app/controller/SorteoController.java

package com.siempregana.app.controller;

import com.siempregana.app.entity.Sorteo;
import com.siempregana.app.dto.SorteoResponse;
import com.siempregana.app.dto.ErrorResponse;
import com.siempregana.app.dto.ApiResponse;
import com.siempregana.app.service.SorteoService;
import com.siempregana.app.repository.SorteoRepository;
import com.siempregana.app.repository.NumeroParticipacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sorteos")
@CrossOrigin(origins = "*", maxAge = 3600)
public class SorteoController {

    @Autowired
    private SorteoService sorteoService;

    @Autowired
    private SorteoRepository sorteoRepository;

    @Autowired
    private NumeroParticipacionRepository numeroParticipacionRepository;

    @GetMapping
    public ResponseEntity<List<SorteoResponse>> obtenerSorteos() {
        try {
            List<SorteoResponse> sorteos = sorteoService.obtenerSorteosActivos();
            return ResponseEntity.ok(sorteos);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerSorteo(@PathVariable Long id) {
        try {
            SorteoResponse sorteo = sorteoService.obtenerSorteoById(id);
            return ResponseEntity.ok(sorteo);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/{id}/numeros-ocupados")
    public ResponseEntity<?> obtenerNumerosOcupados(@PathVariable Long id) {
        try {
            List<Integer> numeros = numeroParticipacionRepository.findNumerosOcupados(id);
            Sorteo sorteo = sorteoRepository.findById(id)
                .orElseThrow(() -> new Exception("Sorteo no encontrado"));
            
            return ResponseEntity.ok(new Object() {
                public Long sorteo_id = id;
                public List<Integer> numeros_ocupados = numeros;
                public Integer total_disponibles = sorteo.getCantidad_numeros() - numeros.size();
                public Integer total_ocupados = numeros.size();
            });
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> crearSorteo(@RequestBody Sorteo sorteo) {
        try {
            Sorteo guardado = sorteoRepository.save(sorteo);
            return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(e.getMessage()));
        }
    }
}