# 📖 Manual de Usuario - Q-Pass Central

Bienvenido a tu plataforma de gestión de boletos y accesos. Este manual te ayudará a entender cómo operar el sistema y cómo gestionar las ganancias de tu negocio.

---

## 1. Gestión de Eventos y Pistas
En el **Panel de Administración**, puedes crear nuevos eventos o dar de alta pistas de bolera.

### Campos del Formulario:
*   **Nombre del Evento:** El título que verán los clientes (ej: "Reserva Pista 5 - 8:00 PM").
*   **Capacidad Máxima:** El número total de boletos disponibles. Una vez se alcance este número, el sistema bloqueará la venta.
*   **Precio por Boleto:** El valor total que pagará el cliente final.
*   **Fechas de Visibilidad:** Controla cuándo aparece y cuándo desaparece el evento de tu página principal.

---

## 2. Configuración de Ganancias (Comisiones)
Q-Pass te permite automatizar el cálculo de tus ingresos frente a los de tus clientes.

*   **Tu Comisión (%):** Es el porcentaje del precio total que tú te quedas por el servicio.
    *   *Ejemplo:* Si el boleto cuesta $100 y pones 10%, tú ganas $10.
*   **Fee Fijo ($):** Es un monto extra en pesos que cobras por cada boleto, sin importar el precio.
    *   *Ejemplo:* Si pones $5, ganarás esos $5 adicionales por cada venta.

---

## 3. Entendiendo el Dinero (Dashboard)
En el **Dashboard**, verás un desglose en tiempo real con lenguaje profesional:

1.  **Recaudación Total:** Todo el dinero recolectado de los clientes.
2.  **Pasarela de Pago (Externo):** Lo que la pasarela (Stripe) se queda por procesar el pago (aprox. 3.6% + $3 MXN).
3.  **Comisión Q-Pass:** Tu ganancia por el servicio (basada en el % y fee fijo configurado).
4.  **Monto a Liquidar:** El dinero neto que debes transferir al dueño de la bolera/evento.

> [!TIP]
> Puedes exportar estos datos a **Excel** en cualquier momento usando el botón de exportación en el Dashboard para rendir cuentas a tus clientes.

---

## 4. Control de Accesos (Check-in)
Cuando los clientes lleguen al lugar:
1.  Ellos presentan su **Código QR** (que les llegó por correo o descargaron al pagar).
2.  Tú usas la página de **Check-in** (escanear QR) para validar el boleto.
3.  Si el QR es válido, el sistema marcará al asistente como "Ingresó" y no podrá usar el mismo código otra vez.

---

## 5. Cuentas de Prueba Registradas
- **Checador**: `puerta1@qpass.com` / `QPASSChecador!`
- **Organizador**: `gerenteprueba@gmail.com` / `QPASSGerente!`
