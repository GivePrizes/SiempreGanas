package com.siempregana.auth.service;

import com.siempregana.auth.model.Usuario;
import com.siempregana.auth.repository.UsuarioRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class JwtTokenService {

    @Value("${jwt.secret:tu_clave_secreta_super_segura_123456789}")
    private String jwtSecret;
    
    @Value("${jwt.expiration:86400000}") // 24 horas
    private long jwtExpirationMs;
    
    @Value("${jwt.refresh-expiration:604800000}") // 7 días
    private long jwtRefreshExpirationMs;
    
    @Autowired
    private UsuarioRepository usuarioRepository;

    public String generateToken(Usuario usuario) {
        return Jwts.builder()
            .setSubject(String.valueOf(usuario.getId()))
            .claim("correo", usuario.getCorreo())
            .claim("nombre", usuario.getNombre())
            .claim("rol", usuario.getRol())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
            .signWith(SignatureAlgorithm.HS512, jwtSecret)
            .compact();
    }

    public String generateRefreshToken(Usuario usuario) {
        return Jwts.builder()
            .setSubject(String.valueOf(usuario.getId()))
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + jwtRefreshExpirationMs))
            .signWith(SignatureAlgorithm.HS512, jwtSecret)
            .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Long extractUserId(String token) {
        try {
            Claims claims = Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token).getBody();
            return Long.parseLong(claims.getSubject());
        } catch (Exception e) {
            return null;
        }
    }

    public Usuario extractUsuario(String token) {
        try {
            Long usuarioId = extractUserId(token);
            if (usuarioId != null) {
                Optional<Usuario> usuario = usuarioRepository.findById(usuarioId);
                return usuario.orElse(null);
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

    public String getCorreoFromToken(String token) {
        try {
            Claims claims = Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token).getBody();
            return claims.get("correo", String.class);
        } catch (Exception e) {
            return null;
        }
    }
}