import { useState, useCallback, useRef, useEffect } from 'react';
import { ArtCanvas, type FrameItem } from './ArtCanvas';
import { OrcamentoModal } from './OrcamentoModal';
import { CatalogoModal } from './CatalogoModal';
import { AdminPanel } from './AdminPanel';
import { type OrcamentoHistorico } from '../lib/storage';
import { authService, type Obra } from '../services/supabase';

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
    return { url, name, load, clear, setUrl };
}

function makeFrame(artUrl: string, width = 300, height = 220): FrameItem {
    return {
        id: crypto.randomUUID(),
        artUrl,
        x: 45 + Math.random() * 10,
        y: 40 + Math.random() * 10,
        width,
        height,
        rotation: 0,
        opacity: 1,
        titulo: '',
        preco: 0,
    };
}

export function Visualizador({ initialData }: { initialData?: OrcamentoHistorico | null }) {
    const bg = useImageUpload(initialData?.estadoCanvas.bgUrl);

    // ── Multi-frame state ──────────────────────────────────────────────────────
    const [frames, setFrames] = useState<FrameItem[]>(() => {
        if (initialData?.estadoCanvas.frames) return initialData.estadoCanvas.frames;
        // Retrocompatibilidade com estado antigo (1 quadro)
        if (initialData?.estadoCanvas.artUrl) {
            return [makeFrame(
                initialData.estadoCanvas.artUrl,
                initialData.estadoCanvas.artW,
                initialData.estadoCanvas.artH,
            )];
        }
        return [];
    });
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selectedFrame = frames.find(f => f.id === selectedId) ?? null;

    // ── Canvas ref ────────────────────────────────────────────────────────────
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const onReady = useCallback((c: HTMLCanvasElement) => { canvasRef.current = c; }, []);

    const [showGrid, setShowGrid] = useState(false);
    const [toast, setToast] = useState<Toast>(null);

    // Orçamento
    const [showModal, setShowModal] = useState(false);
    const [composicaoDataUrl, setComposicaoDataUrl] = useState<string | null>(null);

    // Catálogo e Admin
    const [showCatalogo, setShowCatalogo] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    useEffect(() => {
        authService.getUser().then(user => setIsAdmin(!!user));
        const { data: { subscription } } = authService.onAuthChange(async (_e, session) => {
            setIsAdmin(!!session?.user);
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleAddFromCatalogo = (obra: Obra) => {
        const aspect = obra.largura / obra.altura;
        const w = 300;
        const h = Math.round(w / aspect);
        const frame: FrameItem = {
            id: crypto.randomUUID(),
            artUrl: obra.imagem_url,
            x: 45 + Math.random() * 10,
            y: 40 + Math.random() * 10,
            width: w, height: h,
            rotation: 0, opacity: 1,
            titulo: obra.titulo,
            preco: obra.preco,
        };
        setFrames(prev => [...prev, frame]);
        setSelectedId(frame.id);
    };

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Adicionar arte ao canvas ───────────────────────────────────────────────
    const addArtToCanvas = (artUrl: string, fileName = '') => {
        const img = new Image();
        img.onload = () => {
            const aspect = img.naturalWidth / img.naturalHeight;
            const w = 300;
            const h = Math.round(w / aspect);
            const frame = makeFrame(artUrl, w, h);
            frame.titulo = fileName.replace(/\.[^.]+$/, '');
            setFrames(prev => [...prev, frame]);
            setSelectedId(frame.id);
        };
        img.src = artUrl;
    };

    const loadArtFromFile = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            addArtToCanvas(base64, file.name);
        };
        reader.readAsDataURL(file);
    };

    // ── Frame handlers ────────────────────────────────────────────────────────
    const handleMove = (id: string, x: number, y: number) => {
        setFrames(prev => prev.map(f => f.id === id ? { ...f, x, y } : f));
    };

    const handleResize = (id: string, width: number, height: number) => {
        setFrames(prev => prev.map(f => f.id === id ? { ...f, width, height } : f));
    };

    const handleDelete = (id: string) => {
        setFrames(prev => prev.filter(f => f.id !== id));
        setSelectedId(null);
        showToast('🗑 Quadro removido');
    };

    const updateSelected = (patch: Partial<FrameItem>) => {
        if (!selectedId) return;
        setFrames(prev => prev.map(f => f.id === selectedId ? { ...f, ...patch } : f));
    };

    // ── Drag & drop de fundo ──────────────────────────────────────────────────
    const handleBgDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) bg.load(file);
    };

    const handleArtDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) loadArtFromFile(file);
    };

    // ── Download & orçamento ──────────────────────────────────────────────────
    const handleDownload = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = 'composicao.jpg';
        link.href = canvasRef.current.toDataURL('image/jpeg', 0.92);
        link.click();
        showToast('✅ Imagem salva!');
    };

    const handleAbrirOrcamento = () => {
        const dataUrl = canvasRef.current?.toDataURL('image/png') ?? null;
        setComposicaoDataUrl(dataUrl);
        setShowModal(true);
    };

    // ── Teclado: Delete/Backspace remove selecionado ──────────────────────────
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') &&
                selectedId &&
                !(e.target instanceof HTMLInputElement) &&
                !(e.target instanceof HTMLTextAreaElement)) {
                handleDelete(selectedId);
            }
            if (e.key === 'Escape') setSelectedId(null);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [selectedId]);

    // ── Totais para o orçamento ───────────────────────────────────────────────
    const totalGeral = frames.reduce((s, f) => s + f.preco, 0);
    const tituloObra = frames.length === 1
        ? (frames[0].titulo || 'Obra sem título')
        : `${frames.length} obras`;
    const precoObra = totalGeral;

    return (
        <div className="app-layout">
            {/* ── Sidebar ─────────────────────────────────────────────────────── */}
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
                            <label className="upload-zone" onDragOver={e => e.preventDefault()} onDrop={handleBgDrop}>
                                <span className="icon">🏠</span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: 'var(--accent)' }}>Clique</strong> ou arraste uma foto do ambiente
                                </span>
                                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && bg.load(e.target.files[0])} />
                            </label>
                        )}
                    </div>

                    {/* 2 — Adicionar quadro */}
                    <div className="section-card">
                        <div className="section-card-header">
                            <span className={`step-badge ${frames.length > 0 ? 'done' : ''}`}>2</span>
                            <span className="section-title">Adicionar Quadro</span>
                        </div>

                        {/* Botão Catálogo */}
                        <button
                            onClick={() => setShowCatalogo(true)}
                            style={{
                                width: '100%', padding: '10px 14px',
                                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                                border: 'none', borderRadius: 8, cursor: 'pointer',
                                color: '#fff', fontSize: 13, fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                marginBottom: 10,
                            }}
                        >
                            🖼 Navegar no Catálogo
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px' }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ou upload manual</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>

                        <label className="upload-zone" onDragOver={e => e.preventDefault()} onDrop={handleArtDrop}
                            style={{ padding: '12px 10px' }}>
                            <span className="icon">🎨</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                                <strong style={{ color: 'var(--accent)' }}>Clique</strong> ou arraste<br />
                                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Adiciona ao canvas</span>
                            </span>
                            <input type="file" accept="image/*" multiple
                                onChange={e => {
                                    Array.from(e.target.files || []).forEach(file => {
                                        if (file.type.startsWith('image/')) loadArtFromFile(file);
                                    });
                                    e.target.value = '';
                                }} />
                        </label>


                    </div>

                    {/* 3 — Lista de quadros no canvas */}
                    {frames.length > 0 && (
                        <div className="section-card fade-in">
                            <div className="section-card-header">
                                <span className="step-badge done">3</span>
                                <span className="section-title">Quadros ({frames.length})</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {frames.map((f, i) => (
                                    <div key={f.id}
                                        onClick={() => setSelectedId(f.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                                            background: f.id === selectedId ? 'rgba(108,99,255,0.12)' : 'var(--bg-main)',
                                            border: `1px solid ${f.id === selectedId ? 'rgba(108,99,255,0.4)' : 'var(--border)'}`,
                                            transition: 'var(--transition)',
                                        }}>
                                        <img src={f.artUrl} alt=""
                                            style={{ width: 36, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {f.titulo || `Quadro ${i + 1}`}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {f.width}×{f.height}px
                                                {f.preco > 0 && ` · ${f.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                                            </div>
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); handleDelete(f.id); }}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 4 }}
                                            title="Remover">✕</button>
                                    </div>
                                ))}
                            </div>

                            {frames.length > 0 && (
                                <button className="btn btn-ghost btn-sm"
                                    style={{ width: '100%', justifyContent: 'center', marginTop: 10, color: '#ef4444' }}
                                    onClick={() => { if (window.confirm('Remover todos os quadros?')) { setFrames([]); setSelectedId(null); } }}>
                                    🗑 Limpar tudo
                                </button>
                            )}
                        </div>
                    )}

                    {/* 4 — Ajustes do quadro selecionado */}
                    {selectedFrame && (
                        <div className="section-card fade-in">
                            <div className="section-card-header">
                                <span className="step-badge done">4</span>
                                <span className="section-title">Ajustar Selecionado</span>
                            </div>

                            {/* Título */}
                            <div className="field-group" style={{ marginBottom: 10 }}>
                                <label className="field-label">Título da obra</label>
                                <input className="field-input" type="text" placeholder="Ex: Paisagem ao Entardecer"
                                    value={selectedFrame.titulo}
                                    onChange={e => updateSelected({ titulo: e.target.value })} />
                            </div>

                            {/* Preço */}
                            <div className="field-group" style={{ marginBottom: 14 }}>
                                <label className="field-label">Preço (R$)</label>
                                <div className="price-input-wrap">
                                    <span className="price-prefix">R$</span>
                                    <input className="field-input" type="number" placeholder="0,00" min="0" step="0.01"
                                        value={selectedFrame.preco || ''}
                                        onChange={e => updateSelected({ preco: parseFloat(e.target.value) || 0 })}
                                        style={{ borderLeft: 'none', borderRadius: 0 }} />
                                </div>
                            </div>

                            <div className="divider" />

                            {/* Largura */}
                            <div className="control-row">
                                <span className="label" style={{ marginBottom: 0 }}>Largura</span>
                                <span className="val-badge">{selectedFrame.width}px</span>
                            </div>
                            <input type="range" min={40} max={880} value={selectedFrame.width}
                                onChange={e => {
                                    const w = Number(e.target.value);
                                    const aspect = selectedFrame.width / selectedFrame.height;
                                    updateSelected({ width: w, height: Math.round(w / aspect) });
                                }} style={{ marginBottom: 12 }} />

                            {/* Altura */}
                            <div className="control-row">
                                <span className="label" style={{ marginBottom: 0 }}>Altura</span>
                                <span className="val-badge">{selectedFrame.height}px</span>
                            </div>
                            <input type="range" min={40} max={580} value={selectedFrame.height}
                                onChange={e => {
                                    const h = Number(e.target.value);
                                    const aspect = selectedFrame.width / selectedFrame.height;
                                    updateSelected({ height: h, width: Math.round(h * aspect) });
                                }} style={{ marginBottom: 12 }} />

                            <div className="divider" />

                            {/* Rotação */}
                            <div className="control-row">
                                <span className="label" style={{ marginBottom: 0 }}>Rotação</span>
                                <span className="val-badge">{selectedFrame.rotation}°</span>
                            </div>
                            <input type="range" min={-180} max={180} value={selectedFrame.rotation}
                                onChange={e => updateSelected({ rotation: Number(e.target.value) })}
                                style={{ marginBottom: 4 }} />
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => updateSelected({ rotation: 0 })}>Zerar rotação</button>
                            </div>

                            {/* Opacidade */}
                            <div className="control-row">
                                <span className="label" style={{ marginBottom: 0 }}>Opacidade</span>
                                <span className="val-badge">{Math.round(selectedFrame.opacity * 100)}%</span>
                            </div>
                            <input type="range" min={10} max={100} value={Math.round(selectedFrame.opacity * 100)}
                                onChange={e => updateSelected({ opacity: Number(e.target.value) / 100 })}
                                style={{ marginBottom: 12 }} />

                            <div className="divider" />

                            <button className="btn btn-ghost btn-sm"
                                style={{ width: '100%', justifyContent: 'center', color: '#ef4444' }}
                                onClick={() => handleDelete(selectedFrame.id)}>
                                🗑 Remover este quadro
                            </button>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="sidebar-footer">
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => setShowGrid(g => !g)}>
                        {showGrid ? '✦' : '⊞'} {showGrid ? 'Ocultar' : 'Mostrar'} grade
                    </button>

                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                        onClick={handleDownload} disabled={!bg.url && frames.length === 0}>
                        ⬇ Baixar composição
                    </button>

                    <button className="btn btn-orcamento"
                        style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontWeight: 600 }}
                        onClick={handleAbrirOrcamento}
                        disabled={frames.length === 0}>
                        📄 Gerar / Salvar Orçamento
                        {totalGeral > 0 && (
                            <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.85 }}>
                                · {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        )}
                    </button>

                    {/* Admin */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                        {isAdmin ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-ghost btn-sm"
                                    style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                                    onClick={() => setShowAdmin(true)}>
                                    ⚙️ Admin
                                </button>
                                <button className="btn btn-ghost btn-sm"
                                    style={{ flex: 1, justifyContent: 'center', fontSize: 11, color: '#ef4444' }}
                                    onClick={() => { authService.logout(); setIsAdmin(false); }}>
                                    Sair
                                </button>
                            </div>
                        ) : (
                            <button className="btn btn-ghost btn-sm"
                                style={{ width: '100%', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)' }}
                                onClick={() => setShowLoginModal(true)}>
                                🔐 Acesso Admin
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* ── Canvas ──────────────────────────────────────────────────────── */}
            <main className="canvas-area">
                <div className="canvas-toolbar">
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {!bg.url
                            ? '← Comece adicionando uma imagem de fundo'
                            : frames.length === 0
                                ? '← Adicione quadros ao canvas'
                                : selectedFrame
                                    ? `🎨 ${selectedFrame.titulo || 'Quadro selecionado'} — arraste ou use os controles`
                                    : `🖼 ${frames.length} quadro${frames.length > 1 ? 's' : ''} no canvas — clique para selecionar`}
                    </span>
                    <div className="toolbar-spacer" />
                    {frames.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                            {frames.length} quadro{frames.length > 1 ? 's' : ''}
                            {totalGeral > 0 && ` · ${totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                        </span>
                    )}
                </div>

                <div className="canvas-wrapper">
                    {!bg.url && frames.length === 0 ? (
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
                                frames={frames}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                                onMove={handleMove}
                                onResize={handleResize}
                                onDelete={handleDelete}
                                showGrid={showGrid}
                                onReady={onReady}
                            />
                            {frames.length > 0 && !selectedFrame && (
                                <div className="canvas-hint">
                                    🖱 Clique num quadro para selecionar · Delete para remover
                                </div>
                            )}
                            {selectedFrame && (
                                <div className="canvas-hint">
                                    🖱 Arraste para mover · Cantos para redimensionar · ✕ para remover
                                </div>
                            )}
                            <div className="status-bar">
                                <span className="status-dot" />
                                {selectedFrame
                                    ? `${selectedFrame.titulo || 'Quadro'}: ${selectedFrame.width}×${selectedFrame.height}px · rot. ${selectedFrame.rotation}°`
                                    : `${frames.length} quadro${frames.length !== 1 ? 's' : ''} na composição`}
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
                    precoObra={precoObra}
                    onClose={() => setShowModal(false)}
                    estadoCanvas={{
                        bgUrl: bg.url,
                        artUrl: frames[0]?.artUrl ?? null,
                        artW: frames[0]?.width ?? 300,
                        artH: frames[0]?.height ?? 220,
                        rotation: frames[0]?.rotation ?? 0,
                        opacity: frames[0]?.opacity ?? 1,
                        position: { x: frames[0]?.x ?? 50, y: frames[0]?.y ?? 50 },
                        frames,
                    }}
                    orcamentoAEditar={initialData}
                />
            )}

            {/* Toast */}
            {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}

            {/* Catálogo */}
            {showCatalogo && (
                <CatalogoModal
                    onSelect={handleAddFromCatalogo}
                    onClose={() => setShowCatalogo(false)}
                />
            )}

            {/* Admin Panel */}
            {showAdmin && (
                <AdminPanel onClose={() => setShowAdmin(false)} />
            )}

            {/* Login Modal */}
            {showLoginModal && (
                <LoginModal
                    onSuccess={() => { setIsAdmin(true); setShowLoginModal(false); }}
                    onClose={() => setShowLoginModal(false)}
                />
            )}
        </div>
    );
}

// ── Login Modal ───────────────────────────────────────────────
function LoginModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setLoading(true); setError('');
        try {
            await authService.login(email, password);
            onSuccess();
        } catch (e: any) {
            setError('E-mail ou senha incorretos');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div onClick={e => { if (e.currentTarget === e.target) onClose(); }}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(6px)', zIndex: 5000,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}>
            <div style={{
                background: 'var(--bg-panel)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 32, width: '100%', maxWidth: 380,
            }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                    Acesso Admin
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 24px' }}>
                    Entre com sua conta para gerenciar o catálogo
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input type="email" placeholder="E-mail" value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        style={{ padding: '10px 12px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
                    <input type="password" placeholder="Senha" value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        style={{ padding: '10px 12px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
                    {error && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>}
                    <button onClick={handleLogin} disabled={loading} style={{
                        padding: '11px 0', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                        border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                    }}>
                        {loading ? '⏳ Entrando...' : '🔐 Entrar'}
                    </button>
                    <button onClick={onClose} style={{
                        padding: '10px 0', background: 'none', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
                    }}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}
