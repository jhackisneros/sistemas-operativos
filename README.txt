# sistemas-operativos1) ¿Qué es el “monitor” en tu sistema?

Tu monitor es la clase SistemaAtencion porque:

Tiene recursos compartidos: _taxis, _clientes, _cola_solicitudes, _historial_viajes, _eventos_admin, etc.

Protege esos recursos con un lock: self._lock = threading.Lock()

Coordina la concurrencia con semáforos:

self._sem_solicitudes (contador de solicitudes pendientes)

cliente.sem_asignacion (señal 1-por-cliente para “ya te asigné”)

✅ En examen puedes decir: “Uso un monitor (lock) para exclusión mutua y semáforos para sincronización por eventos (llegan solicitudes / se asigna respuesta).”

2) Hilos que existen (y qué hace cada uno)
Hilos internos del monitor (los importantes)

_hilo_atencion → target=_bucle_atencion

Espera solicitudes en cola clásica.

Hace el match cliente→taxi.

Desbloquea al cliente con cliente.sem_asignacion.release().

_hilo_simulacion → target=_bucle_simulacion

Avanza el reloj simulado.

Reduce tiempo_restante.

Finaliza viajes automáticamente y libera taxis.

Lanza demanda automática (_simular_demanda_automatica).

Llama a cierre_contable() cuando hay finalizaciones.

Ojo (detalle que te pueden preguntar)

Tienes dos definiciones de Taxi/Cliente:

En sistema.py son objetos normales (NO hilos).

En taxi.py y cliente.py son Threads.

En tu main.py y api.py estás usando los de sistema.py (from .sistema import Taxi, Cliente).
👉 Si la profe pregunta, di: “En esta versión la concurrencia principal la llevan los hilos del monitor; los Taxi/Cliente hilo eran una variante.”

3) Semáforos: cuáles, para qué y por qué
A) self._sem_solicitudes (en el monitor)

Inicial: 0

Cliente solicita → release()

Hilo atención espera → acquire()

✅ Objetivo: que el hilo de atención duerma si no hay trabajo (sin busy-wait) y se despierte solo cuando llega una solicitud.

B) cliente.sem_asignacion (por cliente)

Inicial: 0

Cliente espera: acquire()

Sistema responde: release()

✅ Objetivo: sincronización directa cliente ↔ sistema: el cliente no continúa hasta que haya resultado (taxi o fallo).

4) DÓNDE está el “MATCH” y cómo lo haces
MATCH 1 (cola clásica): cliente → taxi

Está aquí:

_bucle_atencion() llama a:

_obtener_siguiente_solicitud()

_seleccionar_taxi_para(cliente) ✅ aquí está la lógica de match

Lógica de match (resumen):

Lista taxis libres (not t.ocupado)

Calcula distancia taxi-cliente

Filtra “cerca” (<= 2.0) si hay

Ordena por (distancia asc, rating desc)

Elige el primero

Lo marca ocupado dentro del lock (taxi_elegido.ocupado = True) ✅ evita doble asignación

MATCH 2 (tipo Uber): viaje desde origen → taxi

Está aquí:

crear_viaje_desde_lugares(origen, destino)

llama a _seleccionar_taxi_para_posicion(ox, oy)

Importante (detalle fino de concurrencia):
En _seleccionar_taxi_para_posicion NO marcas el taxi como ocupado ahí mismo (solo lo eliges).
Luego lo marcas ocupado más tarde dentro de crear_viaje_desde_lugares.

📌 Si dos peticiones llegan “casi a la vez”, podrían elegir el mismo taxi antes de marcarlo ocupado.
➡️ En examen, si te preguntan cómo lo evitarías:
“Marco ocupado=True dentro del mismo lock en la selección, igual que en la cola clásica.”

