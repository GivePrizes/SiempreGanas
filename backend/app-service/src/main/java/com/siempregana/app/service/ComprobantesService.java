// backend/app-service/src/main/java/com/siempregana/app/service/ComprobantesService.java

package com.siempregana.app.service;

import com.siempregana.app.entity.NumeroParticipacion;
import com.siempregana.app.repository.NumeroParticipacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ComprobantesService {
    
    @Autowired
    private NumeroParticipacionRepository numeroParticipacionRepository;
    
    public List<NumeroParticipacion> obtenerPendientes() {
        return numeroParticipacionRepository.findComprobantePendientes();
    }
    
    public List<NumeroParticipacion> obtenerAprobados() {
        return numeroParticipacionRepository.findComprobanteAprobados();
    }
    
    public NumeroParticipacion aprobarComprobante(Long participacionId) {
        NumeroParticipacion participacion = numeroParticipacionRepository.findById(participacionId)
            .orElseThrow(() -> new RuntimeException("Participación no encontrada"));
        
        participacion.setEstado("APROBADO");
        participacion.setUpdated_at(LocalDateTime.now());
        
        return numeroParticipacionRepository.save(participacion);
    }
    
    public NumeroParticipacion rechazarComprobante(Long participacionId, String razon) {
        NumeroParticipacion participacion = numeroParticipacionRepository.findById(participacionId)
            .orElseThrow(() -> new RuntimeException("Participación no encontrada"));
        
        participacion.setEstado("RECHAZADO");
        participacion.setUpdated_at(LocalDateTime.now());
        
        return numeroParticipacionRepository.save(participacion);
    }
}