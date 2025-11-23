// NumerosResponse.java
//D:\SiempreGanas\backend\app-service\src\main\java\com\siempregana\app\dto\NumerosResponse.java
public class NumerosResponse {
    private List<Integer> numeros_ocupados;
    
    public NumerosResponse(List<Integer> numeros) {
        this.numeros_ocupados = numeros;
    }
    
    public List<Integer> getNumerosOcupados() { return numeros_ocupados; }
}