5) Pseudocódigo (estilo examen)
5.1. Inicialización (main)
CREAR_ESCENARIO(N_taxis):
    sistema ← nuevo SistemaAtencion()
    repetir i=1..N_taxis:
        taxi ← Taxi(id=i, pos aleatoria, rating aleatorio)
        taxi.ocupado ← False
        registrar_taxi(taxi)
    sistema.iniciar()   // lanza hilo_atencion y hilo_simulacion

5.2. Cola clásica: cliente pide taxi
SOLICITAR_TAXI(cliente):
    lock(monitor)
        cola_solicitudes.push(cliente)
    unlock
    sem_solicitudes.signal()  // hay trabajo para el hilo de atención

5.3. Hilo de atención (match + respuesta)
BUCLE_ATENCION():
    mientras no detener:
        sem_solicitudes.wait()
        si detener: salir

        cliente ← pop(cola_solicitudes)   // bajo lock
        taxi ← seleccionar_taxi_para(cliente)

        si taxi existe:
            asignaciones.add(cliente.id, taxi.id)
            cliente.taxi_asignado ← taxi
        si no:
            cliente.taxi_asignado ← None

        cliente.sem_asignacion.signal()   // desbloquea al cliente

5.4. Selección del taxi (match real)
SELECCIONAR_TAXI_PARA(cliente):
    lock
        libres ← taxis con ocupado=False
        si libres vacío: return None

        candidatos ← libres con distancia<=2
        si candidatos vacío: candidatos ← libres

        ordenar candidatos por (distancia asc, rating desc)
        elegido ← candidatos[0]
        elegido.ocupado ← True   // CLAVE: dentro del lock
    unlock
    return elegido

5.5. Crear viaje “Uber”
CREAR_VIAJE(origen, destino):
    si origen/destino inválidos: return error

    taxi ← seleccionar_taxi_para_posicion(origen)
    si taxi=None: return "sin_taxis" + espera_estimada

    lock
        crear registro viaje (pendiente, tiempo_restante=5, tarifa=...)
        taxi.ocupado ← True
        taxi.total_bruto += tarifa
        taxi.viajes_realizados++
        guardar viaje en historial
    unlock
    return viaje

5.6. Hilo simulación (tiempo + finalización)
BUCLE_SIMULACION():
    mientras no detener:
        sleep(0.2)
        lock
            minutos_simulados++

            para cada viaje en historial:
                si estado = pendiente o aceptado:
                    tiempo_restante--
                    si tiempo_restante<=0:
                        estado ← finalizado
                        liberar taxi (ocupado=False)
                        marcar "hacer_cierre" = True
        unlock

        si hacer_cierre: cierre_contable()
        simular_demanda_automatica()

5.7. Cierre contable (20%)
CIERRE_CONTABLE():
    lock
        para cada taxi:
            si total_bruto > 0:
                comision = 20% bruto
                neto = bruto - comision
                acumular neto y comision
                reset total_bruto=0
    unlock
    return resumen

6) Preguntas típicas de profe (respuestas cortas)

1) ¿Dónde está el match?
En _seleccionar_taxi_para(cliente) y en _seleccionar_t




A) Monitor / exclusión mutua / secciones críticas

1) ¿Qué es el monitor en tu proyecto?
SistemaAtencion, porque centraliza recursos compartidos y los protege con self._lock.

2) ¿Qué recursos son críticos?
_taxis, _clientes, _cola_solicitudes, _historial_viajes, _asignaciones, _eventos_admin, reloj simulado (_minutos_simulados).

3) ¿Qué significa “sección crítica” aquí?
Código dentro de with self._lock: que no puede ejecutarse concurrentemente porque modifica estado compartido.

4) ¿Por qué el lock es necesario aunque uses semáforos?
El semáforo sincroniza “cuándo hay trabajo”, pero no protege estructuras (listas/flags). El lock asegura coherencia.

5) ¿Qué pasaría si quitas el lock en _taxis?
Condiciones de carrera: dos hilos pueden asignar el mismo taxi, o leer una lista mientras se modifica.

