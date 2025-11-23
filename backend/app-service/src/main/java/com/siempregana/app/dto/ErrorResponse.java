//D:\SiempreGanas\backend\app-service\src\main\java\com\siempregana\app\dto\ErrorRenponse.java
// backend/app-service/src/main/java/com/siempregana/app/dto/ErrorResponse.java

package com.siempregana.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
    private String error;
    private long timestamp;

    public ErrorResponse(String error) {
        this.error = error;
        this.timestamp = System.currentTimeMillis();
    }
}