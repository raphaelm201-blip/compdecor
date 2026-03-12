// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Tipos ──────────────────────────────────────────────────────

export interface Artista {
  id: string;
  nome: string;
  email: string;
  bio?: string;
  website?: string;
  logo_url?: string;
}

export interface Obra {
  id: string;
  titulo: string;
  artista_id: string;
  artista?: Artista;
  descricao?: string;
  tecnica: string;
  largura: number;
  altura: number;
  ano?: number;
  preco: number;
  disponivel: boolean;
  imagem_url: string;
  imagens_extra: string[];
  criado_em: string;
}

export interface Cena {
  id: string;
  nome: string;
  categoria: string;
  imagem_url: string;
  parede_x: number;   // % da largura da imagem (0-100)
  parede_y: number;   // % da altura da imagem (0-100)
  parede_w: number;   // largura disponível em px na imagem original
  parede_h: number;   // altura disponível em px na imagem original
}

export interface ItemOrcamentoInput {
  obra_id: string;
  obra?: Obra;
  mockup_url?: string;
  cena_usada?: string;
  quantidade: number;
  preco_unitario: number;
}

export interface OrcamentoInput {
  artista_id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone?: string;
  observacoes?: string;
  itens: ItemOrcamentoInput[];
}

// ── Queries ───────────────────────────────────────────────────

export const obrasQuery = {
  listar: async (artistaId?: string) => {
    let q = supabase
      .from('obras')
      .select('*, artista:artistas(id, nome, logo_url)')
      .eq('disponivel', true)
      .order('criado_em', { ascending: false });
    if (artistaId) q = q.eq('artista_id', artistaId);
    const { data, error } = await q;
    if (error) throw error;
    return data as Obra[];
  },

  buscar: async (id: string) => {
    const { data, error } = await supabase
      .from('obras')
      .select('*, artista:artistas(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Obra;
  },
};

export const cenasQuery = {
  listar: async (categoria?: string) => {
    let q = supabase
      .from('cenas')
      .select('*')
      .eq('ativa', true)
      .order('nome');
    if (categoria) q = q.eq('categoria', categoria);
    const { data, error } = await q;
    if (error) throw error;
    return data as Cena[];
  },
};

export const orcamentosQuery = {
  criar: async (input: OrcamentoInput) => {
    // 1. Cria o orçamento
    const { data: orcamento, error: errOrc } = await supabase
      .from('orcamentos')
      .insert({
        artista_id: input.artista_id,
        cliente_nome: input.cliente_nome,
        cliente_email: input.cliente_email,
        cliente_telefone: input.cliente_telefone,
        observacoes: input.observacoes,
        status: 'ENVIADO',
      })
      .select()
      .single();
    if (errOrc) throw errOrc;

    // 2. Insere os itens
    const itens = input.itens.map(i => ({
      orcamento_id: orcamento.id,
      obra_id: i.obra_id,
      mockup_url: i.mockup_url,
      cena_usada: i.cena_usada,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
    }));
    const { error: errItens } = await supabase.from('itens_orcamento').insert(itens);
    if (errItens) throw errItens;

    return orcamento;
  },
};

// ── Storage helpers ───────────────────────────────────────────

export const storageHelper = {
  /**
   * Faz upload de um Blob/File para o Supabase Storage.
   * Retorna a URL pública do arquivo.
   */
  upload: async (bucket: string, path: string, file: Blob | File): Promise<string> => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Upload de PDF (Blob) para o bucket de orçamentos.
   */
  uploadPdf: async (orcamentoId: string, pdfBlob: Blob): Promise<string> => {
    return storageHelper.upload('orcamentos', `${orcamentoId}.pdf`, pdfBlob);
  },

  /**
   * Upload do mockup gerado (canvas blob).
   */
  uploadMockup: async (obraId: string, cenaId: string, blob: Blob): Promise<string> => {
    const path = `mockups/${obraId}-${cenaId}-${Date.now()}.jpg`;
    return storageHelper.upload('mockups', path, blob);
  },

  /**
   * Upload da foto do cliente para o fluxo "Meu Ambiente".
   */
  uploadAmbiente: async (obraId: string, blob: Blob): Promise<string> => {
    const path = `ambientes/${obraId}-${Date.now()}.jpg`;
    return storageHelper.upload('mockups', path, blob);
  },
};
