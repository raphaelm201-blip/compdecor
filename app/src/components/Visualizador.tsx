import { useState, useCallback, useRef } from 'react';
import { ArtCanvas } from './ArtCanvas';
import { OrcamentoModal } from './OrcamentoModal';
import type { OrcamentoHistorico } from '../lib/storage';

type Toast = { text: string; type: 'success' | 'error' } | null;

function useImageUpload(initialUrl?: string | null) {
    const [url, setUrl] = useState<string | null>(initialUrl || null);
    const [name, setName] = useState<string>('');
    const load = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => { setUrl(e.target?.result as string); setName(file.name); };
        reader.readAsDataURL(file);
    };
    const clear = () => { setUrl(null); setName(''); };
    return { url, name, load, clear };
}

export function Visualizador({ initialData }: { initialData?: OrcamentoHistorico | null }) {
    const bg = useImageUpload(initialData?.estadoCanvas.bgUrl);
    const art = useImageUpload(initialData?.estadoCanvas.artUrl);

    const [artW, setArtW] = useState(initialData?.estadoCanvas.artW || 300);
    const [artH, setArtH] = useState(initialData?.estadoCanvas.artH || 220);
    const [lockAspect, setLockAspect] = useState(true);
    const [rotation, setRotation] = useState(initialData?.estadoCanvas.rotation || 0);
    const [opacity, setOpacity] = useState(initialData?.estadoCanvas.opacity ?? 1);
    const [position, setPosition] = useState(initialData?.estadoCanvas.position || { x: 50, y: 50 });
    const [showGrid, setShowGrid] = useState(false);
    const [toast, setToast] = useState<Toast>(null);

    // Orçamento
    const [tituloObra, setTituloObra] = useState(initialData?.items[0]?.titulo || '');
    const [precoObra, setPrecoObra] = useState(initialData?.items[0]?.preco.toString() || '');
    const [showModal, setShowModal] = useState(false);
    const [composicaoDataUrl, setComposicaoDataUrl] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const naturalAspect = useRef<number | null>(null);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleBgDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) bg.load(file);
    };

    const loadArtWithDimensions = (file: File) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            naturalAspect.current = img.naturalWidth / img.naturalHeight;
            setArtW(300);
            setArtH(Math.round(300 / naturalAspect.current));
            URL.revokeObjectURL(url);
        };
        img.src = url;
        art.load(file);
    };

    const handleArtDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) loadArtWithDimensions(file);
    };

    const changeW = (v: number) => {
        setArtW(v);
        if (lockAspect && naturalAspect.current) setArtH(Math.round(v / naturalAspect.current));
    };
    const changeH = (v: number) => {
        setArtH(v);
        if (lockAspect && naturalAspect.current) setArtW(Math.round(v * naturalAspect.current));
    };

    const handleDownload = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = 'composicao.jpg';
        link.href = canvasRef.current.toDataURL('image/jpeg', 0.92);
        link.click();
        showToast('✅ Imagem salva com sucesso!');
    };

    const handleAbrirOrcamento = () => {
        const dataUrl = canvasRef.current
            ? canvasRef.current.toDataURL('image/png')
            : null;
        setComposicaoDataUrl(dataUrl);
        setShowModal(true);
    };

    const handleReset = () => {
        setPosition({ x: 50, y: 50 });
        setRotation(0);
        setOpacity(1);
        setArtW(300);
        setArtH(220);
    };

    const onReady = useCallback((c: HTMLCanvasElement) => { canvasRef.current = c; }, []);

    const precoNum = parseFloat(precoObra.replace(',', '.')) || 0;

    return (
        <div className="app-layout">
            {/* ── Sidebar ── */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">🖼</div>
                    <div>
                        <div className="sidebar-title">CompDecor</div>
                        <div className="sidebar-subtitle">Visualizador de Quadros</div>
                    </div>
                </div>

                <div className="sidebar-body">

                    {/* 1 — Fundo */}
                    <div className="section-card">
                        <div className="section-card-header">
                            <span className={`step-badge ${bg.url ? 'done' : ''}`}>1</span>
                            <span className="section-title">Imagem de Fundo</span>
                        </div>
                        {bg.url ? (
                            <div className="thumb-wrap fade-in">
                                <img src={bg.url} alt="fundo" />
                                <button className="remove-btn" onClick={bg.clear}>✕</button>
                            </div>
                        ) : (
                            <label className="upload-zone" onDragOver={(e) => e.preventDefault()} onDrop={handleBgDrop}>
                                <span className="icon">🏠</span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: 'var(--accent)' }}>Clique</strong> ou arraste uma foto do ambiente
                                </span>
                                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && bg.load(e.target.files[0])} />
                            </label>
                        )}
                    </div>

                    {/* 2 — Obra */}
                    <div className="section-card">
                        <div className="section-card-header">
                            <span className={`step-badge ${art.url ? 'done' : ''}`}>2</span>
                            <span className="section-title">Obra de Arte</span>
                        </div>
                        {art.url ? (
                            <div className="thumb-wrap fade-in">
                                <img src={art.url} alt="arte" style={{ objectFit: 'contain', background: '#111' }} />
                                <button className="remove-btn" onClick={art.clear}>✕</button>
                            </div>
                        ) : (
                            <label className="upload-zone" onDragOver={(e) => e.preventDefault()} onDrop={handleArtDrop}>
                                <span className="icon">🎨</span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: 'var(--accent)' }}>Clique</strong> ou arraste a imagem do quadro/arte
                                </span>
                                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadArtWithDimensions(e.target.files[0])} />
                            </label>
                        )}
                    </div>

                    {/* 3 — Ajustes + Obra Info */}
                    {art.url && (
                        <div className="section-card fade-in">
                            <div className="section-card-header">
                                <span className="step-badge done">3</span>
                                <span className="section-title">Obra & Ajustes</span>
                            </div>

                            {/* Título da obra */}
                            <div className="field-group" style={{ marginBottom: 10 }}>
                                <label className="field-label">Título da obra</label>
                                <input
                                    className="field-input"
                                    type="text"
                                    placeholder="Ex: Paisagem ao Entardecer"
                                    value={tituloObra}
                                    onChange={(e) => setTituloObra(e.target.value)}
                                />
                            </div>

                            {/* Preço */}
                            <div className="field-group" style={{ marginBottom: 14 }}>
                                <label className="field-label">Preço (R$)</label>
                                <div className="price-input-wrap">
                                    <span className="price-prefix">R$</span>
                                    <input
                                        className="field-input"
                                        type="number"
                                        placeholder="0,00"
                                        min="0"
                                        step="0.01"
                                        value={precoObra}
                                        onChange={(e) => setPrecoObra(e.target.value)}
                                        style={{ borderLeft: 'none', borderRadius: 0 }}
                                    />
                                </div>
                                {precoNum > 0 && (
                                    <span style={{ fontSize: 11, color: 'var(--success)' }}>
                                        ✓ {precoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                )}
                            </div>

                            <div className="divider" />

                            {/* Largura */}
                            <div className="control-row">
                                <span className="label" style={{ marginBottom: 0 }}>Largura</span>
                                <span className="val-badge">{artW}px</span>
                            </div>
                            <input type="range" min={40} max={880} value={artW}
                                onChange={(e) => changeW(Number(e.target.value))} style={{ marginBottom: 12 }} />

                            {/* Altura */}
                            <div className="control-row">
                                <span className="label" style={{ marginBottom: 0 }}>Altura</span>
                                <span className="val-badge">{artH}px</span>
                            </div>
                            <input type="range" min={40} max={580} value={artH}
                                onChange={(e) => changeH(Number(e.target.value))} style={{ marginBottom: 10 }} />

                            {/* Lock */}
                            <div className="control-row" style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)}
                                        style={{ accentColor: 'var(--accent)' }} />
                                    Manter proporção
                                </label>
                            </div>

                            <div className="divider" />

                            {/* Rotação */}
                            <div className="control-row">
                                <span className="label" style={{ marginBottom: 0 }}>Rotação</span>
                                <span className="val-badge">{rotation}°</span>
                            </div>
                            <input type="range" min={-180} max={180} value={rotation}
                                onChange={(e) => setRotation(Number(e.target.value))} style={{ marginBottom: 4 }} />
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => setRotation(0)}>Zerar rotação</button>
                            </div>

                            {/* Opacidade */}
                            <div className="control-row">
                                <span className="label" style={{ marginBottom: 0 }}>Opacidade</span>
                                <span className="val-badge">{Math.round(opacity * 100)}%</span>
                            </div>
                            <input type="range" min={10} max={100} value={Math.round(opacity * 100)}
                                onChange={(e) => setOpacity(Number(e.target.value) / 100)} style={{ marginBottom: 12 }} />

                            <div className="divider" />

                            {/* Posição */}
                            <div className="control-row">
                                <span className="label" style={{ marginBottom: 0 }}>Posição X</span>
                                <span className="val-badge">{position.x.toFixed(0)}%</span>
                            </div>
                            <input type="range" min={0} max={100} value={position.x}
                                onChange={(e) => setPosition(p => ({ ...p, x: Number(e.target.value) }))} style={{ marginBottom: 12 }} />
                            <div className="control-row">
                                <span className="label" style={{ marginBottom: 0 }}>Posição Y</span>
                                <span className="val-badge">{position.y.toFixed(0)}%</span>
                            </div>
                            <input type="range" min={0} max={100} value={position.y}
                                onChange={(e) => setPosition(p => ({ ...p, y: Number(e.target.value) }))} />
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="sidebar-footer">
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => setShowGrid(g => !g)}>
                        {showGrid ? '✦' : '⊞'} {showGrid ? 'Ocultar' : 'Mostrar'} grade
                    </button>

                    {art.url && (
                        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                            onClick={handleReset}>
                            ↺ Resetar posição
                        </button>
                    )}

                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                        onClick={handleDownload} disabled={!bg.url && !art.url}>
                        ⬇ Baixar composição
                    </button>

                    <button
                        className="btn btn-orcamento"
                        style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontWeight: 600 }}
                        onClick={handleAbrirOrcamento}
                        disabled={!art.url}
                    >
                        📄 Gerar / Salvar Orçamento
                    </button>
                </div>
            </aside>

            {/* ── Canvas ── */}
            <main className="canvas-area">
                <div className="canvas-toolbar">
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {bg.url && art.url
                            ? '🎨 Arraste o quadro para posicionar'
                            : !bg.url
                                ? '← Comece adicionando uma imagem de fundo'
                                : '← Agora adicione a obra de arte'}
                    </span>
                    <div className="toolbar-spacer" />
                    {tituloObra && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            🖼 {tituloObra}
                            {precoNum > 0 && ` · ${precoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                        </span>
                    )}
                    {bg.url && !tituloObra && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            📐 900 × 600
                        </span>
                    )}
                </div>

                <div className="canvas-wrapper">
                    {!bg.url && !art.url ? (
                        <div className="canvas-empty">
                            <div className="empty-icon">🖼️</div>
                            <p>
                                <strong>Bem-vindo ao CompDecor!</strong><br />
                                Comece fazendo o upload da imagem de fundo<br />
                                (sala, quarto, escritório…) no painel ao lado.
                            </p>
                        </div>
                    ) : (
                        <>
                            <ArtCanvas
                                bgUrl={bg.url}
                                artUrl={art.url}
                                artWidth={artW}
                                artHeight={artH}
                                rotation={rotation}
                                opacity={opacity}
                                position={position}
                                onPositionChange={setPosition}
                                showGrid={showGrid}
                                onReady={onReady}
                            />
                            {art.url && (
                                <div className="canvas-hint">
                                    🖱 Clique e arraste o quadro · Use os controles no painel para ajustar tamanho
                                </div>
                            )}
                            <div className="status-bar">
                                <span className="status-dot" />
                                {art.url
                                    ? `${tituloObra || 'Quadro'}: ${artW}×${artH}px · rot. ${rotation}° · opac. ${Math.round(opacity * 100)}%`
                                    : 'Fundo carregado — adicione a obra de arte'}
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <OrcamentoModal
                    composicaoDataUrl={composicaoDataUrl}
                    tituloObra={tituloObra}
                    precoObra={precoNum}
                    onClose={() => setShowModal(false)}
                    estadoCanvas={{
                        bgUrl: bg.url,
                        artUrl: art.url,
                        artW, artH, rotation, opacity, position
                    }}
                    orcamentoAEditar={initialData}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`toast ${toast.type}`}>{toast.text}</div>
            )}
        </div>
    );
}
