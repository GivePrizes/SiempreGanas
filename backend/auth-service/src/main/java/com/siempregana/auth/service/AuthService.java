package com.siempregana.auth.service;

import com.siempregana.auth.dto.LoginRequest;
import com.siempregana.auth.dto.RegistroRequest;
import com.siempregana.auth.dto.AuthResponse;
import com.siempregana.auth.dto.UsuarioDTO;
import com.siempregana.auth.model.Usuario;
import com.siempregana.auth.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.sql.Timestamp;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UsuarioRepository usuarioRepository;
    
    @Autowired
    private JwtTokenService jwtTokenService;
    
    @Autowired
    private PasswordService passwordService;

    public AuthResponse registro(RegistroRequest request) throws Exception {
        // Validaciones
        if (request.getNombre() == null || request.getNombre().isEmpty()) {
            throw new Exception("El nombre es requerido");
        }
        
        if (request.getCorreo() == null || request.getCorreo().isEmpty()) {
            throw new Exception("El correo es requerido");
        }
        
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            throw new Exception("La contraseña debe tener al menos 8 caracteres");
        }
        
        // Verificar si el correo ya existe
        Optional<Usuario> existente = usuarioRepository.findByCorreo(request.getCorreo());
        if (existente.isPresent()) {
            throw new Exception("El correo ya está registrado");
        }
        
        // Crear nuevo usuario
        Usuario usuario = new Usuario();
        usuario.setNombre(request.getNombre());
        usuario.setCorreo(request.getCorreo());
        usuario.setTelefono(request.getTelefono());
        usuario.setPassword_hash(passwordService.hashPassword(request.getPassword()));
        usuario.setRol("USER");
        usuario.setHabilitado(true);
        usuario.setCreated_at(new Timestamp(System.currentTimeMillis()));
        usuario.setUltima_actualizacion(new Timestamp(System.currentTimeMillis()));
        
        // Guardar en BD
        Usuario usuarioGuardado = usuarioRepository.save(usuario);
        
        // Generar tokens
        String token = jwtTokenService.generateToken(usuarioGuardado);
        String refreshToken = jwtTokenService.generateRefreshToken(usuarioGuardado);
        
        // Crear DTO
        UsuarioDTO usuarioDTO = new UsuarioDTO(
            usuarioGuardado.getId(),
            usuarioGuardado.getNombre(),
            usuarioGuardado.getCorreo(),
            usuarioGuardado.getTelefono(),
            usuarioGuardado.getRol()
        );
        
        return new AuthResponse(token, refreshToken, usuarioDTO);
    }

    public AuthResponse login(LoginRequest request) throws Exception {
        // Validaciones
        if (request.getCorreo() == null || request.getCorreo().isEmpty()) {
            throw new Exception("El correo es requerido");
        }
        
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new Exception("La contraseña es requerida");
        }
        
        // Buscar usuario por correo
        Optional<Usuario> usuarioOpt = usuarioRepository.findByCorreo(request.getCorreo());
        if (!usuarioOpt.isPresent()) {
            throw new Exception("Correo o contraseña incorrectos");
        }
        
        Usuario usuario = usuarioOpt.get();
        
        // Verificar si está habilitado
        if (!usuario.isHabilitado()) {
            throw new Exception("Usuario deshabilitado");
        }
        
        // Verificar contraseña
        if (!passwordService.verifyPassword(request.getPassword(), usuario.getPassword_hash())) {
            throw new Exception("Correo o contraseña incorrectos");
        }
        
        // Generar tokens
        String token = jwtTokenService.generateToken(usuario);
        String refreshToken = jwtTokenService.generateRefreshToken(usuario);
        
        // Crear DTO
        UsuarioDTO usuarioDTO = new UsuarioDTO(
            usuario.getId(),
            usuario.getNombre(),
            usuario.getCorreo(),
            usuario.getTelefono(),
            usuario.getRol()
        );
        
        return new AuthResponse(token, refreshToken, usuarioDTO);
    }

    public boolean validateToken(String token) {
        try {
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }
            return jwtTokenService.validateToken(token);
        } catch (Exception e) {
            return false;
        }
    }

    public AuthResponse refreshToken(String token) throws Exception {
        try {
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }
            
            Usuario usuario = jwtTokenService.extractUsuario(token);
            if (usuario == null) {
                throw new Exception("Token inválido");
            }
            
            String newToken = jwtTokenService.generateToken(usuario);
            String newRefreshToken = jwtTokenService.generateRefreshToken(usuario);
            
            UsuarioDTO usuarioDTO = new UsuarioDTO(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getTelefono(),
                usuario.getRol()
            );
            
            return new AuthResponse(newToken, newRefreshToken, usuarioDTO);
        } catch (Exception e) {
            throw new Exception("No se puede refrescar el token: " + e.getMessage());
        }
    }
}