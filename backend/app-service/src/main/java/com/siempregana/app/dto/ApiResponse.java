// backend/app-service/src/main/java/com/siempregana/app/dto/ApiResponse.java

package com.siempregana.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse {
    private String message;
    private long timestamp;

    public ApiResponse(String message) {
        this.message = message;
        this.timestamp = System.currentTimeMillis();
    }
}
