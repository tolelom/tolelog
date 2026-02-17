import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import 'katex/dist/katex.min.css'
import App from './App.jsx'
import {AuthProvider} from "./context/AuthProvider.jsx";
import {ThemeProvider} from "./context/ThemeProvider.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import {initKatex} from "./utils/markdownParser.js";

initKatex();

createRoot(document.getElementById('root')).render(
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
