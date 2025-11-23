// ========== ARCHIVO 1: DTOs Corregidos para App Service ==========

// backend/app-service/src/main/java/com/siempregana/app/dto/SorteoResponse.java

package com.siempregana.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SorteoResponse {
    private Long id;
    private String descripcion;
    private String premio;
    private Integer cantidad_numeros;
    private Double precio_numero;
    private LocalDateTime fecha_sorteo;
    private Boolean activo;
    private Integer numero_ganador;
    private Integer disponibles;
    private Integer ocupados;
}