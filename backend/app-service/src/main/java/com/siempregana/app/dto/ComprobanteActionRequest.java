//D:\SiempreGanas\backend\app-service\src\main\java\com\siempregana\app\dto\ComprobanteActionRequest.java

public class ComprobanteActionRequest {
    private Long participacion_id;
    private String accion; // APROBAR o RECHAZAR
    private String razon;
    
    public Long getParticipacion_id() { return participacion_id; }
    public void setParticipacion_id(Long participacion_id) { this.participacion_id = participacion_id; }
    
    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }
    
    public String getRazon() { return razon; }
    public void setRazon(String razon) { this.razon = razon; }
}