6) ¿Cómo garantizas consistencia al liberar taxis?
Se hace bajo lock en _bucle_simulacion y en finalizar_viaje/cancelar_viaje al poner t.ocupado=False.

7) ¿Qué tipo de lock es? ¿Reentrante?
Es un threading.Lock() no reentrante (un mismo hilo no debería adquirirlo 2 veces seguidas).

B) Semáforos (binario vs contador) y sincronización

8) ¿Qué semáforos usas?

self._sem_solicitudes (global)

cliente.sem_asignacion (por cliente)

9) ¿_sem_solicitudes es binario o contador?
Contador (counting semaphore). Puede acumular varios release() si llegan muchas solicitudes.

10) ¿cliente.sem_asignacion es binario o contador?
En uso es binario (evento): empieza en 0, se hace 1 release() para desbloquear 1 vez al cliente.

11) ¿Qué significa inicializar un semáforo a 0?
Que el hilo que haga acquire() queda bloqueado hasta que otro haga release().

12) ¿Por qué no inicializas sem_asignacion a 1?
Porque el cliente no debe avanzar sin respuesta. Si fuese 1, no esperaría y leería taxi_asignado=None.

13) ¿Qué problema evita sem_solicitudes?
Evita busy-wait: el hilo de atención duerme si no hay trabajo.

14) ¿Dónde están los wait/signal en tu código?
acquire() = wait, release() = signal.

C) Hilos: quién corre y qué hace

15) ¿Cuántos hilos reales hay en ejecución?
Mínimo 2 del monitor: HiloSistemaAtencion y HiloSimulacionViajes, más los hilos de Flask (servidor) según configuración.

16) ¿Qué hace el hilo de atención?
Consume solicitudes de la cola y realiza el match (cliente→taxi), luego despierta al cliente.

17) ¿Qué hace el hilo de simulación?
Simula paso del tiempo, decrementa tiempo_restante, finaliza viajes y libera taxis, dispara cierres y demanda automática.

18) ¿Qué significa daemon=True en los hilos?
Que no bloquean el fin del programa: si el hilo principal termina, estos hilos no lo impiden.

19) ¿Puede haber starvation (hambre)?
En cola clásica se atiende FIFO por pop(0), pero en la selección un taxi con mejor cercanía/rating puede ser elegido más a menudo (otros podrían trabajar menos).

D) Match / criterios / decisiones

20) ¿Cuál es el criterio exacto del match?
Primero filtras taxis libres, luego prefieres los cercanos (≤2.0). Ordenas por distancia asc y rating desc.

21) ¿Qué pasa si no hay taxis cerca?
Se usan todos los taxis libres (fallback).

22) ¿Qué pasa si no hay taxis libres?

Cola clásica: se registra evento de fallo y el cliente recibe “sin taxi”.

Uber: devuelves ok=False con tiempo_espera_min=20.

23) ¿Dónde se marca ocupado un taxi?

Cola clásica: dentro de _seleccionar_taxi_para sí.

Uber: se marca en crear_viaje_desde_lugares dentro del lock (pero el elegido se obtuvo antes).

E) Condiciones de carrera (te preguntan mucho esto)

24) Señala una race condition posible en tu código.
En la versión Uber: _seleccionar_taxi_para_posicion devuelve un taxi sin marcarlo ocupado; dos threads podrían elegir el mismo taxi antes de marcarlo.

25) ¿Cómo la arreglarías?
Mover taxi_elegido.ocupado=True a _seleccionar_taxi_para_posicion dentro del lock (igual que la clásica).

26) ¿Por qué en la clásica no pasa?
Porque se selecciona y se marca ocupado en la misma sección crítica con lock.

27) ¿Qué problema puede dar admin_test_sin_taxis usando s._lock y s._taxis?
Es “intrusivo” (toca internals). Funciona para test, pero en diseño ideal sería un método del monitor (encapsulación).

