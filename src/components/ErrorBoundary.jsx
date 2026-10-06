// Futty v2.0 — Error boundary global (classe; hooks não funcionam aqui).
import React from 'react';
import ErrorPage from './ErrorPage';
import { gravarUltimoErro } from '../lib/ultimoErro';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info);
    // Sem isto, um crash no celular morre no console — ninguém
    // tem acesso remoto na hora. Fica em localStorage (Perfil → Diagnóstico
    // lê); "Algo deu errado" continua a mensagem principal, isto é só a letra
    // pequena por baixo, para quem sabe o que está a ler.
    gravarUltimoErro(error, window.location.pathname);
  }

  render() {
    if (this.state.hasError) {
      // A linha técnica ("Failed to fetch dynamically imported module: …/LandingPage-xxx.js") NÃO vai para a
      // tela — fica no console (componentDidCatch) e no Diagnóstico (gravarUltimoErro). Na tela, só a frase da
      // casa.
      return <ErrorPage onRetry={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
