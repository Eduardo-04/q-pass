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
    padding: 15,
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.secondary,
    padding: 16,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  logo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  logoSub: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 2,
  },
  eventBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  eventBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  eventTitle: {
    marginTop: 6,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  body: {
    padding: 16,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 14,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  qrLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textLight,
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  qrImage: {
    width: 140,
    height: 140,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 10,
  },
  infoCard: {
    width: '48%',
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 10,
    color: colors.text,
    fontWeight: 'semibold',
  },
  perforatedLine: {
    marginVertical: 10,
    height: 1,
    backgroundColor: colors.border,
    borderStyle: 'dashed',
  },
  instructions: {
    backgroundColor: colors.successLight,
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  instructionsTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  instructionsText: {
    fontSize: 8,
    color: colors.text,
    lineHeight: 1.3,
  },
  footer: {
    backgroundColor: colors.secondary,
    padding: 12,
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
  bannerContainer: {
    width: '100%',
    height: 110,
    backgroundColor: '#070a0f',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
});

interface Evento {
  nombre?: string;
  fecha_evento?: string;
  precio?: number;
  comision_porcentaje?: number;
  comision_fija?: number;
  banner_url?: string;
}

interface TicketData {
  id: string;
  nombre_zona?: string;
}

export const TicketPDF = ({ ticketData, evento, qrCodeBase64, asistente, nombreZona }: { 
  ticketData: TicketData; 
  evento: Evento; 
  qrCodeBase64: string;
  asistente: { nombreCompleto: string, email: string };
  nombreZona?: string;
}) => {
  const fechaFormateada = evento?.fecha_evento ? new Date(evento.fecha_evento).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Fecha por confirmar';

  const textoZonaBadge = (nombreZona || ticketData?.nombre_zona || 'ENTRADA DIGITAL').toUpperCase();

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.container}>
          <View style={pdfStyles.header}>
            {evento?.banner_url && (
              <View style={pdfStyles.bannerContainer}>
                <Image src={evento.banner_url} style={pdfStyles.bannerImage} />
              </View>
            )}
            <View style={pdfStyles.logo}>
              <View>
                <Text style={pdfStyles.logoText}>Q-PASS</Text>
                <Text style={pdfStyles.logoSub}>Sistema de Acceso Digital</Text>
              </View>
              <View style={pdfStyles.eventBadge}>
                <Text style={pdfStyles.eventBadgeText}>{textoZonaBadge}</Text>
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
                <Text style={pdfStyles.infoLabel}>FOLIO MANUAL (8 DÍGITOS)</Text>
                <Text style={{ ...pdfStyles.infoValue, color: colors.primary, fontSize: 13, letterSpacing: 1 }}>
                  {ticketData?.id ? ticketData.id.slice(0, 8).toUpperCase() : 'N/A'}
                </Text>
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
