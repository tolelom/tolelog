import './App.css'
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const SeriesDetailPage = lazy(() => import('./pages/SeriesDetailPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
    return (
        <BrowserRouter>
            <ErrorBoundary>
            <Suspense fallback={<div className="page-loading"><div className="spinner" /><p>로딩 중...</p></div>}>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/post/:postId" element={<PostDetailPage />} />
                <Route path="/user/:userId" element={<UserProfilePage />} />
                <Route path="/series/:seriesId" element={<SeriesDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/editor" element={<PrivateRoute><EditorPage /></PrivateRoute>} />
                <Route path="/editor/:postId" element={<PrivateRoute><EditorPage /></PrivateRoute>} />
                <Route path="/editor_private" element={<PrivateRoute><EditorPage /></PrivateRoute>} />

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
            </ErrorBoundary>
        </BrowserRouter>
    )
}

export default App
