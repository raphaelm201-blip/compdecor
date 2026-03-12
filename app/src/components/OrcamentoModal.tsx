import { useState, useRef, useEffect } from 'react';
import { gerarOrcamentoPdf, type DadosCliente, type ItemOrcamento } from '../lib/gerarOrcamentoPdf';
import { salvarOrcamento, type OrcamentoEstadoCanvas, type OrcamentoHistorico } from '../lib/storage';

interface Props {
    composicaoDataUrl: string | null;
    tituloObra: string;
    precoObra: number;
    onClose: () => void;
    estadoCanvas: OrcamentoEstadoCanvas;
    orcamentoAEditar?: OrcamentoHistorico | null;
}

export function OrcamentoModal({ composicaoDataUrl, tituloObra, precoObra, onClose, estadoCanvas, orcamentoAEditar }: Props) {
    const [cliente, setCliente] = useState<DadosCliente>({
        nome: orcamentoAEditar?.cliente.nome || '',
        email: orcamentoAEditar?.cliente.email || '',
        telefone: orcamentoAEditar?.cliente.telefone || '',
        observacoes: orcamentoAEditar?.cliente.observacoes || '',
    });
    const [quantidade, setQuantidade] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const overlayRef = useRef<HTMLDivElement>(null);

    // Fecha ao clicar fora
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    // Fecha com Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const subtotal = precoObra * quantidade;

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!cliente.nome.trim()) errs.nome = 'Nome é obrigatório';
        if (!cliente.email.trim()) errs.email = 'E-mail é obrigatório';
        else if (!/\S+@\S+\.\S+/.test(cliente.email)) errs.email = 'E-mail inválido';
        return errs;
    };

    const handleSomenteSalvar = () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        const item: ItemOrcamento = {
            titulo: tituloObra || 'Obra sem título',
            preco: precoObra,
            quantidade,
            composicaoDataUrl: composicaoDataUrl ?? undefined,
        };

        salvarOrcamento(
            cliente,
            [item],
            estadoCanvas,
            composicaoDataUrl ? resizeImageForThumb(composicaoDataUrl) : undefined
        );

        onClose();
    };

    const handleGerar = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setLoading(true);
        try {
            const item: ItemOrcamento = {
                titulo: tituloObra || 'Obra sem título',
                preco: precoObra,
                quantidade,
                composicaoDataUrl: composicaoDataUrl ?? undefined,
            };

            // Salva no histórico (se não estivermos apenas editando sem alterar imagem de fundo, 
            // ou se quisermos sempre gerar um novo registro/sobrescrever).
            // Por enquanto, sempre salva como um novo item no histórico para ter o timestamp atualizado.
            salvarOrcamento(
                cliente,
                [item],
                estadoCanvas,
                composicaoDataUrl ? resizeImageForThumb(composicaoDataUrl) : undefined
            );

            await gerarOrcamentoPdf(cliente, [item]);
        } finally {
            setLoading(false);
        }
    };

    // Helper para não salvar 5MB no localStorage da miniatura
    const resizeImageForThumb = (dataUrl: string): string => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = dataUrl;
        // thumb em baixa qualidade 300x200
        canvas.width = 300;
        canvas.height = 200;
        if (ctx) ctx.drawImage(img, 0, 0, 300, 200);
        return canvas.toDataURL('image/jpeg', 0.5);
    };

    const set = (field: keyof DadosCliente) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCliente(c => ({ ...c, [field]: e.target.value }));
        if (errors[field]) setErrors(errs => { const n = { ...errs }; delete n[field]; return n; });
    };

    return (
        <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
            <div className="modal-box fade-in">

                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Gerar Orçamento</h2>
                        <p className="modal-subtitle">Preencha os dados do cliente para gerar o PDF</p>
                    </div>
                    <button className="modal-close" onClick={onClose} title="Fechar">✕</button>
                </div>

                <div className="modal-body">

                    {/* Left: preview */}
                    <div className="modal-preview">
                        <p className="label" style={{ marginBottom: 8 }}>Composição</p>
                        {composicaoDataUrl ? (
                            <img src={composicaoDataUrl} alt="composição" className="modal-preview-img" />
                        ) : (
                            <div className="modal-preview-empty">Sem imagem</div>
                        )}

                        {/* Resumo */}
                        <div className="resumo-card">
                            <p className="label" style={{ marginBottom: 10 }}>Resumo</p>

                            <div className="resumo-row">
                                <span className="resumo-titulo">{tituloObra || 'Obra sem título'}</span>
                            </div>

                            <div className="resumo-row" style={{ marginTop: 8 }}>
                                <span className="resumo-label">Quantidade</span>
                                <div className="qty-control">
                                    <button
                                        className="qty-btn"
                                        onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                                    >−</button>
                                    <span className="qty-val">{quantidade}</span>
                                    <button
                                        className="qty-btn"
                                        onClick={() => setQuantidade(q => q + 1)}
                                    >+</button>
                                </div>
                            </div>

                            <div className="resumo-row" style={{ marginTop: 6 }}>
                                <span className="resumo-label">Valor unit.</span>
                                <span className="resumo-valor">
                                    {precoObra > 0
                                        ? precoObra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                        : '—'}
                                </span>
                            </div>

                            <div className="resumo-divider" />

                            <div className="resumo-total-row">
                                <span className="resumo-total-label">Total</span>
                                <span className="resumo-total-valor">
                                    {precoObra > 0
                                        ? subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                        : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: form */}
                    <div className="modal-form">
                        <p className="label" style={{ marginBottom: 14 }}>Dados do Cliente</p>

                        <div className="field-group">
                            <label className="field-label">Nome completo *</label>
                            <input
                                className={`field-input ${errors.nome ? 'error' : ''}`}
                                type="text"
                                placeholder="Ex: Maria Silva"
                                value={cliente.nome}
                                onChange={set('nome')}
                                autoFocus
                            />
                            {errors.nome && <span className="field-error">{errors.nome}</span>}
                        </div>

                        <div className="field-group">
                            <label className="field-label">E-mail *</label>
                            <input
                                className={`field-input ${errors.email ? 'error' : ''}`}
                                type="email"
                                placeholder="Ex: maria@email.com"
                                value={cliente.email}
                                onChange={set('email')}
                            />
                            {errors.email && <span className="field-error">{errors.email}</span>}
                        </div>

                        <div className="field-group">
                            <label className="field-label">Telefone / WhatsApp</label>
                            <input
                                className="field-input"
                                type="tel"
                                placeholder="Ex: (11) 99999-9999"
                                value={cliente.telefone}
                                onChange={set('telefone')}
                            />
                        </div>

                        <div className="field-group" style={{ flex: 1 }}>
                            <label className="field-label">Observações</label>
                            <textarea
                                className="field-input field-textarea"
                                placeholder="Informações adicionais para o orçamento..."
                                value={cliente.observacoes}
                                onChange={set('observacoes')}
                                rows={4}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: 16 }}>
                            <button
                                className="btn btn-ghost"
                                style={{ flex: 1, padding: '13px 0', fontSize: 13, border: '1px solid var(--border)' }}
                                onClick={handleSomenteSalvar}
                                disabled={loading}
                            >
                                💾 Salvar (Histórico)
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '13px 0', fontSize: 13 }}
                                onClick={handleGerar}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                        <span style={{ animation: 'pulse 1s infinite' }}>⏳</span> Gerando PDF…
                                    </span>
                                ) : (
                                    '📄 Salvar e Baixar PDF'
                                )}
                            </button>
                        </div>

                        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
                            O PDF é gerado diretamente no browser — nenhum dado é enviado a servidores
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
