@RestController
@RequestMapping("/api/participante")
public class ParticipanteController {
    
    @PostMapping("/guardar-numeros")
    public ResponseEntity<?> guardarNumeros(
        @RequestHeader("Authorization") String token,
        @RequestParam Long sorteoId,
        @RequestParam String numerosSeleccionados,
        @RequestParam MultipartFile comprobante
    ) {
        // 1. Validar JWT
        // 2. Validar números (max 5)
        // 3. Subir comprobante a Supabase Storage
        // 4. Guardar NumeroParticipacion (estado PENDIENTE)
        // 5. Retornar confirmación
    }
}
