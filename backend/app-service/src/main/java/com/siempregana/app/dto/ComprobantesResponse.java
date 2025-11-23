// backend/app-service/src/main/java/com/siempregana/app/dto/ComprobantesResponse.java

package com.siempregana.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComprobantesResponse {
    private Long id;
    private String usuario_correo;
    private Integer numero;
    private String sorteo_descripcion;
    private String estado;
    private String comprobante_url;
    private LocalDateTime fecha_participacion;
}