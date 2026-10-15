import { lazy } from 'react';
import type { RouteRecord } from 'vite-react-ssg';
import Layout from './Layout';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

const EditorPage = lazy(() => import('./pages/EditorPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DraftsPage = lazy(() => import('./pages/DraftsPage'));

// 공개 라우트는 route.lazy 로 불러온다. Component 에 React.lazy 를 넘기면 vite-react-ssg 가 에셋을 모을 때
// 이미 로드된 lazy 의 모듈 객체에 toString 을 불러 prerender 가 페이지 순서에 따라 실패한다.
// Private 라우트는 element 에 JSX 로 직접 PrivateRoute 래핑.
// SSG 단계에서 token=null 로 렌더되지만 이 라우트들은 ssgOptions.includedRoutes 에서 prerender 제외됨.
export const routes: RouteRecord[] = [
    {
        path: '/',
        element: <Layout />,
        entry: 'src/Layout.tsx',
        children: [
            { index: true, lazy: async () => ({ Component: (await import('./pages/HomePage')).default }), entry: 'src/pages/HomePage.tsx' },
            { path: 'post/:postId', lazy: async () => ({ Component: (await import('./pages/PostDetailPage')).default }), entry: 'src/pages/PostDetailPage.tsx' },
            { path: 'user/:userId', lazy: async () => ({ Component: (await import('./pages/UserProfilePage')).default }), entry: 'src/pages/UserProfilePage.tsx' },
            { path: 'series/:seriesId', lazy: async () => ({ Component: (await import('./pages/SeriesDetailPage')).default }), entry: 'src/pages/SeriesDetailPage.tsx' },
            { path: 'login', lazy: async () => ({ Component: (await import('./pages/LoginPage')).default }), entry: 'src/pages/LoginPage.tsx' },
            { path: 'register', lazy: async () => ({ Component: (await import('./pages/RegisterPage')).default }), entry: 'src/pages/RegisterPage.tsx' },
            { path: 'settings', element: <PrivateRoute><SettingsPage /></PrivateRoute> },
            { path: 'drafts', element: <PrivateRoute><DraftsPage /></PrivateRoute> },
            { path: 'editor', element: <PrivateRoute><EditorPage /></PrivateRoute> },
            { path: 'editor/:postId', element: <PrivateRoute><EditorPage /></PrivateRoute> },
            { path: 'editor_private', element: <PrivateRoute><EditorPage /></PrivateRoute> },
            { path: '*', lazy: async () => ({ Component: (await import('./pages/NotFoundPage')).default }), entry: 'src/pages/NotFoundPage.tsx' },
        ],
    },
];
