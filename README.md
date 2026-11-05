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

### Build De Intranet

Desde `Cens15_Panel_Admin`, seleccionar `.env.intranet` al compilar:

```powershell
pnpm run build:intranet
```

El resultado se genera en `build` y muestra el indicador `INTRANET` con la URL real de la API.
`http://{hostname}:8080/api` toma el hostname de la pagina abierta, sin usar su puerto.
Por ejemplo, al abrir `http://192.168.1.50` (o `http://192.168.1.50:3000`),
la API sera `http://192.168.1.50:8080/api`. Ambos sitios y la API deben estar en ese mismo servidor LAN.
No hay que conocer la IP al compilar; no se usa `localhost` para los clientes de la LAN.

Para elegir cualquier otro archivo de ambiente al compilar:

```powershell
pnpm exec env-cmd -f .env.mi-ambiente -- react-scripts build
```

Usar `.env.intranet` como base; se puede reemplazar la plantilla por una URL explicita.
Los valores seleccionados quedan incorporados al build; cambiar el archivo requiere recompilar.
El firewall del servidor debe permitir el puerto de cada sitio y el puerto `8080` de la API.
La API debe permitir los origenes LAN de ambos sitios mediante CORS.
Un sitio HTTPS no puede consumir esta API HTTP sin bloqueo de contenido mixto:
usar HTTP dentro de la LAN o configurar HTTPS tambien para la API y actualizar su URL.
Estos comandos no configuran el servidor ni reinician servicios.

## Transferencia De Datos

Disponible en el menu **Transferencia de datos** (`/transferencias`) solo para el rol
`Admin`. El backend verifica el rol de forma independiente. La pantalla muestra
siempre el ambiente y la URL real de la API de destino, incluso en produccion.

Las importaciones de usuarios, roles o responsabilidades invalidan las sesiones anteriores.
El panel pide iniciar sesion nuevamente al confirmar una de estas operaciones.

1. En el entorno de origen, exportar la seccion deseada como JSON portable V1.
2. Abrir el panel del destino y verificar cuidadosamente su ambiente y URL.
3. Seleccionar la misma seccion y el archivo. Elegir agregar/actualizar (predeterminado,
   no elimina ausentes) o reemplazar globalmente la seccion.
4. Generar vista previa y revisar todas las entidades, prerrequisitos, advertencias
   y errores. Los conteos pueden ser parciales si hay errores; actualizar tambien
   cuenta coincidencias sin cambios. El servidor es la autoridad de validacion.
5. Revisar y confirmar la importacion. Reemplazar exige escribir exactamente
   `REEMPLAZAR`; afecta toda la seccion, no solo un anexo o curso. Descargar antes
   un respaldo del destino con el boton disponible. Un paquete vacio puede vaciar
   la seccion, sujeto a las protecciones del servidor.

Orden recomendado: **docentes -> materias -> horarios**. Se usan claves naturales,
no IDs. Los prerrequisitos faltantes se crean, pero los existentes incompatibles
bloquean la operacion y no se sobrescriben como contexto.

**Alumnos solo transfiere fichas personales activas, contacto y nacimiento.** No
transfiere inscripciones, cursadas, calificaciones, documentos, imagenes,
certificados ni historial academico. El historial existente del destino permanece.
Los reemplazos protegidos se bloquean si ocultarian o eliminarian relaciones.
Usuarios transfiere perfiles (email, nombres, apellidos, activo y rol), nunca
contrasenas, hashes, tokens ni sesiones. Los nuevos usuarios necesitan primer acceso.
Roles transfiere nombres y responsabilidades; responsabilidades transfiere nombres
y descripciones. Cursos incluye anexos y orientaciones como prerrequisitos.
El formato V1 conserva sus ocho listas obligatorias; usuarios, roles y
responsabilidades son listas opcionales, vacias por defecto si no estan presentes.

Cambiar archivo, seccion o modo invalida la vista previa. Un conflicto HTTP 409
muestra el reporte del servidor y exige otra vista previa. Si la conexion falla
durante una importacion, su resultado puede ser desconocido: revisar el destino
y generar otra vista previa, sin asumir que no hubo escrituras. Una importacion
exitosa limpia el archivo para impedir repetirla accidentalmente.

Limites: archivo de hasta 20 MiB menos 4096 bytes, solicitud JSON UTF-8 de hasta
20 MiB y espera dedicada de 120 segundos. Los archivos contienen datos personales:
custodiarlos y compartirlos solo por canales autorizados. No se envian a terceros
ni se agrega metadata de ambiente al formato exportado. No cerrar la pagina
durante la operacion.

## Respaldos Completos Y Checkpoints

La tarjeta **Respaldos completos y puntos de restauracion** es exclusiva de Admin
y esta separada de los JSON portables por seccion. Incluye todos los datos y
relaciones, credenciales bcrypt de las cuentas, historiales, calificaciones, bajas
logicas, plantillas y archivos subidos. Excluye binarios de la aplicacion,
configuracion del servidor y claves JWT. Contiene secretos: custodiar el archivo
cifrado `.censbackup` y su clave por separado, en ubicaciones seguras.

