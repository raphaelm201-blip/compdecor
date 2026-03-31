import type { DadosCliente, ItemOrcamento } from './gerarOrcamentoPdf';
import type { FrameItem } from '../components/ArtCanvas';

export interface OrcamentoEstadoCanvas {
    bgUrl: string | null;
    // Retrocompatibilidade
    artUrl: string | null;
    artW: number;
    artH: number;
    rotation: number;
    opacity: number;
    position: { x: number; y: number };
    // Novo: múltiplos quadros
    frames?: FrameItem[];
}

export interface OrcamentoHistorico {
    id: string;
    dataCriacao: string;
    cliente: DadosCliente;
    items: ItemOrcamento[];
    estadoCanvas: OrcamentoEstadoCanvas;
    thumbnailBase64?: string;
}

const STORAGE_KEY = '@compdecor:orcamentos';

export function salvarOrcamento(
    cliente: DadosCliente,
    items: ItemOrcamento[],
    estadoCanvas: OrcamentoEstadoCanvas,
    thumbnailBase64?: string
): OrcamentoHistorico {
    const orcamentos = listarOrcamentos();

    const novo: OrcamentoHistorico = {
        id: crypto.randomUUID(),
        dataCriacao: new Date().toISOString(),
        cliente,
        items,
        estadoCanvas,
        thumbnailBase64,
    };

    orcamentos.unshift(novo);
    if (orcamentos.length > 50) orcamentos.pop();

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orcamentos));
    } catch {
        if (orcamentos.length > 1) {
            orcamentos.pop();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orcamentos));
        }
    }

    return novo;
}

export function listarOrcamentos(): OrcamentoHistorico[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const orcamentos = JSON.parse(raw) as OrcamentoHistorico[];
        let changed = false;
        orcamentos.forEach((o, i) => {
            if (!o.id) { o.id = `legacy-${i}-${Date.now()}`; changed = true; }
        });
        if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(orcamentos));
        return orcamentos;
    } catch { return []; }
}

export function deletarOrcamento(id: string): void {
    const orcamentos = listarOrcamentos().filter(o => o.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orcamentos));
}

// ── Galeria de artes ──────────────────────────────────────────────────────────

export interface ArteSalva {
    id: string;
    dataCriacao: string;
    nome: string;
    dataUrl: string;
}

const ARTES_KEY = '@compdecor:artes';

export function salvarArte(dataUrl: string, nome: string): ArteSalva {
    const artes = listarArtes();
    const existente = artes.find(a => a.nome === nome && a.dataUrl.length === dataUrl.length);
    if (existente) return existente;

    const nova: ArteSalva = {
        id: crypto.randomUUID(),
        dataCriacao: new Date().toISOString(),
        nome,
        dataUrl,
    };

    artes.unshift(nova);
    if (artes.length > 50) artes.pop();

    try {
        localStorage.setItem(ARTES_KEY, JSON.stringify(artes));
    } catch {
        if (artes.length > 1) {
            artes.pop();
            localStorage.setItem(ARTES_KEY, JSON.stringify(artes));
        }
    }

    return nova;
}

export function listarArtes(): ArteSalva[] {
    try {
        const raw = localStorage.getItem(ARTES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function deletarArte(id: string): void {
    const artes = listarArtes().filter(a => a.id !== id);
    localStorage.setItem(ARTES_KEY, JSON.stringify(artes));
}
