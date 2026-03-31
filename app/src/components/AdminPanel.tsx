import { useState, useEffect } from 'react';
import {
  obrasService, artistasService,
  authService, supabase,
  type Obra, type Artista,
} from '../services/supabase';

interface Props {
  onClose: () => void;
}

type Tab = 'obras' | 'artistas' | 'admins';

export function AdminPanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('obras');
  const [obras, setObras] = useState<Obra[]>([]);
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Forms
  const [showObraForm, setShowObraForm] = useState(false);
  const [showArtistaForm, setShowArtistaForm] = useState(false);
  const [editingObra, setEditingObra] = useState<Obra | null>(null);
  const [editingArtista, setEditingArtista] = useState<Artista | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [o, a] = await Promise.all([
        obrasService.list({ apenasDisponiveis: false, limit: 100 }),
        artistasService.list(),
      ]);
      setObras(o.data);
      setArtistas(a);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)', zIndex: 3000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
        borderRadius: 20, width: '100%', maxWidth: 900, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 20 }}>⚙️</span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Painel Admin
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Gerencie obras e artistas do catálogo
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', width: 32, height: 32,
            borderRadius: 8, cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 0, padding: '0 24px',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
          background: 'var(--bg-card)',
        }}>
          {([
            { key: 'obras', label: `🎨 Obras (${obras.length})` },
            { key: 'artistas', label: `👤 Artistas (${artistas.length})` },
            { key: 'admins', label: '🔐 Conta & Admins' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '12px 20px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              Carregando...
            </div>
          ) : tab === 'obras' ? (
            <ObrasTab
              obras={obras}
              artistas={artistas}
              onAdd={() => { setEditingObra(null); setShowObraForm(true); }}
              onEdit={o => { setEditingObra(o); setShowObraForm(true); }}
              onDelete={async id => {
                if (!window.confirm('Deletar esta obra?')) return;
                try { await obrasService.delete(id); showToast('Obra deletada'); load(); }
                catch (e: any) { showToast(e.message, 'error'); }
              }}
              onToggle={async (o) => {
                try {
                  await obrasService.update(o.id, { disponivel: !o.disponivel });
                  showToast(o.disponivel ? 'Obra ocultada' : 'Obra publicada');
                  load();
                } catch (e: any) { showToast(e.message, 'error'); }
              }}
            />
          ) : tab === 'artistas' ? (
            <ArtistasTab
              artistas={artistas}
              onAdd={() => { setEditingArtista(null); setShowArtistaForm(true); }}
              onEdit={a => { setEditingArtista(a); setShowArtistaForm(true); }}
              onDelete={async id => {
                if (!window.confirm('Deletar este artista?')) return;
                try { await artistasService.delete(id); showToast('Artista deletado'); load(); }
                catch (e: any) { showToast(e.message, 'error'); }
              }}
            />
          ) : (
            <AdminsTab onToast={showToast} />
          )}
        </div>
      </div>

      {/* Forms modais */}
      {showObraForm && (
        <ObraForm
          obra={editingObra}
          artistas={artistas}
          onSave={async (data, file) => {
            try {
              if (editingObra) {
                await obrasService.update(editingObra.id, data, file);
                showToast('✅ Obra atualizada!');
              } else {
                await obrasService.create(data as any, file);
                showToast('✅ Obra cadastrada!');
              }
              setShowObraForm(false);
              load();
            } catch (e: any) { showToast(e.message, 'error'); }
          }}
          onClose={() => setShowObraForm(false)}
        />
      )}

      {showArtistaForm && (
        <ArtistaForm
          artista={editingArtista}
          onSave={async (data) => {
            try {
              if (editingArtista) {
                await artistasService.update(editingArtista.id, data);
                showToast('✅ Artista atualizado!');
              } else {
                await artistasService.create(data as any);
                showToast('✅ Artista cadastrado!');
              }
              setShowArtistaForm(false);
              load();
            } catch (e: any) { showToast(e.message, 'error'); }
          }}
          onClose={() => setShowArtistaForm(false)}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>{toast.text}</div>
      )}
    </div>
  );
}

// ─── Obras Tab ────────────────────────────────────────────────

