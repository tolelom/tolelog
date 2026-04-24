import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App'
import {AuthProvider} from "./context/AuthProvider";
import {ThemeProvider} from "./context/ThemeProvider";
import {ToastProvider} from "./context/ToastProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import {initKatex} from "./utils/markdownParser";

initKatex().then(() => {
    import('katex/dist/katex.min.css');
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <ThemeProvider>
                <ToastProvider>
                    <AuthProvider>
                        <App/>
                    </AuthProvider>
                </ToastProvider>
            </ThemeProvider>
        </ErrorBoundary>
    </StrictMode>,
)
