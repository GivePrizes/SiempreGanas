// RegistroRequest.java
//D:\SiempreGanas\backend\auth-service\src\main\java\com\siempregana\auth\dto\RegistroRequest.java

public class RegistroRequest {
    private String nombre;
    private String correo;
    private String telefono;
    private String password;
    
    // Getters y Setters
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}