// ========== ARCHIVO 6: Servicios App ==========

// backend/app-service/src/main/java/com/siempregana/app/service/SorteoService.java

package com.siempregana.app.service;

import com.siempregana.app.entity.Sorteo;
import com.siempregana.app.dto.SorteoResponse;
import com.siempregana.app.repository.SorteoRepository;
import com.siempregana.app.repository.NumeroParticipacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SorteoService {
    
    @Autowired
    private SorteoRepository sorteoRepository;
    
    @Autowired
    private NumeroParticipacionRepository numeroParticipacionRepository;
    
    public List<SorteoResponse> obtenerSorteosActivos() {
        List<Sorteo> sorteos = sorteoRepository.findAllActivos();
        return sorteos.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    public SorteoResponse obtenerSorteoById(Long id) {
        Sorteo sorteo = sorteoRepository.findByIdActivo(id)
            .orElseThrow(() -> new RuntimeException("Sorteo no encontrado"));
        return convertToDTO(sorteo);
    }
    
    public List<Integer> obtenerNumerosOcupados(Long sorteoId) {
        return numeroParticipacionRepository.findNumerosOcupados(sorteoId);
    }
    
    public Integer obtenerDisponibles(Long sorteoId) {
        Sorteo sorteo = sorteoRepository.findByIdActivo(sorteoId)
            .orElseThrow(() -> new RuntimeException("Sorteo no encontrado"));
        Integer ocupados = numeroParticipacionRepository.findNumerosOcupados(sorteoId).size();
        return sorteo.getCantidad_numeros() - ocupados;
    }
    
    private SorteoResponse convertToDTO(Sorteo sorteo) {
        Integer ocupados = numeroParticipacionRepository.findNumerosOcupados(sorteo.getId()).size();
        
        SorteoResponse dto = new SorteoResponse();
        dto.setId(sorteo.getId());
        dto.setDescripcion(sorteo.getDescripcion());
        dto.setPremio(sorteo.getPremio());
        dto.setCantidad_numeros(sorteo.getCantidad_numeros());
        dto.setPrecio_numero(sorteo.getPrecio_numero());
        dto.setFecha_sorteo(sorteo.getFecha_sorteo());
        dto.setActivo(sorteo.getActivo());
        dto.setNumero_ganador(sorteo.getNumero_ganador());
        dto.setDisponibles(sorteo.getCantidad_numeros() - ocupados);
        dto.setOcupados(ocupados);
        
        return dto;
    }
}
