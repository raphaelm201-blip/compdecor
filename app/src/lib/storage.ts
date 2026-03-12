import type { DadosCliente, ItemOrcamento } from './gerarOrcamentoPdf';

export interface OrcamentoEstadoCanvas {
    bgUrl: string | null;
    artUrl: string | null;
    artW: number;
    artH: number;
    rotation: number;
    opacity: number;
    position: { x: number; y: number };
}

export interface OrcamentoHistorico {
    id: string;
    dataCriacao: string;
    cliente: DadosCliente;
    items: ItemOrcamento[];
    estadoCanvas: OrcamentoEstadoCanvas;
    thumbnailBase64?: string; // miniatura em baixa quali
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
        thumbnailBase64
    };

    orcamentos.unshift(novo);

    // Limita a 50 orçamentos no localStorage para não estourar limite (5MB)
    if (orcamentos.length > 50) {
        orcamentos.pop();
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orcamentos));
    } catch (err) {
        console.warn('Falha ao salvar no localStorage (limite excedido?)', err);
        // Se estourar limite, remove o final e tenta dnv
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
        orcamentos.forEach((o, index) => {
            if (!o.id) {
                // Retrocompatibilidade para itens antigos salvos antes da adição de IDs
                o.id = crypto.randomUUID ? crypto.randomUUID() : `legacy-${index}-${Date.now()}`;
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orcamentos));
        }

        return orcamentos;
    } catch {
        return [];
    }
}

export function deletarOrcamento(id: string): void {
    const orcamentos = listarOrcamentos().filter((o) => o.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orcamentos));
}

// ── GALERIA DE ARTES ──────────────────────────────────────────

export interface ArteSalva {
    id: string;
    dataCriacao: string;
    nome: string;
    dataUrl: string;
}

const ARTES_STORAGE_KEY = '@compdecor:artes';

export function salvarArte(dataUrl: string, nome: string): ArteSalva {
    const artes = listarArtes();

    // Evita duplicidade simples por nome (opcional, mas ajuda a não ter a mesma imagem mil vezes)
    const existente = artes.find(a => a.nome === nome && a.dataUrl.length === dataUrl.length);
    if (existente) return existente;

    const nova: ArteSalva = {
        id: crypto.randomUUID ? crypto.randomUUID() : `art-${Date.now()}`,
        dataCriacao: new Date().toISOString(),
        nome,
        dataUrl
    };

    artes.unshift(nova);

    // Limita a 50 artes salvas
    if (artes.length > 50) {
        artes.pop();
    }

    try {
        localStorage.setItem(ARTES_STORAGE_KEY, JSON.stringify(artes));
    } catch (err) {
        console.warn('Falha ao salvar arte no localStorage limit excedido', err);
        // Fallback igual ao orcamento
        if (artes.length > 1) {
            artes.pop();
            localStorage.setItem(ARTES_STORAGE_KEY, JSON.stringify(artes));
        }
    }

    return nova;
}

export function listarArtes(): ArteSalva[] {
    try {
        const raw = localStorage.getItem(ARTES_STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as ArteSalva[];
    } catch {
        return [];
    }
}

export function deletarArte(id: string): void {
    const artes = listarArtes().filter((a) => a.id !== id);
    localStorage.setItem(ARTES_STORAGE_KEY, JSON.stringify(artes));
}
