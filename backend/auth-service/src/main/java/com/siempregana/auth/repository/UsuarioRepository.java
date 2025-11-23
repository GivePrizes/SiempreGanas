// ========== ARCHIVO 2: Auth Service Repository ==========

// backend/auth-service/src/main/java/com/siempregana/auth/repository/UsuarioRepository.java

package com.siempregana.auth.repository;

import com.siempregana.auth.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    
    @Query("SELECT u FROM Usuario u WHERE u.correo = ?1 AND u.habilitado = true")
    Optional<Usuario> findByCorreo(String correo);
    
    @Query("SELECT u FROM Usuario u WHERE u.id = ?1 AND u.habilitado = true")
    Optional<Usuario> findByIdActivo(Long id);
    
    @Query("SELECT u FROM Usuario u WHERE u.habilitado = true")
    List<Usuario> findAllActivos();
    
    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.correo = ?1")
    Integer countByCorreo(String correo);
    
    @Query("SELECT u FROM Usuario u WHERE u.rol = 'ADMIN'")
    List<Usuario> findAllAdmins();
    
    @Query("SELECT u FROM Usuario u WHERE u.habilitado = false")
    List<Usuario> findAllDeshabilitados();
}