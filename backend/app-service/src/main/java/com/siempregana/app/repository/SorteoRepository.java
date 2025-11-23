// ========== ARCHIVO 4: App Service Repositories ==========

// backend/app-service/src/main/java/com/siempregana/app/repository/SorteoRepository.java

package com.siempregana.app.repository;

import com.siempregana.app.entity.Sorteo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SorteoRepository extends JpaRepository<Sorteo, Long> {
    
    @Query("SELECT s FROM Sorteo s WHERE s.activo = true ORDER BY s.fecha_sorteo ASC")
    List<Sorteo> findAllActivos();
    
    @Query("SELECT s FROM Sorteo s WHERE s.id = ?1 AND s.activo = true")
    Optional<Sorteo> findByIdActivo(Long id);
    
    @Query("SELECT COUNT(s) FROM Sorteo s WHERE s.activo = true")
    Integer countActivos();
    
    @Query("SELECT s FROM Sorteo s WHERE s.activo = false")
    List<Sorteo> findAllInactivos();
    
    @Query("SELECT s FROM Sorteo s ORDER BY s.created_at DESC")
    List<Sorteo> findAllOrderByDate();
}