# Cens15_Panel_Admin
Panel de administración para la aplicación de gestión para el CENS 15

## Ambientes

Instalar dependencias antes de iniciar:

```powershell
pnpm install --frozen-lockfile
```

### Frontend Local + API Local

Iniciar primero el backend desde `Cens15_V2` con `dotnet run`.

```powershell
# API: https://localhost:7000/api
pnpm run dev:local-api
```

Alias equivalente:

```powershell
pnpm run web:local-api
```

### Frontend Local + API Productiva

```powershell
# API: https://api.cens15.tierradelfuego.edu.ar/api
pnpm run dev:prod-api
```

Alias equivalente:

```powershell
pnpm run web:prod-api
```

### Build De Producción

```powershell
pnpm run build:prod
```

El resultado se genera en `build`. No muestra el indicador de ambiente.
