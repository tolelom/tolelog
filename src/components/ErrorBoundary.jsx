import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '60vh', padding: '20px',
                    textAlign: 'center', color: 'var(--text-primary)',
                }}>
                    <h2 style={{ marginBottom: '16px' }}>문제가 발생했습니다</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                        페이지를 새로고침하거나 아래 버튼을 눌러주세요.
                    </p>
                    <button
                        onClick={this.handleReset}
                        style={{
                            padding: '12px 24px', borderRadius: '6px', border: 'none',
                            backgroundColor: 'var(--accent-color)', color: 'white',
                            fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                        }}
                    >
                        다시 시도
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
