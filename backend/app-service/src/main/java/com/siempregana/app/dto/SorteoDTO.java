//========== DTOs ==========
//D:\SiempreGanas\backend\app-service\src\main\java\com\siempregana\app\dto\SorteoDTO.java
// SorteoDTO.java
public class SorteoDTO {
    private Long id;
    private String descripcion;
    private String premio;
    private Integer cantidad_numeros;
    private Double precio_numero;
    private Long fecha_sorteo;
    private Boolean activo;
    
    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    
    public String getPremio() { return premio; }
    public void setPremio(String premio) { this.premio = premio; }
    
    public Integer getCantidad_numeros() { return cantidad_numeros; }
    public void setCantidad_numeros(Integer cantidad_numeros) { this.cantidad_numeros = cantidad_numeros; }
    
    public Double getPrecio_numero() { return precio_numero; }
    public void setPrecio_numero(Double precio_numero) { this.precio_numero = precio_numero; }
    
    public Long getFecha_sorteo() { return fecha_sorteo; }
    public void setFecha_sorteo(Long fecha_sorteo) { this.fecha_sorteo = fecha_sorteo; }
    
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}