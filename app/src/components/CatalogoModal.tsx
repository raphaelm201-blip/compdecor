import { useState, useEffect, useRef, useCallback } from 'react';
import { obrasService, artistasService, type Obra, type Artista } from '../services/supabase';

interface Props {
  onSelect: (obra: Obra) => void;
  onClose: () => void;
}

const TECNICAS = ['Todas', 'Pintura', 'Fotografia', 'Ilustração', 'Aquarela', 'Gravura', 'Digital', 'Mista'];

export function CatalogoModal({ onSelect, onClose }: Props) {
  const [obras, setObras] = useState<Obra[]>([]);
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [tecnica, setTecnica] = useState('');
  const [artistaId, setArtistaId] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Fecha com Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  // Carrega artistas para o filtro
  useEffect(() => {
    artistasService.list().then(setArtistas).catch(console.error);
  }, []);

  // Carrega obras (reset ao mudar filtros)
  const loadObras = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentPage = reset ? 1 : page;
      const { data, meta } = await obrasService.list({
        search,
        tecnica: tecnica === 'Todas' ? '' : tecnica,
        artista_id: artistaId,
        page: currentPage,
        limit: 12,
      });

      if (reset) {
        setObras(data);
      } else {
        setObras(prev => [...prev, ...data]);
      }

      setTotal(meta.total);
      setHasMore(currentPage < meta.pages);
      if (!reset) setPage(p => p + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, tecnica, artistaId, page]);

  // Debounce na busca
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadObras(true), 400);
    return () => clearTimeout(searchTimeout.current);
  }, [search, tecnica, artistaId]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadObras(false); },
      { threshold: 0.1 }
    );
    if (bottomRef.current) observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadObras]);

  const formatBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-light)',
        borderRadius: 20,
        width: '100%',
        maxWidth: 1000,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Catálogo de Obras
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
              {total > 0 ? `${total} obra${total !== 1 ? 's' : ''} disponíve${total !== 1 ? 'is' : 'l'}` : 'Carregando...'}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', width: 32, height: 32,
            borderRadius: 8, cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Filtros */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0,
          background: 'var(--bg-card)',
        }}>
          {/* Busca */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none',
            }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar por título ou descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', paddingLeft: 32, paddingRight: 12,
                height: 36, background: 'var(--bg-main)',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 13, color: 'var(--text-primary)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Filtro artista */}
          <select
            value={artistaId}
            onChange={e => setArtistaId(e.target.value)}
            style={{
              height: 36, padding: '0 12px',
              background: 'var(--bg-main)', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 13, color: 'var(--text-primary)',
              cursor: 'pointer', minWidth: 140,
            }}
          >
            <option value="">Todos os artistas</option>
            {artistas.map(a => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>

          {/* Filtro técnica */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TECNICAS.map(t => (
              <button
                key={t}
                onClick={() => setTecnica(t === 'Todas' ? '' : t)}
                style={{
                  height: 36, padding: '0 14px',
                  background: (t === 'Todas' && !tecnica) || tecnica === t
                    ? 'var(--accent)' : 'var(--bg-main)',
                  color: (t === 'Todas' && !tecnica) || tecnica === t
                    ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* Grid de obras */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
                <p style={{ fontSize: 13 }}>Carregando catálogo...</p>
              </div>
            </div>
          ) : obras.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>🎨</div>
              <p style={{ fontSize: 14 }}>Nenhuma obra encontrada</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Tente outros filtros ou cadastre obras no painel admin</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}>
              {obras.map(obra => (
                <ObraCard
                  key={obra.id}
                  obra={obra}
                  selected={selectedObra?.id === obra.id}
                  onClick={() => setSelectedObra(obra)}
                  onAdd={() => { onSelect(obra); onClose(); }}
                />
              ))}
            </div>
          )}

          {/* Sentinel para infinite scroll */}
          <div ref={bottomRef} style={{ height: 20 }} />
          {loadingMore && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Carregando mais obras...
            </div>
          )}
          {!hasMore && obras.length > 0 && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 12 }}>
              — {total} obras carregadas —
            </div>
          )}
        </div>

        {/* Footer com detalhe da selecionada */}
        {selectedObra && (
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-card)',
            display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
          }}>
            <img src={selectedObra.imagem_url} alt={selectedObra.titulo}
              style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {selectedObra.titulo}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {selectedObra.artistas?.nome} · {selectedObra.largura}×{selectedObra.altura}cm · {selectedObra.tecnica}
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
              {formatBRL(selectedObra.preco)}
            </div>
            <button
              onClick={() => { onSelect(selectedObra); onClose(); }}
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '10px 20px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Adicionar ao Canvas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card individual de obra ──────────────────────────────────

function ObraCard({ obra, selected, onClick, onAdd }: {
  obra: Obra;
  selected: boolean;
  onClick: () => void;
  onAdd: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        background: 'var(--bg-card)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hover || selected ? 'translateY(-3px)' : 'none',
        boxShadow: selected ? '0 0 0 3px rgba(108,99,255,0.2)' : hover ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {/* Imagem */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg-main)', overflow: 'hidden' }}>
        <img
          src={obra.imagem_url}
          alt={obra.titulo}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
        />
        {/* Overlay com botão ao hover */}
        {(hover || selected) && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <button
              onClick={e => { e.stopPropagation(); onAdd(); }}
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 16px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Adicionar
            </button>
          </div>
        )}
        {/* Badge bestseller */}
        {!obra.disponivel && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
          }}>INDISPONÍVEL</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {obra.titulo}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {obra.artistas?.nome || '—'} · {obra.tecnica}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginTop: 6 }}>
          {obra.preco > 0
            ? obra.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : '—'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          {obra.largura}×{obra.altura} cm
        </div>
      </div>
    </div>
  );
}
