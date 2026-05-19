import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthProvider';
import { ThemeProvider } from './context/ThemeProvider';
import { ToastProvider } from './context/ToastProvider';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import './App.css';

/**
 * vite-react-ssg 라우트 트리의 루트 element.
 * 모든 페이지가 공유하는 Provider 와 레이아웃 요소를 한 곳에서 감싼다.
 * SSG 빌드 시 페이지마다 이 트리가 다시 prerender 되므로 무거운 사이드 이펙트는 두지 않는다.
 *
 * ToastProvider 는 자체 ToastContainer 를 렌더하므로 별도 컴포넌트 불필요.
 * notify 모듈이 ToastProvider 마운트 시 자동 bind 된다.
 */
export default function Layout() {
    return (
        <HelmetProvider>
            <ErrorBoundary>
                <ThemeProvider>
                    <ToastProvider>
                        <AuthProvider>
                            <Navbar />
                            <Suspense fallback={<div className="page-loading"><div className="spinner" /><p>로딩 중...</p></div>}>
                                <Outlet />
                            </Suspense>
                            {/* 데이터 라우터의 스크롤 복원: 페이지 전환 시 상단으로, 뒤로가기 시 이전 위치 복원 */}
                            <ScrollRestoration />
                        </AuthProvider>
                    </ToastProvider>
                </ThemeProvider>
            </ErrorBoundary>
        </HelmetProvider>
    );
}