F) Deadlock / livelock / bloqueo

28) ¿Tienes deadlock?
No hay un patrón claro de deadlock porque usas un solo lock y no hay adquisición múltiple en cadena.

29) ¿Dónde podría bloquearse indefinidamente un cliente?
Si el hilo de atención nunca hace cliente.sem_asignacion.release() (por ejemplo, si se cae antes). En tu bucle sí lo hace siempre tras procesar.

30) ¿Puede bloquearse el hilo de atención?
Sí, se bloquea en _sem_solicitudes.acquire() cuando no hay solicitudes (espera correcta).

31) ¿Y el hilo de simulación?
No: duerme con sleep y sigue.

G) Busy-wait vs espera bloqueante

32) ¿Dónde evitas busy-wait?
En el hilo de atención con semáforo _sem_solicitudes en lugar de while cola vacía.

33) ¿Hay algún busy-wait en taxis/clientes?
No, todo es con sleep o semáforos.

H) Consistencia de estados (ocupado, viajes, finalización)

34) Estados del viaje y transición
pendiente → aceptado → finalizado o pendiente/aceptado → cancelado.

35) ¿Qué pasa si finalizas un viaje ya finalizado?
finalizar_viaje lo detecta y devuelve False.

36) ¿Quién libera el taxi y cuándo?

Manual: finalizar_viaje y cancelar_viaje.

Auto: _bucle_simulacion al llegar tiempo_restante<=0.

37) ¿Qué problema podría haber si finalizas manual y el simulador también?
Doble liberación no rompe mucho porque ocupado=False repetido, pero podría duplicar eventos/cierre si no controlas bien estados. Tú compruebas estado.

I) Cierre contable y concurrencia

38) ¿Cuándo se aplica la comisión del 20%?
Cuando llamas cierre_contable(): al finalizar manual o cuando el simulador detecta finalizaciones automáticas.

39) ¿Por qué haces cierre_contable() fuera del lock en simulación?
Para no bloquear el hilo de simulación mucho tiempo (aunque cierre_contable vuelve a coger el lock internamente).

40) ¿Qué protege el lock en el cierre contable?
Que nadie modifique total_bruto/total_neto/total_comision mientras calculas y reseteas.

J) Orden / justicia / FIFO

41) ¿La cola clásica respeta orden de llegada?
Sí: append + pop(0).

42) ¿Hay prioridad?
No hay prioridad explícita por cliente; pero sí preferencias en selección de taxi (distancia/rating).

K) Preguntas de “por qué lo has hecho así”

43) ¿Por qué separas “cola clásica” y “modo Uber”?
Para mostrar dos modelos: asignación centralizada por cola vs creación de viajes directos por API.

44) ¿Por qué registras eventos admin?
Para trazabilidad: ver decisiones del monitor (asignación, fallos, cierres, finalizaciones).

45) ¿Qué significa “snapshot” y por qué lo haces con lock?
Snapshot = copia consistente del estado; se usa lock para que no cambie a mitad de lectura.

L) Preguntas trampas (te las pueden tirar)

46) ¿El GIL de Python elimina problemas de concurrencia?
No. Evita ejecutar bytecode en paralelo real, pero sigue habiendo intercalados y race conditions si no sincronizas estado.

47) ¿sleep es sincronización?
No es sincronización correcta; solo pausa. La sincronización real la haces con semáforos/lock.

48) ¿Tu lock es justo (fair)?
No necesariamente. threading.Lock() no garantiza fairness.

49) ¿Por qué no usas Condition?
Porque el patrón es sencillo: semáforo para “hay solicitudes” y lock para exclusión. Un Condition también serviría, pero no es imprescindible.

Mini-chuleta final (para decirlo rápido)

Monitor: SistemaAtencion + Lock protege estructuras y estado (ocupado, listas, historial).

Semáforos: _sem_solicitudes (contador), sem_asignacion (binario por cliente).

