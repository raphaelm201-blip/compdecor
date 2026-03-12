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

    // ── Paleta ──────────────────────────────────────────
    const azul = [26, 60, 110] as const;       // #1A3C6E
    const laranja = [232, 145, 45] as const;   // #E8912D
    const cinzaClaro = [245, 247, 250] as const;
    const textEsc = [28, 35, 49] as const;
    const textMed = [90, 90, 100] as const;
    const branco = [255, 255, 255] as const;

    let y = 0;

    // ── Cabeçalho ───────────────────────────────────────
    doc.setFillColor(...azul);
    doc.rect(0, 0, W, 42, 'F');

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...branco);
    doc.text('CompDecor', 14, 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(174, 205, 232); // azul claro
    doc.text('Proposta de Aquisição de Arte', 14, 26);

    // Número + data (lado direito)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...branco);
    doc.text(`ORÇAMENTO ${numero}`, W - 14, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(174, 205, 232);
    doc.text(hoje, W - 14, 25, { align: 'right' });

    // Linha laranja abaixo do header
    doc.setFillColor(...laranja);
    doc.rect(0, 42, W, 3, 'F');

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
    doc.text('CompDecor · Visualizador de Arte', 14, footerY + 7);
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
