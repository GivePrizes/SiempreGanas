//========== DTOs ==========
//D:\SiempreGanas\backend\auth-service\src\main\java\com\siempregana\auth\dto\AuthResponse.java

// AuthResponse.java
public class AuthResponse {
    private String token;
    private String refreshToken;
    private UsuarioDTO usuario;
    private String message;
    
    public AuthResponse(String token, String refreshToken, UsuarioDTO usuario) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.usuario = usuario;
        this.message = "Autenticación exitosa";
    }
    
    // Getters y Setters
    public String getToken() { return token; }
    public String getRefreshToken() { return refreshToken; }
    public UsuarioDTO getUsuario() { return usuario; }
    public String getMessage() { return message; }
}