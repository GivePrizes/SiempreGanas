// ========== ARCHIVO 5: Servicios Auth ==========

// backend/auth-service/src/main/java/com/siempregana/auth/service/UsuarioService.java

package com.siempregana.auth.service;

import com.siempregana.auth.entity.Usuario;
import com.siempregana.auth.repository.UsuarioRepository;
import com.siempregana.auth.dto.UsuarioResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UsuarioService {
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    public UsuarioResponse obtenerUsuarioById(Long id) {
        Usuario usuario = usuarioRepository.findByIdActivo(id)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return convertToDTO(usuario);
    }
    
    public UsuarioResponse obtenerUsuarioByCorreo(String correo) {
        Usuario usuario = usuarioRepository.findByCorreo(correo)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return convertToDTO(usuario);
    }
    
    public List<UsuarioResponse> obtenerTodosActivos() {
        return usuarioRepository.findAllActivos()
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    public boolean existeCorreo(String correo) {
        return usuarioRepository.countByCorreo(correo) > 0;
    }
    
    private UsuarioResponse convertToDTO(Usuario usuario) {
        UsuarioResponse dto = new UsuarioResponse();
        dto.setId(usuario.getId());
        dto.setNombre(usuario.getNombre());
        dto.setCorreo(usuario.getCorreo());
        dto.setTelefono(usuario.getTelefono());
        dto.setRol(usuario.getRol());
        return dto;
    }
}