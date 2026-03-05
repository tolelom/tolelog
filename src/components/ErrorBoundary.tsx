import React, { Component, ErrorInfo } from 'react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <h2>오류가 발생했습니다</h2>
                    <p>예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
                    <div className="error-boundary-actions">
                        <button onClick={() => this.setState({ hasError: false })}>
                            다시 시도
                        </button>
                        <a href="/" onClick={() => this.setState({ hasError: false })}>
                            홈으로 돌아가기
                        </a>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
