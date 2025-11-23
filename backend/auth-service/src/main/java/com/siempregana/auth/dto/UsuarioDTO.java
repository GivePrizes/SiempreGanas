//========== DTOs ==========
//D:\SiempreGanas\backend\auth-service\src\main\java\com\siempregana\auth\dto\UsuarioDTO.java

// UsuarioDTO.java
public class UsuarioDTO {
    private Long id;
    private String nombre;
    private String correo;
    private String telefono;
    private String rol;
    
    public UsuarioDTO(Long id, String nombre, String correo, String telefono, String rol) {
        this.id = id;
        this.nombre = nombre;
        this.correo = correo;
        this.telefono = telefono;
        this.rol = rol;
    }
    
    // Getters
    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getCorreo() { return correo; }
    public String getTelefono() { return telefono; }
    public String getRol() { return rol; }
}