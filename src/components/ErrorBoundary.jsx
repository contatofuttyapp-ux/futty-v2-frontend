// Futty v2.0 — Error boundary global (classe; hooks não funcionam aqui).
import React from 'react';
import ErrorPage from './ErrorPage';

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
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage onRetry={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
