// src/components/budget/OrcamentoPDF.tsx
import {
  Document, Page, View, Text, Image, StyleSheet, Font, pdf,
} from '@react-pdf/renderer';
import type { Obra, ItemOrcamentoInput, Artista } from '../../lib/supabase';

// ── Estilos ───────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#1C2331',
  },

  // Cabeçalho
  header: {
    backgroundColor: '#1A3C6E',
    paddingVertical: 28,
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImg: { width: 40, height: 40, borderRadius: 6 },
  headerNome: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  headerSub: { fontSize: 9, color: '#AECDE8', marginTop: 2 },
  headerMeta: { alignItems: 'flex-end' },
  headerNumero: { fontSize: 11, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  headerData: { fontSize: 9, color: '#AECDE8', marginTop: 3 },

  // Faixa destinatário
  destinatario: {
    backgroundColor: '#F5F7FA',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderBottomWidth: 3,
    borderBottomColor: '#E8912D',
    flexDirection: 'row',
    gap: 40,
  },
  destLabel: { fontSize: 8, color: '#888888', textTransform: 'uppercase', letterSpacing: 0.8 },
  destValor: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1A3C6E', marginTop: 2 },

  // Conteúdo principal
  content: { paddingHorizontal: 40, paddingTop: 24 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1A3C6E',
    borderBottomWidth: 2,
    borderBottomColor: '#E8912D',
    paddingBottom: 6,
    marginBottom: 18,
  },

  // Item de obra
  item: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6F0',
  },
  itemImagem: {
    width: 180,
    height: 130,
    objectFit: 'cover',
    borderRadius: 4,
  },
  itemInfo: { flex: 1 },
  itemTitulo: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1A3C6E', marginBottom: 2 },
  itemArtista: { fontSize: 10, color: '#E8912D', marginBottom: 10 },
  fichaRow: { fontSize: 10, color: '#555555', marginBottom: 3 },
  fichaLabel: { fontFamily: 'Helvetica-Bold', color: '#333' },
  precoBox: {
    marginTop: 12,
    backgroundColor: '#EBF2FB',
    borderLeftWidth: 3,
    borderLeftColor: '#1A3C6E',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 3,
  },
  precoUnit: { fontSize: 10, color: '#555' },
  precoTotal: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1A3C6E' },
  cenaTag: {
    fontSize: 8,
    color: '#888',
    marginTop: 4,
  },

  // Total
  totalBox: {
    backgroundColor: '#1A3C6E',
    borderRadius: 8,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  totalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  totalObras: { fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
  totalValor: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: '#E8912D' },

  // Observações
  obsBox: {
    backgroundColor: '#FEF5EB',
    borderLeftWidth: 4,
    borderLeftColor: '#E8912D',
    padding: 14,
    borderRadius: 3,
    marginBottom: 20,
  },
  obsLabel: { fontSize: 8, color: '#E8912D', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  obsTexto: { fontSize: 10, color: '#555', lineHeight: 1.5 },

  // Rodapé
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F5F7FA',
    borderTopWidth: 1,
    borderTopColor: '#D9DEE6',
    paddingVertical: 12,
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#888888' },
});

// ── Helpers ───────────────────────────────────────────────────
function formatarMoeda(valor: number) {
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

// ── Componente PDF ────────────────────────────────────────────

interface OrcamentoPDFProps {
  artista: Artista;
  clienteNome: string;
  clienteEmail: string;
  observacoes?: string;
  itens: ItemOrcamentoInput[];
  orcamentoId: string;
  criadoEm: string;
}

export function OrcamentoPDF({
  artista, clienteNome, clienteEmail, observacoes, itens, orcamentoId, criadoEm,
}: OrcamentoPDFProps) {
  const total = itens.reduce((acc, i) => acc + i.preco_unitario * i.quantidade, 0);
  const numeroFormatado = orcamentoId.slice(0, 8).toUpperCase();

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Cabeçalho ── */}
        <View style={S.header}>
          <View style={S.headerLogo}>
            {artista.logo_url && <Image src={artista.logo_url} style={S.logoImg} />}
            <View>
              <Text style={S.headerNome}>{artista.nome}</Text>
              <Text style={S.headerSub}>Proposta de Aquisição de Obra de Arte</Text>
            </View>
          </View>
          <View style={S.headerMeta}>
            <Text style={S.headerNumero}>ORÇAMENTO Nº {numeroFormatado}</Text>
            <Text style={S.headerData}>{formatarData(criadoEm)}</Text>
          </View>
        </View>

        {/* ── Destinatário ── */}
        <View style={S.destinatario}>
          <View>
            <Text style={S.destLabel}>Destinatário</Text>
            <Text style={S.destValor}>{clienteNome}</Text>
          </View>
          <View>
            <Text style={S.destLabel}>Contato</Text>
            <Text style={S.destValor}>{clienteEmail}</Text>
          </View>
        </View>

        {/* ── Obras ── */}
        <View style={S.content}>
          <Text style={S.sectionTitle}>Obras Selecionadas</Text>

          {itens.map((item, i) => {
            const obra = item.obra!;
            const subtotal = item.preco_unitario * item.quantidade;
            const imgSrc = item.mockup_url || obra.imagem_url;

            return (
              <View key={item.obra_id} style={[S.item, i === itens.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                <Image src={imgSrc} style={S.itemImagem} />
                <View style={S.itemInfo}>
                  <Text style={S.itemTitulo}>{obra.titulo}</Text>
                  <Text style={S.itemArtista}>{obra.artista?.nome}</Text>

                  <Text style={S.fichaRow}>
                    <Text style={S.fichaLabel}>Técnica: </Text>{obra.tecnica}
                  </Text>
                  <Text style={S.fichaRow}>
                    <Text style={S.fichaLabel}>Dimensões: </Text>
                    {obra.largura} × {obra.altura} cm
                  </Text>
                  {obra.ano && (
                    <Text style={S.fichaRow}>
                      <Text style={S.fichaLabel}>Ano: </Text>{obra.ano}
                    </Text>
                  )}
                  {item.cena_usada && (
                    <Text style={S.cenaTag}>📍 Visualizado em: {item.cena_usada}</Text>
                  )}

                  <View style={S.precoBox}>
                    <Text style={S.precoUnit}>
                      {item.quantidade}x {formatarMoeda(item.preco_unitario)}
                    </Text>
                    <Text style={S.precoTotal}>{formatarMoeda(subtotal)}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Total */}
          <View style={S.totalBox}>
            <View>
              <Text style={S.totalLabel}>Total estimado</Text>
              <Text style={S.totalObras}>
                {itens.length} obra{itens.length > 1 ? 's' : ''} selecionada{itens.length > 1 ? 's' : ''}
                {' · '}Valores sujeitos à disponibilidade
              </Text>
            </View>
            <Text style={S.totalValor}>{formatarMoeda(total)}</Text>
          </View>

          {/* Observações */}
          {observacoes && (
            <View style={S.obsBox}>
              <Text style={S.obsLabel}>Observações</Text>
              <Text style={S.obsTexto}>{observacoes}</Text>
            </View>
          )}
        </View>

        {/* ── Rodapé ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>
            {artista.nome}{artista.website ? ` · ${artista.website}` : ''}
          </Text>
          <Text style={S.footerText}>
            Orçamento válido por 15 dias · {formatarData(criadoEm)}
          </Text>
        </View>

      </Page>
    </Document>
  );
}

// ── Gerador de Blob ───────────────────────────────────────────
/**
 * Gera o PDF no browser e retorna um Blob pronto para download ou upload.
 */
export async function gerarPdfBlob(props: OrcamentoPDFProps): Promise<Blob> {
  const doc = <OrcamentoPDF {...props} />;
  const blob = await pdf(doc).toBlob();
  return blob;
}

/**
 * Dispara o download do PDF direto no browser.
 */
export async function baixarPdf(props: OrcamentoPDFProps): Promise<void> {
  const blob = await gerarPdfBlob(props);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orcamento-${props.orcamentoId.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
