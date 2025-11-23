//D:\SiempreGanas\backend\app-service\src\main\java\com\siempregana\app\dto\ErrorRenponse.java  

// ErrorResponse.java
public class ErrorResponse {
    private String error;
    private long timestamp;
    
    public ErrorResponse(String error) {
        this.error = error;
        this.timestamp = System.currentTimeMillis();
    }
    
    public String getError() { return error; }
    public long getTimestamp() { return timestamp; }
}