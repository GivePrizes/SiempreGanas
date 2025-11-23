// backend/app-service/src/main/java/com/siempregana/app/service/ParticipanteService.java

package com.siempregana.app.service;

import com.siempregana.app.entity.Sorteo;
import com.siempregana.app.entity.NumeroParticipacion;
import com.siempregana.app.dto.ParticipacionRequest;
import com.siempregana.app.repository.SorteoRepository;
import com.siempregana.app.repository.NumeroParticipacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ParticipanteService {
    
    @Autowired
    private SorteoRepository sorteoRepository;
    
    @Autowired
    private NumeroParticipacionRepository numeroParticipacionRepository;
    
    public NumeroParticipacion guardarNumero(ParticipacionRequest request, Long usuarioId) {
        Sorteo sorteo = sorteoRepository.findByIdActivo(request.getSorteo_id())
            .orElseThrow(() -> new RuntimeException("Sorteo no encontrado"));
        
        // Validar que el número no esté ocupado
        if (numeroParticipacionRepository.findByNumeroAndSorteo(sorteo.getId(), request.getNumero()).isPresent()) {
            throw new RuntimeException("El número " + request.getNumero() + " ya está ocupado");
        }
        
        NumeroParticipacion participacion = new NumeroParticipacion();
        participacion.setSorteo(sorteo);
        participacion.setNumero(request.getNumero());
        participacion.setUsuario_id(usuarioId);
        participacion.setEstado("PENDIENTE");
        participacion.setComprobante_url(request.getComprobante_url());
        
        return numeroParticipacionRepository.save(participacion);
    }
    
    public List<NumeroParticipacion> obtenerMisParticipaciones(Long usuarioId) {
        return numeroParticipacionRepository.findByUsuarioId(usuarioId);
    }
}