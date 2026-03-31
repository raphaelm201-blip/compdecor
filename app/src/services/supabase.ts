import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Types (espelham o schema do banco) ──────────────────────

export interface Artista {
  id: string;
  nome: string;
  email: string;
  bio?: string;
  website?: string;
  logo_url?: string;
  criado_em: string;
}

export interface Obra {
  id: string;
  artista_id: string;
  titulo: string;
  descricao?: string;
  tecnica: string;
  largura: number;   // cm
  altura: number;    // cm
  ano?: number;
  preco: number;
  disponivel: boolean;
  imagem_url: string;
  imagens_extra: string[];
  criado_em: string;
  atualizado_em: string;
  // join
  artistas?: Artista;
}

export interface Cena {
  id: string;
  nome: string;
  categoria: string;
  imagem_url: string;
  parede_x: number;
  parede_y: number;
  parede_w: number;
  parede_h: number;
  ativa: boolean;
  criado_em: string;
}

// ─── Auth ─────────────────────────────────────────────────────

export const authService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },
  async logout() {
    await supabase.auth.signOut();
  },
  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
  },
  onAuthChange(cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(cb);
  },
  async updateEmail(email: string) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw new Error(error.message);
  },
  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },
};

// ─── Obras ────────────────────────────────────────────────────

export const obrasService = {
  async list({
    search = '',
    artista_id = '',
    tecnica = '',
    page = 1,
    limit = 20,
    apenasDisponiveis = true,
  } = {}) {
    let query = supabase
      .from('obras')
      .select('*, artistas(id, nome)', { count: 'exact' })
      .order('criado_em', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (apenasDisponiveis) query = query.eq('disponivel', true);
    if (artista_id) query = query.eq('artista_id', artista_id);
    if (tecnica) query = query.eq('tecnica', tecnica);
    if (search) {
      query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return {
      data: data as Obra[],
      meta: { total: count ?? 0, page, limit, pages: Math.ceil((count ?? 0) / limit) },
    };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('obras')
      .select('*, artistas(*)')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data as Obra;
  },

  // Admin: cria obra com upload de imagem
  async create(obra: Omit<Obra, 'id' | 'criado_em' | 'atualizado_em' | 'artistas'>, imageFile?: File) {
    let imagem_url = obra.imagem_url;

    if (imageFile) {
      const { url } = await storageService.uploadObra(imageFile);
      imagem_url = url;
    }

    const { data, error } = await supabase
      .from('obras')
      .insert({ ...obra, imagem_url })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Obra;
  },

  async update(id: string, updates: Partial<Obra>, imageFile?: File) {
    if (imageFile) {
      const { url } = await storageService.uploadObra(imageFile);
      updates.imagem_url = url;
    }
    const { data, error } = await supabase
      .from('obras')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Obra;
  },

  async delete(id: string) {
    const { error } = await supabase.from('obras').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ─── Artistas ─────────────────────────────────────────────────

export const artistasService = {
  async list() {
    const { data, error } = await supabase
      .from('artistas')
      .select('*')
      .order('nome');
    if (error) throw new Error(error.message);
    return data as Artista[];
  },

  async create(artista: Omit<Artista, 'id' | 'criado_em'>, logoFile?: File) {
    let logo_url = artista.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split('.').pop();
      const path = `artistas/${Date.now()}.${ext}`;
      await supabase.storage.from('obras').upload(path, logoFile);
      const { data } = supabase.storage.from('obras').getPublicUrl(path);
      logo_url = data.publicUrl;
    }
    const { data, error } = await supabase
      .from('artistas')
      .insert({ ...artista, logo_url })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Artista;
  },

  async update(id: string, updates: Partial<Artista>) {
    const { data, error } = await supabase
      .from('artistas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Artista;
  },

  async delete(id: string) {
    const { error } = await supabase.from('artistas').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ─── Cenas ────────────────────────────────────────────────────

export const cenasService = {
  async list() {
    const { data, error } = await supabase
      .from('cenas')
      .select('*')
      .eq('ativa', true)
      .order('nome');
    if (error) throw new Error(error.message);
    return data as Cena[];
  },
};

// ─── Storage ──────────────────────────────────────────────────

export const storageService = {
  async uploadObra(file: File) {
    const ext = file.name.split('.').pop();
    const path = `obras/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('obras')
      .upload(path, file, { cacheControl: '31536000', upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('obras').getPublicUrl(path);
    return { url: data.publicUrl, path };
  },

  async deleteFile(bucket: string, path: string) {
    await supabase.storage.from(bucket).remove([path]);
  },
};
