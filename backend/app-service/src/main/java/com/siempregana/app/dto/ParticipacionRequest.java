// backend/app-service/src/main/java/com/siempregana/app/dto/ParticipacionRequest.java

package com.siempregana.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParticipacionRequest {
    private Long sorteo_id;
    private Integer numero;
    private String comprobante_url;
}
