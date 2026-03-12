import { useState } from 'react';
import './App.css';
import { Visualizador } from './components/Visualizador';
import { Historico } from './components/Historico';
import type { OrcamentoHistorico } from './lib/storage';

function App() {
  const [currentTab, setCurrentTab] = useState<'novo' | 'historico'>('historico');
  const [editingOrcamento, setEditingOrcamento] = useState<OrcamentoHistorico | null>(null);

  const handleEditar = (orcamento: OrcamentoHistorico) => {
    setEditingOrcamento(orcamento);
    setCurrentTab('novo');
  };

  const handleNovo = () => {
    setEditingOrcamento(null);
    setCurrentTab('novo');
  };

  return (
    <div className="app-container">
      {/* Navbar global */}
      <header className="global-header">
        <div className="header-logo">CompDecor</div>
        <div className="header-nav">
          <button
            className={`nav-btn ${currentTab === 'novo' ? 'active' : ''}`}
            onClick={handleNovo}
          >
            🎨 {editingOrcamento ? 'Editando Projeto' : 'Novo Projeto'}
          </button>
          <button
            className={`nav-btn ${currentTab === 'historico' ? 'active' : ''}`}
            onClick={() => setCurrentTab('historico')}
          >
            📁 Meus Orçamentos
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {currentTab === 'historico' ? (
          <Historico onEditar={handleEditar} onNovo={handleNovo} />
        ) : (
          <Visualizador initialData={editingOrcamento} key={editingOrcamento?.id || 'new'} />
        )}
      </main>
    </div>
  );
}

export default App;