1. **Crear punto** captura el estado completo en el servidor, con nombre y descripcion.
2. **Exportar todo** primero crea un punto y luego pide una clave de al menos 12
   caracteres. **Exportar** sobre un punto existente descarga ese punto cifrado.
3. **Registrar respaldo sin restaurar** envia un `.censbackup` y su clave como
   multipart. Solo registra el punto: nunca modifica automaticamente la base.
4. Buscar puntos por nombre y rango de fechas locales, ordenados del mas reciente
   al mas antiguo. Solo existen los puntos creados o registrados: no hay PITR a una
   fecha arbitraria ni eliminacion automatica desde esta pantalla.
5. **Vista previa / Restaurar** muestra fecha del punto, ambiente y URL del destino,
   conteos actuales y finales snapshot para tablas y archivos, advertencias y errores.
6. Revisar la restauracion y escribir exactamente `RESTAURAR TODO`. La copia de
   seguridad del estado actual esta activada por defecto. Desactivarla exige una
   segunda aceptacion explicita. Si falla esa copia, el servidor debe abortar.

Restaurar sobrescribe globalmente los datos y archivos, no los combina. Requiere un
build con esquema compatible y no revierte migraciones. Una vista previa invalida,
un conflicto 409 o cualquier fallo exige generar otra vista previa. Ante timeout o
perdida de conexion, verificar el destino: el resultado puede ser desconocido y no
se debe asumir rollback ni reintentar silenciosamente.

Tras el exito no se consulta la API con el token invalidado. La pantalla conserva el
mensaje y el ID del respaldo previo y ofrece **Volver a iniciar sesion**, que limpia
la autenticacion local y Redux. Ingresar con las cuentas del snapshot, cuyas
credenciales pueden ser diferentes. Las transferencias por seccion se bloquean
durante operaciones completas y hasta volver a ingresar tras restaurar.

El servicio usa `config.apiBase` y `/checkpoints`, con autenticacion Bearer y un
timeout dedicado de 300 segundos mediante AbortController. Las claves solo viajan
en el cuerpo POST/multipart: no se registran, no van en URL ni se persisten en
localStorage. La UI limpia los campos de clave al enviar o cancelar.

## Vencimiento De Sesion

El vencimiento absoluto `exp` del JWT cierra la sesion automaticamente, limpia
localStorage y Redux, vuelve a Home y abre el login. Se comprueba tambien al
iniciar, al recuperar foco/visibilidad y entre pestanas. Los 401 de peticiones
autenticadas de la API propia cierran la sesion; los 403, fallos de red, errores
de login y llamadas externas no. Una respuesta tardia de un token anterior no
puede cerrar una sesion nueva. La misma regla cubre transferencias, checkpoints
y descargas de certificados.

## Planilla De Parte Docente

En **Grilla de horarios**, usar **Generar Planilla de Parte** para los cursos
visibles, o **Generar parte de este curso** en el membrete de una grilla.

1. Seleccionar los cursos y las semanas del calendario. Se pueden combinar meses;
   una semana compartida por dos meses se incluye una sola vez.
2. Revisar la institucion y, opcionalmente, agregar direccion/localidad/telefono.
   El anexo y los datos del curso provienen de la grilla guardada.
3. Generar la vista previa. Se muestra el PDF real antes de habilitar su descarga.
   La opcion **Quitar colores de fondo** elimina todos los rellenos, incluidos
   encabezados y recesos. Al cambiarla se regenera automaticamente la vista previa
   y se descarga exactamente esa version, con o sin colores.
4. Descargar el PDF e imprimir en **A4 horizontal, tamano real (100%)**.

Cada hoja contiene dos semanas distintas del mismo curso, arriba y abajo, con una
linea de corte a media pagina. Si hay una cantidad impar de semanas, la ultima
mitad queda vacia; nunca se repite una semana ni se mezclan cursos en una hoja.
Los dias incluyen su fecha (por ejemplo Lunes 2), el encabezado muestra el mes y
anio, incluso cuando la semana cruza de mes o de anio.

Cada planilla semanal incluye una unica linea de **Firma del Preceptor** debajo
de la tabla, a la derecha, con espacio propio para firmar. No se agrega una firma
en la mitad vacia cuando la seleccion de semanas es impar.

Se utiliza la semana completa de lunes a viernes, aunque el filtro de pantalla
oculte dias. Incluye materias, docentes activos y roles, colores pastel, recesos
y horas libres. Cada hora asignada reserva 5 mm para la firma manuscrita. No se
infieren asistencias, feriados ni licencias. No se modifican datos de la API.

Cambiar cursos, semanas o datos institucionales invalida la vista previa anterior.
La descarga usa exactamente el archivo mostrado. Si una grilla excepcionalmente
extensa no cabe en media A4 manteniendo los textos y las firmas, la generacion
se bloquea con un mensaje: no se recortan horas/docentes ni se agregan hojas de
continuacion que alteren el formato solicitado.
