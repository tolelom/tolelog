import { Component } from 'react';
import { Link } from 'react-router-dom';
import './ErrorBoundary.css';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
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
                        <Link to="/" onClick={() => this.setState({ hasError: false })}>
                            홈으로 돌아가기
                        </Link>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