Match: selección por distancia y rating; en clásica marca ocupado=True dentro del lock.

Riesgo: en modo Uber, para ser perfecto, marcar ocupado dentro de _seleccionar_taxi_para_posicion.

Hilos: atención (consume cola) + simulación (tiempo, finaliza, libera, cierre, demanda).



0) Mapa mental rápido de TU sistema (para ubicarte)
Recursos compartidos (estado global)

_taxis, _clientes, _cola_solicitudes, _historial_viajes, _asignaciones, _eventos_admin

Campos de taxi: ocupado, contadores económicos, rating

Reloj: _minutos_simulados, _dias_simulados

Mecanismos de sincronización

Monitor: self._lock en SistemaAtencion

Semáforo contador: self._sem_solicitudes (número de solicitudes pendientes)

Semáforo binario “evento”: cliente.sem_asignacion (respuesta a un cliente)

Hilos

HiloSistemaAtencion: consume cola, hace match clásico.

HiloSimulacionViajes: avanza tiempo, finaliza viajes, libera taxis, hace cierre contable, genera demanda.

1) ¿Dónde está el match? (Extendido)
Respuesta “pro”

El match (emparejamiento) es la decisión de qué taxi asigno a un cliente/viaje, siguiendo un criterio. En tu código hay dos match distintos:

MATCH A: “cola clásica” (cliente → taxi)

Está en:

_bucle_atencion() (decide que toca atender)

_seleccionar_taxi_para(cliente) (elige taxi) ✅ aquí está el match real

Qué hace exactamente _seleccionar_taxi_para(cliente)

Entra al lock (sección crítica) → nadie más puede tocar la lista de taxis a la vez.

Saca taxis libres: taxis_libres = [t for t in self._taxis if not t.ocupado]

Calcula distancia taxi-cliente.

Si hay taxis a ≤2.0 de distancia → usa esos (candidatos cerca).

Si no, usa todos los libres.

Ordena por:

distancia (menor primero)

rating (mayor primero)

Elige el primero y lo marca ocupado=True dentro del lock.

👉 Es match “por proximidad + calidad”.

MATCH B: “modo Uber” (origen/destino → taxi)

Está en:

crear_viaje_desde_lugares(origen, destino) (flujo completo)

_seleccionar_taxi_para_posicion(x,y) (elige taxi)

Qué hace en modo Uber

Convierte lugares a coordenadas LOCACIONES

Busca taxi cerca del origen (≤2.0, si no, cualquiera)

Si no hay, devuelve espera estimada

Si hay, crea un viaje en _historial_viajes, marca taxi ocupado, etc.

Pregunta típica extra: “¿Qué criterio de match usas y por qué?”

Respuesta
Uso distancia para minimizar tiempo de recogida, y rating como segundo criterio para priorizar mejor servicio cuando están a la misma distancia.

2) ¿Cómo evitas que dos clientes cojan el mismo taxi? (Extendido)
Respuesta “pro”

Lo evito con exclusión mutua (lock) y con la regla:
✅ “La selección + marcar taxi ocupado ocurre dentro de la misma sección crítica.”

En la cola clásica está bien protegido

En _seleccionar_taxi_para(cliente):

Entro al lock

Elijo taxi

Inmediatamente hago taxi_elegido.ocupado = True dentro del lock

Salgo del lock

👉 Eso impide que otro hilo vea ese taxi como libre al mismo tiempo.

Ojo: en modo Uber hay un detalle de carrera

En _seleccionar_taxi_para_posicion(x,y) tú:

eliges taxi bajo lock

pero NO lo marcas ocupado ahí

luego en crear_viaje_desde_lugares lo marcas ocupado más tarde

Riesgo: si dos peticiones entran casi simultáneas:

ambas podrían “ver” el mismo taxi como libre y elegirlo antes de marcarlo ocupado.

