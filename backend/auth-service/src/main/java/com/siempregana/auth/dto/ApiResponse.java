// ApiResponse.java
//D:\SiempreGanas\backend\auth-service\src\main\java\com\siempregana\auth\dto\ApiResponse.java 

public class ApiResponse {
    private String message;
    
    public ApiResponse(String message) {
        this.message = message;
    }
    
    public String getMessage() { return message; }
}