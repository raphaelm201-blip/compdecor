import jsPDF from 'jspdf';

export interface ItemOrcamento {
    titulo: string;
    preco: number;
    quantidade: number;
    composicaoDataUrl?: string; // PNG do canvas
}

export interface DadosCliente {
    nome: string;
    email: string;
    telefone?: string;
    observacoes?: string;
}

function formatBRL(value: number) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
    });
}

function gerarNumero() {
    return `#${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function dataHoje() {
    return new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export async function gerarOrcamentoPdf(
    cliente: DadosCliente,
    itens: ItemOrcamento[]
): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const numero = gerarNumero();
    const hoje = dataHoje();

    // ── Paleta Cenário Galeria ──────────────────────────
    const azul = [40, 35, 30] as const;         // quase preto elegante
    const laranja = [180, 160, 120] as const;   // dourado/bege
    const cinzaClaro = [248, 246, 242] as const;
    const textEsc = [30, 25, 20] as const;
    const textMed = [100, 95, 85] as const;
    const branco = [255, 255, 255] as const;

    let y = 0;

    // ── Cabeçalho ───────────────────────────────────────
    // Fundo branco limpo para o header
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, 42, 'F');

    // Linha dourada/bege no topo
    doc.setFillColor(180, 160, 120);
    doc.rect(0, 0, W, 1.5, 'F');

    // Logo Cenário Galeria (imagem)
    const LOGO_B64 = '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';
    try {
        doc.addImage('data:image/png;base64,' + LOGO_B64, 'PNG', 10, 6, 60, 28);
    } catch {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('CENÁRIO', 14, 20);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('GALERIA', 14, 27);
    }

    // Linha divisória sutil
    doc.setDrawColor(220, 210, 190);
    doc.setLineWidth(0.5);
    doc.line(0, 41.5, W, 41.5);

    // Número + data (lado direito)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(60, 50, 40);
    doc.text(`ORÇAMENTO ${numero}`, W - 14, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 110, 90);
    doc.text(hoje, W - 14, 25, { align: 'right' });

    // Linha dourada abaixo do header
    doc.setFillColor(...laranja);
    doc.rect(0, 42, W, 2, 'F');

    y = 55;

    // ── Dados do destinatário ────────────────────────────
    doc.setFillColor(...cinzaClaro);
    doc.rect(0, 47, W, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...textMed);
    doc.text('DESTINATÁRIO', 14, 55);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...azul);
    doc.text(cliente.nome, 14, 61);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textMed);
    const contato = [cliente.email, cliente.telefone].filter(Boolean).join('  ·  ');
    doc.text(contato, 14, 67);

    y = 78;

    // ── Imagem da composição ──────────────────────────────
    const base64Img = itens[0]?.composicaoDataUrl;
    const isValidImage = base64Img && base64Img.startsWith('data:image/');

    if (isValidImage) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...azul);
        doc.text('Composição Visualizada', 14, y);

        // linha laranja
        doc.setFillColor(...laranja);
        doc.rect(14, y + 2, 50, 1.2, 'F');

        y += 7;

        // imagem centralizada
        const imgW = W - 28;
        const imgH = Math.round(imgW * (600 / 900)); // mantém 900x600
        try {
            // Identifica o formato real baseado no cabeçalho do base64
            const isPng = base64Img.startsWith('data:image/png');
            const format = isPng ? 'PNG' : 'JPEG';

            doc.addImage(base64Img, format, 14, y, imgW, imgH, undefined, 'FAST');
        } catch (err) {
            console.error('Erro ao adicionar imagem ao PDF:', err);
            // fallback se imagem falhar
            doc.setFillColor(230, 230, 235);
            doc.rect(14, y, imgW, imgH, 'F');
            doc.setFontSize(8);
            doc.setTextColor(...textMed);
            doc.text('[imagem da composição indisponível]', 14 + imgW / 2, y + imgH / 2, { align: 'center' });
        }
        y += imgH + 10;
    }

    // ── Tabela de itens ───────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...azul);
    doc.text('Obras Selecionadas', 14, y);
    doc.setFillColor(...laranja);
    doc.rect(14, y + 2, 50, 1.2, 'F');
    y += 9;

    // cabeçalho da tabela
    doc.setFillColor(...azul);
    doc.rect(14, y, W - 28, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...branco);
    doc.text('OBRA', 17, y + 6);
    doc.text('QTD', W - 70, y + 6, { align: 'right' });
    doc.text('UNIT.', W - 50, y + 6, { align: 'right' });
    doc.text('SUBTOTAL', W - 15, y + 6, { align: 'right' });
    y += 9;

    // linhas
    let total = 0;
    itens.forEach((item, i) => {
        const subtotal = item.preco * item.quantidade;
        total += subtotal;
        const rowBg = i % 2 === 0 ? [255, 255, 255] : [247, 248, 252];
        doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
        doc.rect(14, y, W - 28, 10, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...textEsc);
        doc.text(item.titulo || 'Obra sem título', 17, y + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...textMed);
        doc.text(String(item.quantidade), W - 70, y + 7, { align: 'right' });
        doc.text(formatBRL(item.preco), W - 50, y + 7, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...azul);
        doc.text(formatBRL(subtotal), W - 15, y + 7, { align: 'right' });

        // borda
        doc.setDrawColor(225, 228, 235);
        doc.rect(14, y, W - 28, 10, 'S');
        y += 10;
    });

    // ── Total ─────────────────────────────────────────────
    y += 4;
    doc.setFillColor(...azul);
    doc.roundedRect(14, y, W - 28, 18, 3, 3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(190, 210, 235);
    doc.text('Total estimado', 20, y + 8);
    doc.setFontSize(7.5);
    doc.text(`${itens.length} obra${itens.length > 1 ? 's' : ''} selecionada${itens.length > 1 ? 's' : ''} · valores sujeitos à disponibilidade`, 20, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...laranja);
    doc.text(formatBRL(total), W - 18, y + 12, { align: 'right' });

    y += 26;

    // ── Observações ───────────────────────────────────────
    if (cliente.observacoes?.trim()) {
        const obsLines = doc.splitTextToSize(cliente.observacoes, W - 40);
        const obsH = obsLines.length * 5 + 14;

        doc.setFillColor(254, 245, 235);
        doc.roundedRect(14, y, W - 28, obsH, 3, 3, 'F');
        doc.setDrawColor(...laranja);
        doc.setLineWidth(0.8);
        doc.line(14, y, 14, y + obsH);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...laranja);
        doc.text('OBSERVAÇÕES', 20, y + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...textMed);
        doc.text(obsLines, 20, y + 13);
        y += obsH + 8;
    }

    // ── Rodapé ────────────────────────────────────────────
    const footerY = 285;
    doc.setFillColor(...cinzaClaro);
    doc.rect(0, footerY, W, 12, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...textMed);
    doc.text('Cenário Galeria · Arte para seu espaço', 14, footerY + 7);
    doc.text(`Orçamento válido por 15 dias · ${hoje}`, W - 14, footerY + 7, { align: 'right' });

    // ── Visualizar / Download ─────────────────────────────────
    const nomeArquivo = `orcamento-${cliente.nome ? cliente.nome.replace(/\s+/g, '-').toLowerCase() : numero.replace('#', '')}.pdf`;

    try {
        // Primeira tentativa: Criar um blob nativo e jogar para uma nova guia.
        // Isso força o Chrome/Safari a usar o leitor próprio (corrigindo bugs de corrupção do disco)
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);

        const win = window.open(pdfUrl, '_blank');

        // Se o navegador bloqueou o Pop-up, faz o download seguro como alternativa
        if (!win) {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = nomeArquivo;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (e) {
        console.error("Falha na visualização em nova guia, caindo para save tradicional:", e);
        doc.save(nomeArquivo);
    }
}
