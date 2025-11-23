// backend/app-service/src/main/java/com/siempregana/app/entity/NumeroParticipacion.java

package com.siempregana.app.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "numero_participacion")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NumeroParticipacion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "sorteo_id", nullable = false)
    private Sorteo sorteo;
    
    @Column(nullable = false)
    private Integer numero;
    
    @Column(nullable = false)
    private Long usuario_id;
    
    @Column(length = 50)
    private String estado = "PENDIENTE"; // PENDIENTE, APROBADO, RECHAZADO
    
    @Column(columnDefinition = "TEXT")
    private String comprobante_url;
    
    @Column(name = "created_at")
    private LocalDateTime created_at;
    
    @Column(name = "updated_at")
    private LocalDateTime updated_at;
    
    @PrePersist
    protected void onCreate() {
        created_at = LocalDateTime.now();
        updated_at = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updated_at = LocalDateTime.now();
    }
}
