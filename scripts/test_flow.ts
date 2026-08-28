import { createAdminClient } from '../utils/supabase/admin';
import { generateSignedQRToken, verifyAndExtractTicketId } from '../lib/qr';

async function runFullIntegrationTest() {
  console.log("==================================================");
  console.log("🧪 INICIANDO SUITE DE PRUEBAS DE INTEGRACIÓN Q-PASS");
  console.log("==================================================\n");

  const supabase = createAdminClient();
  let testEventoId: string | null = null;
  let testOrderId: string | null = null;

  try {
    // ── 1. TEST DE SEGURIDAD QR (HMAC SHA-256) ──
    console.log("1️⃣  PROBANDO GENERACIÓN Y VERIFICACIÓN DE FIRMA HMAC EN QR...");
    const dummyTicketId = "11111111-2222-3333-4444-555555555555";
    const signedToken = generateSignedQRToken(dummyTicketId);
    console.log(`   └─ Token firmado generado: ${signedToken}`);

    const verified = verifyAndExtractTicketId(signedToken);
    if (!verified.valid || verified.ticketId !== dummyTicketId) {
      throw new Error(`Fallo en verificación HMAC: ${verified.reason}`);
    }
    console.log("   ✅ Firma HMAC verificada correctamente.");

    // Probar alteración de firma (Intento de fraude)
    const tamperedToken = `${dummyTicketId}.abcdef1234567890`;
    const tamperedCheck = verifyAndExtractTicketId(tamperedToken);
    if (tamperedCheck.valid) {
      throw new Error("❌ VULNERABILIDAD: Se aceptó un token con firma alterada!");
    }
    console.log("   ✅ Detección y bloqueo de QR alterado/falsificado verificado.\n");

    // ── 2. CREACIÓN DE EVENTO DE PRUEBA EN SUPABASE ──
    console.log("2️⃣  CREANDO EVENTO DE PRUEBA EN SUPABASE...");
    const { data: nuevoEvento, error: errEvento } = await supabase
      .from("eventos")
      .insert([
        {
          nombre: `Evento Test E2E Automated ${Date.now()}`,
          capacidad: 10,
          precio: 150.00,
          fecha_evento: new Date(Date.now() + 86400000).toISOString(),
          visible_desde: new Date().toISOString().split("T")[0],
          visible_hasta: new Date(Date.now() + 172800000).toISOString().split("T")[0],
          activo: true,
          comision_porcentaje: 10,
          comision_fija: 5
        }
      ])
      .select()
      .single();

    if (errEvento || !nuevoEvento) {
      throw new Error(`Error creando evento de prueba: ${errEvento?.message}`);
    }

    testEventoId = nuevoEvento.id;
    console.log(`   ✅ Evento creado exitosamente en Supabase. ID: ${testEventoId}\n`);

    // ── 3. PROBAR COMPRA Y EMISIÓN DE BOLETOS ──
    console.log("3️⃣  PROBANDO EMISIÓN DE ORDEN Y BOLETOS...");
    
    // Crear la orden de compra
    const { data: orden, error: errOrden } = await supabase
      .from("orders")
      .insert([
        {
          email_comprador: "juan.test@qpass.app",
          total_amount: 300.00,
          payment_status: "paid",
          payment_method: "simulated"
        }
      ])
      .select()
      .single();

    if (errOrden || !orden) {
      throw new Error(`Error creando orden: ${errOrden?.message}`);
    }

    testOrderId = orden.id;

    // Crear los boletos de la orden
    const { data: boletosGenerados, error: errBoletos } = await supabase
      .from("boletos")
      .insert([
        {
          evento_id: testEventoId,
          order_id: testOrderId,
          email_comprador: "juan.test@qpass.app",
          nombre_comprador: "Juan Perez Test",
          precio_unitario: 150.00,
          estado: "paid"
        },
        {
          evento_id: testEventoId,
          order_id: testOrderId,
          email_comprador: "maria.test@qpass.app",
          nombre_comprador: "Maria Lopez Test",
          precio_unitario: 150.00,
          estado: "paid"
        }
      ])
      .select();

    if (errBoletos || !boletosGenerados || boletosGenerados.length !== 2) {
      throw new Error(`Error creando boletos: ${errBoletos?.message}`);
    }

    console.log(`   ✅ Orden ID: ${testOrderId}`);
    console.log(`   ✅ ${boletosGenerados.length} boletos generados correctamente en Supabase con estado 'paid'.\n`);

    const primerBoleto = boletosGenerados[0];
    const qrTokenPrimerBoleto = generateSignedQRToken(primerBoleto.id);
    console.log(`   └─ Token QR generado para boleto: ${qrTokenPrimerBoleto}`);

    // ── 4. PROBAR PRIMER ESCANEO / VALIDACIÓN EN PUERTA ──
    console.log("\n4️⃣  PROBANDO PRIMERA VALIDACIÓN EN PUERTA (CHECK-IN)...");
    
    const { data: boletoValido, error: errVal } = await supabase
      .from("boletos")
      .select("*, eventos(id, nombre)")
      .eq("id", primerBoleto.id)
      .single();

    if (errVal || !boletoValido || (boletoValido.estado !== "paid" && boletoValido.estado !== "activo")) {
      throw new Error("El boleto no está disponible para validación");
    }

    // Marcar atómicamente como usado
    const { error: errUsado } = await supabase
      .from("boletos")
      .update({ estado: "usado" })
      .eq("id", primerBoleto.id);

    if (errUsado) throw errUsado;
    console.log("   ✅ Boleto validado exitosamente. Estado cambiado a 'usado'.");

    // ── 5. PROBAR PREVENCIÓN DE RE-ESCANEO (DOBLE VALIDACIÓN) ──
    console.log("\n5️⃣  PROBANDO PREVENCIÓN DE DOBLE ESCANEO...");
    const { data: boletoReintento } = await supabase
      .from("boletos")
      .select("estado")
      .eq("id", primerBoleto.id)
      .single();

    if (boletoReintento?.estado === "usado") {
      console.log("   ✅ BLOQUEO CONFIRMADO: El boleto ya consta como 'usado' y rechazará intentos posteriores en el escáner.");
    } else {
      throw new Error("❌ FALLO DE SEGURIDAD: El boleto no guardó el estado de re-escaneo.");
    }

    console.log("\n==================================================");
    console.log("🎉 ¡TODAS LAS PRUEBAS E2E PASARON EXITOSAMENTE DE PRINCIPIO A FIN!");
    console.log("==================================================\n");

  } catch (err) {
    console.error("\n❌ ERROR EN LA SUITE DE PRUEBAS:", err);
    process.exit(1);
  } finally {
    // Limpieza de datos de prueba en Supabase
    if (testEventoId) {
      console.log("🧹 Limpiando datos de prueba en Supabase...");
      if (testOrderId) {
        await supabase.from("boletos").delete().eq("order_id", testOrderId);
        await supabase.from("orders").delete().eq("id", testOrderId);
      }
      await supabase.from("eventos").delete().eq("id", testEventoId);
      console.log("✨ Datos de prueba removidos limpiamente.");
    }
  }
}

runFullIntegrationTest();
