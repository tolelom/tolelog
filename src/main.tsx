import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import 'katex/dist/katex.min.css'
import App from './App'
import {AuthProvider} from "./context/AuthProvider";
import {ThemeProvider} from "./context/ThemeProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import {initKatex} from "./utils/markdownParser";

initKatex();

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
