// ========== ARCHIVO 1: Auth Service Models ==========

// backend/auth-service/src/main/java/com/siempregana/auth/entity/Usuario.java

package com.siempregana.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 255)
    private String nombre;
    
    @Column(nullable = false, unique = true, length = 255)
    private String correo;
    
    @Column(length = 20)
    private String telefono;
    
    @Column(nullable = false)
    private String password_hash;
    
    @Column(nullable = false, length = 20)
    private String rol = "USER"; // USER, ADMIN
    
    @Column(nullable = false)
    private Boolean habilitado = true;
    
    @Column(name = "created_at")
    private LocalDateTime created_at;
    
    @Column(name = "ultima_actualizacion")
    private LocalDateTime ultima_actualizacion;
    
    @PrePersist
    protected void onCreate() {
        created_at = LocalDateTime.now();
        ultima_actualizacion = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        ultima_actualizacion = LocalDateTime.now();
    }
}