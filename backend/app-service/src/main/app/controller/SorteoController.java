@RestController
@RequestMapping("/api/sorteos")
public class SorteoController {
    
    @GetMapping
    public ResponseEntity<?> listar() {
        // Retornar todos los sorteos activos
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable Long id) {
        // Retornar sorteo específico con stats
    }
    
    @GetMapping("/{id}/numeros-ocupados")
    public ResponseEntity<?> numerosOcupados(@PathVariable Long id) {
        // Retornar lista de números ya participados
    }
    
    @PostMapping
    @RolesAllowed("ADMIN")
    public ResponseEntity<?> crear(@Valid @RequestBody SorteoRequest req) {
        // Admin crea nuevo sorteo
    }
}