Cómo lo explicas en el examen (muy buena respuesta)

“En la cola clásica está asegurado porque marco ocupado=True en la misma sección crítica de selección.
En la versión Uber, para ser totalmente seguro, movería el ocupado=True al método de selección _seleccionar_taxi_para_posicion, igual que la clásica, para que la elección sea atómica.”

👉 Esto es top en examen porque muestras que entiendes el bug y la solución.

Pregunta extra: “¿Qué significa ‘atómico’ aquí?”

Respuesta
Que “seleccionar taxi” y “reservarlo” sea un único paso indivisible desde el punto de vista de otros hilos.

3) ¿Por qué semáforo y no while(cola vacía)? (Extendido)
Respuesta “pro”

Porque un while cola vacía implica busy-wait:

el hilo estaría comprobando continuamente “¿hay algo?” consumiendo CPU

es ineficiente y no escala

Con semáforo, haces espera bloqueante:

si no hay solicitudes → el hilo se duerme (acquire())

cuando llega una solicitud → otro hilo hace release() y lo despierta

Dónde se ve en tu código

Cliente encola: self._sem_solicitudes.release() en solicitar_taxi

Hilo de atención espera: self._sem_solicitudes.acquire() en _bucle_atencion

Pregunta extra: “¿Ese semáforo es binario o contador?”

_sem_solicitudes es contador

puede acumular 5 release() si entran 5 clientes rápido

el hilo hará 5 acquire() y atenderá 5 veces

4) ¿Qué protege el lock? (Extendido)
Respuesta “pro”

El lock protege cualquier dato compartido que pueda ser leído/escrito por varios hilos, para evitar:

lecturas inconsistentes (ver estado a medias)

escrituras solapadas (race)

estructuras corruptas

En tu código protege:

_taxis y el flag t.ocupado

_cola_solicitudes

_historial_viajes

_eventos_admin

_asignaciones

_minutos_simulados, _dias_simulados

campos económicos por taxi en cierre_contable

👉 En examen puedes decir:

“Protege la coherencia del estado global del sistema.”

Pregunta extra: “¿Por qué no proteges solo ‘ocupado’?”

Porque el problema no es solo ocupado: también hay listas y registros de viajes/eventos que deben ser coherentes.

5) MÁS PREGUNTAS (muy típicas) + RESPUESTAS EXTENDIDAS
5.1) “¿Cuál es la diferencia entre sincronización y exclusión mutua?”

Exclusión mutua: evitar que dos hilos modifiquen el mismo recurso a la vez (lock).

Sincronización: coordinar el orden (primero A, luego B) (semáforo).

En tu sistema:

Lock = exclusión mutua

Semáforos = sincronización (hay solicitudes / ya hay respuesta)

5.2) “¿Qué semáforos usas y qué representan?”

_sem_solicitudes:

representa “número de solicitudes pendientes”

es global al monitor

cliente.sem_asignacion:

representa “ya tengo respuesta para este cliente”

es por-cliente (evento individual)

5.3) “¿Por qué sem_asignacion empieza en 0?”

Porque es un patrón de “espera a evento”:

Cliente se bloquea

El sistema lo desbloquea cuando termina de asignar

Si empezara en 1, el cliente seguiría sin esperar y leería taxi_asignado antes de que se rellene.

5.4) “¿Qué pasa si hago release() antes de que el cliente haga acquire()?”

En semáforos, la señal no se pierde:

el contador sube a 1

cuando el cliente haga acquire() no se bloqueará

Eso está bien para evitar “perder notificaciones”.

5.5) “¿Qué es un ‘snapshot’ y por qué lo haces con lock?”

Snapshot = una “foto” consistente del estado para el frontend.

Si no usas lock:

podrías leer taxis de una lista mientras otro hilo los modifica

o leer viaje mitad actualizado

Tu snapshot hace:

with self._lock: return copia(...)
y eso da consistencia.

