import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const colors = {
  primary: '#0891b2',
  primaryDark: '#0e7490',
  secondary: '#0f172a',
  accent: '#14b8a6',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  textLight: '#64748b',
  textLighter: '#94a3b8',
  success: '#10b981',
  successLight: '#d1fae5',
};

const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    fontFamily: 'Helvetica',
  },
  container: {
    margin: 30,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.secondary,
    padding: 25,
    borderBottomWidth: 4,
    borderBottomColor: colors.primary,
  },
  logo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  logoSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 5,
  },
  eventBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
  },
  eventBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  eventTitle: {
    marginTop: 15,
  },
  eventName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  body: {
    padding: 25,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 25,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  qrLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textLight,
    letterSpacing: 2,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 15,
  },
  infoCard: {
    width: '48%',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 11,
    color: colors.text,
    fontWeight: 'semibold',
  },
  perforatedLine: {
    marginVertical: 20,
    height: 2,
    backgroundColor: colors.border,
    borderStyle: 'dashed',
  },
  instructions: {
    backgroundColor: colors.successLight,
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  instructionsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  instructionsText: {
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.4,
  },
  footer: {
    backgroundColor: colors.secondary,
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 1,
  },
  footerHighlight: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});

interface Evento {
  nombre?: string;
  fecha_evento?: string;
  precio?: number;
  comision_porcentaje?: number;
  comision_fija?: number;
}

interface TicketData {
  id: string;
}

export const TicketPDF = ({ ticketData, evento, qrCodeBase64, asistente }: { 
  ticketData: TicketData; 
  evento: Evento; 
  qrCodeBase64: string;
  asistente: { nombreCompleto: string, email: string };
}) => {
  const fechaFormateada = evento?.fecha_evento ? new Date(evento.fecha_evento).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Fecha por confirmar';

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.container}>
          <View style={pdfStyles.header}>
            <View style={pdfStyles.logo}>
              <View>
                <Text style={pdfStyles.logoText}>Q-PASS</Text>
                <Text style={pdfStyles.logoSub}>Sistema de Acceso Digital</Text>
              </View>
              <View style={pdfStyles.eventBadge}>
                <Text style={pdfStyles.eventBadgeText}>ENTRADA DIGITAL</Text>
              </View>
            </View>
            <View style={pdfStyles.eventTitle}>
              <Text style={pdfStyles.eventName}>{evento?.nombre || 'Evento Especial'}</Text>
              <Text style={pdfStyles.eventDate}>{fechaFormateada}</Text>
            </View>
          </View>

          <View style={pdfStyles.body}>
            <View style={pdfStyles.qrSection}>
              <Text style={pdfStyles.qrLabel}>Código de acceso</Text>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              {qrCodeBase64 && <Image src={qrCodeBase64} style={pdfStyles.qrImage} />}
            </View>

            <View style={pdfStyles.infoGrid}>
              <View style={pdfStyles.infoCard}>
                <Text style={pdfStyles.infoLabel}>ID del boleto</Text>
                <Text style={pdfStyles.infoValue}>{ticketData?.id?.slice(0, 8)}...{ticketData?.id?.slice(-4)}</Text>
              </View>
              <View style={pdfStyles.infoCard}>
                <Text style={pdfStyles.infoLabel}>Asistente</Text>
                <Text style={pdfStyles.infoValue}>{asistente.nombreCompleto}</Text>
              </View>
              <View style={pdfStyles.infoCard}>
                <Text style={pdfStyles.infoLabel}>Correo</Text>
                <Text style={pdfStyles.infoValue}>{asistente.email}</Text>
              </View>
              <View style={pdfStyles.infoCard}>
                <Text style={pdfStyles.infoLabel}>Localidad</Text>
                <Text style={pdfStyles.infoValue}>General</Text>
              </View>
            </View>

            <View style={pdfStyles.perforatedLine} />

            <View style={pdfStyles.instructions}>
              <Text style={pdfStyles.instructionsTitle}>📌 Instrucciones de acceso</Text>
              <Text style={pdfStyles.instructionsText}>
                1. Presenta este pase digital en la entrada del evento{'\n'}
                2. El personal escaneará el código QR{'\n'}
                3. Válido para un solo ingreso{'\n'}
                4. No se permiten reimpresiones ni duplicados
              </Text>
            </View>
          </View>

          <View style={pdfStyles.footer}>
            <Text style={pdfStyles.footerText}>
              © 2024 <Text style={pdfStyles.footerHighlight}>LIZARD TECH</Text> • Q-PASS DIGITAL ACCESS
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
