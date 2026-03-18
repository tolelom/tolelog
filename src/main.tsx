import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App'
import {AuthProvider} from "./context/AuthProvider";
import {ThemeProvider} from "./context/ThemeProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import {initKatex} from "./utils/markdownParser";

// KaTeX CSS와 모듈을 비동기로 로드 (초기 번들에서 제외)
initKatex().then(() => {
    import('katex/dist/katex.min.css');
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <ThemeProvider>
                <AuthProvider>
                    <App/>
                </AuthProvider>
            </ThemeProvider>
        </ErrorBoundary>
    </StrictMode>,
)
