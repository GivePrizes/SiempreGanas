// backend/app-service/src/main/java/com/siempregana/app/repository/NumeroParticipacionRepository.java

package com.siempregana.app.repository;

import com.siempregana.app.entity.NumeroParticipacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface NumeroParticipacionRepository extends JpaRepository<NumeroParticipacion, Long> {
    
    @Query("SELECT n FROM NumeroParticipacion n WHERE n.sorteo.id = ?1 ORDER BY n.numero ASC")
    List<NumeroParticipacion> findBySorteoId(Long sorteoId);
    
    @Query("SELECT n.numero FROM NumeroParticipacion n WHERE n.sorteo.id = ?1 ORDER BY n.numero ASC")
    List<Integer> findNumerosOcupados(Long sorteoId);
    
    @Query("SELECT n FROM NumeroParticipacion n WHERE n.usuario_id = ?1 AND n.sorteo.id = ?2")
    List<NumeroParticipacion> findByUsuarioAndSorteo(Long usuarioId, Long sorteoId);
    
    @Query("SELECT n FROM NumeroParticipacion n WHERE n.usuario_id = ?1 ORDER BY n.created_at DESC")
    List<NumeroParticipacion> findByUsuarioId(Long usuarioId);
    
    @Query("SELECT n FROM NumeroParticipacion n WHERE n.estado = 'PENDIENTE' ORDER BY n.created_at ASC")
    List<NumeroParticipacion> findComprobantePendientes();
    
    @Query("SELECT n FROM NumeroParticipacion n WHERE n.estado = 'APROBADO' ORDER BY n.created_at DESC")
    List<NumeroParticipacion> findComprobanteAprobados();
    
    @Query("SELECT COUNT(n) FROM NumeroParticipacion n WHERE n.sorteo.id = ?1 AND n.usuario_id = ?2")
    Integer countParticipacionesUsuario(Long sorteoId, Long usuarioId);
    
    @Query("SELECT COUNT(n) FROM NumeroParticipacion n WHERE n.sorteo.id = ?1")
    Integer countTotalParticipaciones(Long sorteoId);
    
    @Query("SELECT n FROM NumeroParticipacion n WHERE n.sorteo.id = ?1 AND n.numero = ?2")
    Optional<NumeroParticipacion> findByNumeroAndSorteo(Long sorteoId, Integer numero);
}