5.6) “¿Qué estados tiene un viaje y cómo cambia?”

En tu diccionario de viaje:

pendiente → aceptado (por aceptar_viaje)

pendiente/aceptado → finalizado (por simulación o manual)

pendiente/aceptado → cancelado (por cancelar_viaje)

✅ Además controlas:

no finalizas si ya estaba finalizado

no cancelas si ya estaba finalizado/cancelado

5.7) “¿Qué hilo libera taxis?”

Dos sitios:

Simulación: cuando tiempo_restante <= 0

Manual: finalizar_viaje / cancelar_viaje

Todo eso ocurre bajo lock → coherente.

5.8) “¿Puedes tener deadlock?”

Con tu diseño actual es difícil, porque:

hay un único lock principal

no haces adquisición múltiple de locks en cadena (no hay orden de locks)

Lo que sí hay es bloqueo esperado en semáforos (espera correcta), no deadlock.

5.9) “¿Puede haber inanición (starvation)?”

En la cola no: FIFO (pop(0))

Pero en selección de taxi:

si siempre hay taxis “mejores” (cerca + rating), algunos pueden recibir más viajes que otros (no es starvation estricta, pero sí desigualdad)

5.10) “¿Qué significa daemon=True en tus hilos?”

Que no evitan que el proceso termine:

si el main termina, los daemon threads se cierran

Ideal para demo/simulación.

5.11) “¿El GIL de Python evita carreras?”

No. Aunque Python tenga GIL, los hilos se intercalan y:

puedes leer estado inconsistente

puedes tener carreras lógicas
Por eso igualmente usas locks.

5.12) “¿Qué patrón de productor-consumidor tienes?”

Tu cola clásica es un productor-consumidor:

Productor: solicitar_taxi (mete cliente y hace release)

Consumidor: _bucle_atencion (hace acquire y saca de cola)

5.13) “¿Qué invariantes (reglas) mantienes?”

Ejemplos de invariantes buenas para decir:

Si taxi.ocupado=False entonces puede ser seleccionado.

Un viaje finalizado/cancelado no debería volver a aceptado.

cierre_contable debe dejar total_bruto=0 después de aplicar comisión.

5.14) “¿Cuál es la complejidad del match?”

Filtrar taxis libres: O(n)

Ordenar candidatos: O(n log n)

Para pocos taxis está bien; si escalara, usarías estructuras (heap/kd-tree), etc.

6) Preguntas de mejora / diseño (te hacen quedar muy bien)
6.1) “¿Qué mejorarías para que el modo Uber sea 100% seguro?”

Hacer el match atómico:

marcar ocupado=True dentro de _seleccionar_taxi_para_posicion bajo lock
igual que en _seleccionar_taxi_para.

6.2) “¿Qué usarías si quisieras un monitor ‘más formal’?”

Un Condition:

while cola vacía: cond.wait()

al encolar: cond.notify()

Pero tu semáforo ya lo resuelve de forma simple.

6.3) “¿Cómo evitarías tocar atributos privados desde API admin (s._lock, s._taxis)?“

Crear un método del monitor tipo:

forzar_ocupar_todos_taxis() y restaurar_estado()
para mantener encapsulación.

7) Lista extra de preguntas “rápidas” que pueden caer (y tú contestas en 1 frase)

¿Qué es un semáforo binario? → contador que se usa como 0/1 (evento/mutex).

¿Qué es un semáforo contador? → puede representar N recursos o N señales acumuladas.

¿Qué es una race condition? → resultado depende del orden de ejecución entre hilos.

¿Qué es exclusión mutua? → solo 1 hilo en sección crítica.

¿Qué es sincronización? → ordenar acciones entre hilos.

¿Qué es starvation? → un hilo nunca progresa por prioridades/planificación.

¿Qué es busy-wait? → esperar consumiendo CPU con bucles.

¿Qué es un monitor? → lock + estado + métodos que lo protegen.