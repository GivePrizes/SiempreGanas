// ParticipacionDTO.java
//D:\SiempreGanas\backend\app-service\src\main\java\com\siempregana\app\dto\ParticipacionDTO.java

public class ParticipacionDTO {
    private Long id;
    private Integer numero;
    private Long sorteo_id;
    private String comprobante_pago;
    private String estado;
    private SorteoDTO sorteo;
    
    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }
    
    public Long getSorteo_id() { return sorteo_id; }
    public void setSorteo_id(Long sorteo_id) { this.sorteo_id = sorteo_id; }
    
    public String getComprobante_pago() { return comprobante_pago; }
    public void setComprobante_pago(String comprobante_pago) { this.comprobante_pago = comprobante_pago; }
    
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    
    public SorteoDTO getSorteo() { return sorteo; }
    public void setSorteo(SorteoDTO sorteo) { this.sorteo = sorteo; }
}