function ObrasTab({ obras, artistas, onAdd, onEdit, onDelete, onToggle }: {
  obras: Obra[]; artistas: Artista[];
  onAdd: () => void; onEdit: (o: Obra) => void;
  onDelete: (id: string) => void; onToggle: (o: Obra) => void;
}) {
  const artistaMap = Object.fromEntries(artistas.map(a => [a.id, a.nome]));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          {obras.length} obra{obras.length !== 1 ? 's' : ''} cadastrada{obras.length !== 1 ? 's' : ''}
        </p>
        <button onClick={onAdd} style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          color: '#fff', border: 'none', borderRadius: 8,
          padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>+ Nova Obra</button>
      </div>

      {obras.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>🎨</div>
          <p>Nenhuma obra cadastrada ainda.</p>
          <button onClick={onAdd} style={{
            marginTop: 16, background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '10px 20px',
            fontSize: 13, cursor: 'pointer',
          }}>Cadastrar primeira obra</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {obras.map(obra => (
            <div key={obra.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 16px',
              opacity: obra.disponivel ? 1 : 0.5,
            }}>
              <img src={obra.imagem_url} alt={obra.titulo}
                style={{ width: 56, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{obra.titulo}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {artistaMap[obra.artista_id] || '—'} · {obra.tecnica} · {obra.largura}×{obra.altura}cm
                  {obra.ano ? ` · ${obra.ano}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                {obra.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => onToggle(obra)} title={obra.disponivel ? 'Ocultar' : 'Publicar'}
                  style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {obra.disponivel ? '👁 Publicado' : '🚫 Oculto'}
                </button>
                <button onClick={() => onEdit(obra)}
                  style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                  ✏️ Editar
                </button>
                <button onClick={() => onDelete(obra.id)}
                  style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#ef4444' }}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Artistas Tab ─────────────────────────────────────────────

function ArtistasTab({ artistas, onAdd, onEdit, onDelete }: {
  artistas: Artista[]; onAdd: () => void;
  onEdit: (a: Artista) => void; onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          {artistas.length} artista{artistas.length !== 1 ? 's' : ''} cadastrado{artistas.length !== 1 ? 's' : ''}
        </p>
        <button onClick={onAdd} style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          color: '#fff', border: 'none', borderRadius: 8,
          padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>+ Novo Artista</button>
      </div>

      {artistas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>👤</div>
          <p>Nenhum artista cadastrado ainda.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Cadastre um artista antes de adicionar obras.</p>
          <button onClick={onAdd} style={{
            marginTop: 16, background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer',
          }}>Cadastrar primeiro artista</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {artistas.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 16px',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0, overflow: 'hidden',
              }}>
                {a.logo_url ? <img src={a.logo_url} alt={a.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.email}{a.website ? ` · ${a.website}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => onEdit(a)}
                  style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                  ✏️ Editar
                </button>
                <button onClick={() => onDelete(a.id)}
                  style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#ef4444' }}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Obra Form ────────────────────────────────────────────────

function ObraForm({ obra, artistas, onSave, onClose }: {
  obra: Obra | null; artistas: Artista[];
  onSave: (data: Partial<Obra>, file?: File) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    titulo: obra?.titulo || '',
    artista_id: obra?.artista_id || '',
    tecnica: obra?.tecnica || '',
    descricao: obra?.descricao || '',
    largura: obra?.largura?.toString() || '',
    altura: obra?.altura?.toString() || '',
    ano: obra?.ano?.toString() || '',
    preco: obra?.preco?.toString() || '',
    disponivel: obra?.disponivel ?? true,
    imagem_url: obra?.imagem_url || '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(obra?.imagem_url || '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(er => { const n = { ...er }; delete n[k]; return n; });
  };

  const handleImage = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.titulo.trim()) errs.titulo = 'Obrigatório';
    if (!form.artista_id) errs.artista_id = 'Selecione um artista';
    if (!form.tecnica.trim()) errs.tecnica = 'Obrigatório';
    if (!form.largura || isNaN(Number(form.largura))) errs.largura = 'Número inválido';
    if (!form.altura || isNaN(Number(form.altura))) errs.altura = 'Número inválido';
    if (!form.preco || isNaN(Number(form.preco))) errs.preco = 'Número inválido';
    if (!imagePreview && !form.imagem_url) errs.imagem = 'Adicione uma imagem';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({
        titulo: form.titulo,
        artista_id: form.artista_id,
        tecnica: form.tecnica,
        descricao: form.descricao || undefined,
        largura: Number(form.largura),
        altura: Number(form.altura),
        ano: form.ano ? Number(form.ano) : undefined,
        preco: Number(form.preco),
        disponivel: form.disponivel,
        imagem_url: form.imagem_url,
        imagens_extra: [],
      }, imageFile || undefined);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (err?: string): React.CSSProperties => ({
    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
    background: 'var(--bg-main)', border: `1px solid ${err ? '#ef4444' : 'var(--border)'}`,
    borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none',
    fontFamily: 'Inter, sans-serif',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh',
        overflow: 'auto', padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {obra ? 'Editar Obra' : 'Nova Obra'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Título */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Título *</label>
            <input style={inputStyle(errors.titulo)} value={form.titulo} onChange={set('titulo')} placeholder="Ex: Névoa Dourada" />
            {errors.titulo && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.titulo}</span>}
          </div>

          {/* Artista */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Artista *</label>
            <select style={inputStyle(errors.artista_id)} value={form.artista_id} onChange={set('artista_id')}>
              <option value="">Selecionar artista...</option>
              {artistas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            {errors.artista_id && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.artista_id}</span>}
          </div>

          {/* Técnica */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Técnica *</label>
            <input style={inputStyle(errors.tecnica)} value={form.tecnica} onChange={set('tecnica')} placeholder="Ex: Pintura a óleo" />
            {errors.tecnica && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.tecnica}</span>}
          </div>

          {/* Largura / Altura */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Largura (cm) *</label>
            <input style={inputStyle(errors.largura)} type="number" value={form.largura} onChange={set('largura')} placeholder="80" />
            {errors.largura && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.largura}</span>}
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Altura (cm) *</label>
            <input style={inputStyle(errors.altura)} type="number" value={form.altura} onChange={set('altura')} placeholder="100" />
            {errors.altura && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.altura}</span>}
          </div>

          {/* Preço / Ano */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Preço (R$) *</label>
            <input style={inputStyle(errors.preco)} type="number" value={form.preco} onChange={set('preco')} placeholder="780" />
            {errors.preco && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.preco}</span>}
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Ano</label>
            <input style={inputStyle()} type="number" value={form.ano} onChange={set('ano')} placeholder="2024" />
          </div>

          {/* Descrição */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Descrição</label>
            <textarea style={{ ...inputStyle(), resize: 'vertical', minHeight: 72 }} value={form.descricao} onChange={set('descricao')} placeholder="Descrição da obra..." />
          </div>

          {/* Imagem */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Imagem *</label>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 12, border: `2px dashed ${errors.imagem ? '#ef4444' : 'var(--border)'}`,
              borderRadius: 10, cursor: 'pointer', background: 'var(--bg-main)',
            }}>
              {imagePreview ? (
                <img src={imagePreview} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                <div style={{ width: 80, height: 60, background: 'var(--bg-card)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🖼</div>
              )}
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {imagePreview ? 'Clique para trocar a imagem' : 'Clique para fazer upload'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG, WebP — max 10MB</div>
              </div>
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleImage(e.target.files[0])} />
            </label>
            {errors.imagem && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.imagem}</span>}
          </div>

          {/* Disponível */}
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="disponivel" checked={form.disponivel}
              onChange={e => setForm(f => ({ ...f, disponivel: e.target.checked }))}
              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
            <label htmlFor="disponivel" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Disponível no catálogo público
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 0', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 10,
            fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            flex: 2, padding: '12px 0',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>
            {saving ? '⏳ Salvando...' : obra ? '✅ Salvar alterações' : '✅ Cadastrar obra'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Artista Form ─────────────────────────────────────────────

function ArtistaForm({ artista, onSave, onClose }: {
  artista: Artista | null;
  onSave: (data: Partial<Artista>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nome: artista?.nome || '',
    email: artista?.email || '',
    bio: artista?.bio || '',
    website: artista?.website || '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(er => { const n = { ...er }; delete n[k]; return n; });
  };

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.nome.trim()) errs.nome = 'Obrigatório';
    if (!form.email.trim()) errs.email = 'Obrigatório';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
    background: 'var(--bg-main)', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'Inter, sans-serif',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', maxWidth: 480, padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {artista ? 'Editar Artista' : 'Novo Artista'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { k: 'nome', label: 'Nome *', placeholder: 'Ex: Carla Mendes' },
            { k: 'email', label: 'E-mail *', placeholder: 'artista@email.com' },
            { k: 'website', label: 'Website', placeholder: 'https://...' },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{label}</label>
              <input style={{ ...inputStyle, borderColor: errors[k] ? '#ef4444' : 'var(--border)' }}
                value={(form as any)[k]} onChange={set(k)} placeholder={placeholder} />
              {errors[k] && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors[k]}</span>}
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Bio</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              value={form.bio} onChange={set('bio')} placeholder="Breve apresentação do artista..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 0', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 10,
            fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            flex: 2, padding: '12px 0',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>
            {saving ? '⏳ Salvando...' : artista ? '✅ Salvar' : '✅ Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admins Tab ───────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
}

function AdminsTab({ onToast }: { onToast: (t: string, type?: 'success' | 'error') => void }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Conta form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  // Novo admin form
  const [showNewAdmin, setShowNewAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirm, setAdminConfirm] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  useEffect(() => {
    authService.getUser().then(u => {
      setCurrentUser(u);
      setNewEmail(u?.email || '');
    });
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoadingAdmins(true);
    try {
      // Busca usuários via Supabase Admin API (service role) — se não tiver, lista pelo banco
      const result = await supabase.auth.admin?.listUsers?.() || {};
      const data = (result as any).data;
      if (data?.users) {
        setAdmins(data.users.map((u: any) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        })));
      } else {
        // Fallback: só mostra o usuário atual
        const u = await authService.getUser();
        if (u) setAdmins([{ id: u.id, email: u.email!, created_at: u.created_at || '' }]);
      }
    } catch {
      const u = await authService.getUser();
      if (u) setAdmins([{ id: u.id, email: u.email!, created_at: u.created_at || '' }]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim() || newEmail === currentUser?.email) return;
    setSavingAccount(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      onToast('✅ E-mail atualizado! Confirme no seu novo e-mail.');
    } catch (e: any) {
      onToast(e.message, 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return;
    if (newPassword.length < 6) { onToast('Senha deve ter pelo menos 6 caracteres', 'error'); return; }
    if (newPassword !== confirmPassword) { onToast('Senhas não conferem', 'error'); return; }
    setSavingAccount(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      onToast('✅ Senha atualizada com sucesso!');
    } catch (e: any) {
      onToast(e.message, 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!adminEmail.trim()) { onToast('E-mail obrigatório', 'error'); return; }
    if (adminPassword.length < 6) { onToast('Senha deve ter pelo menos 6 caracteres', 'error'); return; }
    if (adminPassword !== adminConfirm) { onToast('Senhas não conferem', 'error'); return; }
    setSavingAdmin(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
      });
      if (error) throw error;
      onToast(`✅ Admin "${adminEmail}" criado! Ele precisa confirmar o e-mail.`);
      setAdminEmail(''); setAdminPassword(''); setAdminConfirm('');
      setShowNewAdmin(false);
      loadAdmins();
    } catch (e: any) {
      onToast(e.message, 'error');
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (id === currentUser?.id) { onToast('Você não pode deletar sua própria conta', 'error'); return; }
    if (!window.confirm(`Remover acesso de "${email}"?`)) return;
    try {
      const { error } = await supabase.auth.admin?.deleteUser?.(id) || {};
      if (error) throw error;
      onToast('✅ Admin removido');
      loadAdmins();
    } catch (e: any) {
      // Se não tiver service role, orienta o usuário
      onToast('Para remover admins, acesse o Supabase Dashboard > Authentication > Users', 'error');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
    background: 'var(--bg-main)', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'Inter, sans-serif',
  };

  const sectionTitle = (icon: string, title: string, sub: string) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h4>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 26px' }}>{sub}</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Minha Conta ────────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        {sectionTitle('👤', 'Minha Conta', `Logado como: ${currentUser?.email || '...'}`)}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Trocar e-mail */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              Trocar E-mail
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input type="email" placeholder="Novo e-mail" value={newEmail}
                onChange={e => setNewEmail(e.target.value)} style={inputStyle} />
              <button
                onClick={handleUpdateEmail}
                disabled={savingAccount || newEmail === currentUser?.email}
                style={{
                  padding: '9px 0', background: 'var(--accent)', border: 'none',
                  borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: savingAccount ? 'not-allowed' : 'pointer',
                  opacity: (savingAccount || newEmail === currentUser?.email) ? 0.5 : 1,
                }}>
                {savingAccount ? 'Salvando...' : '✉️ Atualizar e-mail'}
              </button>
            </div>
          </div>

          {/* Trocar senha */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              Trocar Senha
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
              <input type="password" placeholder="Confirmar nova senha" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUpdatePassword()}
                style={{
                  ...inputStyle,
                  borderColor: confirmPassword && newPassword !== confirmPassword ? '#ef4444' : 'var(--border)',
                }} />
              {confirmPassword && newPassword !== confirmPassword && (
                <span style={{ fontSize: 11, color: '#ef4444' }}>Senhas não conferem</span>
              )}
              <button
                onClick={handleUpdatePassword}
                disabled={savingAccount || !newPassword}
                style={{
                  padding: '9px 0', background: 'var(--accent)', border: 'none',
                  borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: savingAccount ? 'not-allowed' : 'pointer',
                  opacity: (savingAccount || !newPassword) ? 0.5 : 1,
                }}>
                {savingAccount ? 'Salvando...' : '🔑 Atualizar senha'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lista de Admins ─────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        {sectionTitle('🔐', 'Administradores', 'Usuários com acesso ao painel admin')}

        {loadingAdmins ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Carregando...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {admins.map(admin => (
              <div key={admin.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg-main)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px',
                borderLeft: admin.id === currentUser?.id ? '3px solid var(--accent)' : '1px solid var(--border)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, flexShrink: 0,
                }}>
                  {admin.email[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {admin.email}
                    {admin.id === currentUser?.id && (
                      <span style={{ fontSize: 10, background: 'rgba(108,99,255,0.15)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4, marginLeft: 8, fontWeight: 600 }}>
                        VOCÊ
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Criado em {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                    {admin.last_sign_in_at && ` · Último acesso: ${new Date(admin.last_sign_in_at).toLocaleDateString('pt-BR')}`}
                  </div>
                </div>
                {admin.id !== currentUser?.id && (
                  <button
                    onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                    style={{
                      background: 'none', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                      fontSize: 12, color: '#ef4444', flexShrink: 0,
                    }}>
                    🗑 Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Novo Admin */}
        {!showNewAdmin ? (
          <button
            onClick={() => setShowNewAdmin(true)}
            style={{
              width: '100%', padding: '10px 0',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              border: 'none', borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
            + Adicionar novo admin
          </button>
        ) : (
          <div style={{
            background: 'var(--bg-main)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 16,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 14px' }}>
              Novo Administrador
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="email" placeholder="E-mail do novo admin" value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)} style={inputStyle} />
              <input type="password" placeholder="Senha (mín. 6 caracteres)" value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)} style={inputStyle} />
              <input type="password" placeholder="Confirmar senha" value={adminConfirm}
                onChange={e => setAdminConfirm(e.target.value)} style={{
                  ...inputStyle,
                  borderColor: adminConfirm && adminPassword !== adminConfirm ? '#ef4444' : 'var(--border)',
                }} />
              {adminConfirm && adminPassword !== adminConfirm && (
                <span style={{ fontSize: 11, color: '#ef4444' }}>Senhas não conferem</span>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowNewAdmin(false); setAdminEmail(''); setAdminPassword(''); setAdminConfirm(''); }}
                  style={{ flex: 1, padding: '9px 0', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleCreateAdmin} disabled={savingAdmin}
                  style={{ flex: 2, padding: '9px 0', background: 'var(--accent)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: savingAdmin ? 'not-allowed' : 'pointer', opacity: savingAdmin ? 0.7 : 1 }}>
                  {savingAdmin ? '⏳ Criando...' : '✅ Criar admin'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
