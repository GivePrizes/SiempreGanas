// ========== ARCHIVO 3: App Service Models ==========

// backend/app-service/src/main/java/com/siempregana/app/entity/Sorteo.java

package com.siempregana.app.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "sorteos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Sorteo {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 255)
    private String descripcion;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String premio;
    
    @Column(nullable = false)
    private Integer cantidad_numeros;
    
    @Column(nullable = false)
    private Double precio_numero;
    
    @Column(nullable = false)
    private LocalDateTime fecha_sorteo;
    
    @Column(name = "activo")
    private Boolean activo = true;
    
    @Column(name = "numero_ganador")
    private Integer numero_ganador;
    
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