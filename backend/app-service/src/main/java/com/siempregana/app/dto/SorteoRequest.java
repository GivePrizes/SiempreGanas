// backend/app-service/src/main/java/com/siempregana/app/dto/SorteoRequest.java

package com.siempregana.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SorteoRequest {
    private String descripcion;
    private String premio;
    private Integer cantidad_numeros;
    private Double precio_numero;
    private LocalDateTime fecha_sorteo;
}
