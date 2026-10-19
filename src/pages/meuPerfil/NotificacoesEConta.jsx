// Futty v2.0 — Perfil: as seções Notificações e Conta.
import PreferenciasNotificacoes from '../../components/PreferenciasNotificacoes';
import Icon from '../../components/Icon';
import { CARD } from './estilos';
import { ContaRow, SecLabel } from './pecas';

export default function NotificacoesEConta({ navigate, pushDessubscrever, pushEstado, pushSubscrever, relatarProblema, setConfirmExcluir, setConfirmSignOut, setSheetExcluir, showToast, souSuperAdmin }) {
  return (
    <>
        {/* 6. SECÇÃO CONTA — no fim: é a zona de sessão, e o "Terminar sessão" é a
            última coisa que se quer encontrar por acidente. As notificações push são
            a primeira LINHA deste card (não secção própria), por isso vêm com ele. */}
        {/* SEÇÃO NOTIFICAÇÕES: neste aparelho (ligar/desligar o push) e, por tipo, o que você quer receber. */}
        <SecLabel>Notificações</SecLabel>
        <div className="hud-corners" style={{ ...CARD, overflow: 'hidden' }}>
          {pushEstado !== 'nao_suportado' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                <Icon name="sino" size={20} color="#d4a017" />
                Notificações neste celular
              </span>
              <input
                type="checkbox"
                checked={pushEstado === 'subscrito'}
                disabled={pushEstado === 'negado'}
                onChange={(e) => (e.target.checked ? pushSubscrever() : pushDessubscrever())}
                style={{ width: 20, height: 20, accentColor: '#8b5cf6' }}
                aria-label="Notificações neste celular"
              />
            </div>
          ) : null}
          <PreferenciasNotificacoes aoErro={(m) => showToast(m, 'error')} />
        </div>

        <SecLabel>Conta</SecLabel>
        <div className="hud-corners" style={{ ...CARD, overflow: 'hidden' }}>
          <ContaRow onClick={() => navigate('/alterar-password')}>
            <Icon name="cadeado" size={20} color="#d4a017" />
            Alterar senha
          </ContaRow>
          <ContaRow onClick={relatarProblema}>
            <Icon name="bandeira" size={20} color="#d4a017" />
            Relatar um problema
          </ContaRow>
          {/* O Diagnóstico não mora aqui: o número de todo mundo vem da
              telemetria anônima; a tela é do super-admin, dentro do Gabinete. */}
          {souSuperAdmin ? (
            <ContaRow onClick={() => navigate('/gabinete')} cor="#8b5cf6">
              <Icon name="definicoes" size={20} color="#d4a017" />
              Gabinete
            </ContaRow>
          ) : null}
          <ContaRow onClick={() => setConfirmSignOut(true)} cor="rgba(239,68,68,0.8)">
            <Icon name="sair" size={20} color="#d4a017" />
            Sair da conta
          </ContaRow>
          {/* Vermelho discreto (mais apagado que "Sair da conta"): é uma ação
              rara e séria, não precisa do mesmo peso visual da de todo dia.
              Ícone reaproveitado de "Sair" (não há um de lixeira no set custom
              de /public/icons) — mesmo padrão já usado com "cadeado" (senha e
              privacidade dividem o ícone). */}
          <ContaRow onClick={() => { setConfirmExcluir(''); setSheetExcluir(true); }} cor="rgba(239,68,68,0.5)" semBorda>
            <Icon name="sair" size={20} color="#d4a017" />
            Excluir conta
          </ContaRow>
        </div>
    </>
  );
}
