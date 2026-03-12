import { useState, useEffect } from 'react';
import { listarOrcamentos, deletarOrcamento, type OrcamentoHistorico } from '../lib/storage';
import { gerarOrcamentoPdf } from '../lib/gerarOrcamentoPdf';

interface Props {
    onEditar: (orcamento: OrcamentoHistorico) => void;
    onNovo: () => void;
}

export function Historico({ onEditar, onNovo }: Props) {
    const [orcamentos, setOrcamentos] = useState<OrcamentoHistorico[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setOrcamentos(listarOrcamentos());
    }, []);

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
            deletarOrcamento(id);
            setOrcamentos(listarOrcamentos());
        }
    };

    const handleBaixar = async (orc: OrcamentoHistorico) => {
        await gerarOrcamentoPdf(orc.cliente, orc.items);
    };

    return (
        <div className="historico-layout">
            <div className="historico-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="historico-logo">🖼</div>
                    <div>
                        <h1 className="historico-title">Meus Orçamentos</h1>
                        <p className="historico-subtitle">Acesse e edite seus orçamentos salvos</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div className="historico-search">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar cliente ou projeto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onNovo}>
                        + Novo Projeto
                    </button>
                </div>
            </div>

            <div className="historico-grid">
                {orcamentos.length === 0 ? (
                    <div className="historico-empty">
                        <div className="empty-icon">📁</div>
                        <p>Nenhum orçamento salvo ainda.</p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onNovo}>
                            Criar o primeiro
                        </button>
                    </div>
                ) : (
                    (() => {
                        const filtered = orcamentos.filter(orc => {
                            const term = searchTerm.toLowerCase();
                            const matchesClient = orc.cliente.nome.toLowerCase().includes(term);
                            const matchesProject = (orc.items[0]?.titulo || '').toLowerCase().includes(term);
                            return matchesClient || matchesProject;
                        });

                        if (filtered.length === 0) {
                            return (
                                <div className="historico-empty" style={{ gridColumn: '1 / -1' }}>
                                    <div className="empty-icon">🔍</div>
                                    <p>Nenhum orçamento encontrado para "{searchTerm}".</p>
                                    <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setSearchTerm('')}>
                                        Limpar busca
                                    </button>
                                </div>
                            );
                        }

                        return filtered.map((orc) => (
                            <div key={orc.id} className="historico-card fade-in">
                                <div className="card-thumb">
                                    {orc.thumbnailBase64 ? (
                                        <img src={orc.thumbnailBase64} alt="composição" />
                                    ) : (
                                        <div className="thumb-placeholder">Sem imagem</div>
                                    )}
                                </div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h3 className="card-titulo">{orc.items[0]?.titulo || 'Obra sem título'}</h3>
                                        <div className="card-data">
                                            {new Date(orc.dataCriacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                        </div>
                                    </div>
                                    <div className="card-cliente">👤 {orc.cliente.nome}</div>
                                    <div className="card-total">
                                        {((orc.items[0]?.preco || 0) * (orc.items[0]?.quantidade || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>

                                    <div className="card-actions">
                                        <button className="btn btn-ghost btn-sm" onClick={() => onEditar(orc)}>
                                            ✏️ Editar
                                        </button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleBaixar(orc)}>
                                            📄 Baixar PDF
                                        </button>
                                        <button className="btn btn-ghost btn-danger btn-sm" onClick={() => handleDelete(orc.id)} title="Excluir">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ));
                    })()
                )}
            </div>
        </div>
    );
}
