import { lazy } from 'react';
import type { RouteRecord } from 'vite-react-ssg';
import Layout from './Layout';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const SeriesDetailPage = lazy(() => import('./pages/SeriesDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DraftsPage = lazy(() => import('./pages/DraftsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Private 라우트는 element 에 JSX 로 직접 PrivateRoute 래핑.
// SSG 단계에서 token=null 로 렌더되지만 이 라우트들은 ssgOptions.includedRoutes 에서 prerender 제외됨.
export const routes: RouteRecord[] = [
    {
        path: '/',
        element: <Layout />,
        entry: 'src/Layout.tsx',
        children: [
            { index: true, Component: HomePage, entry: 'src/pages/HomePage.tsx' },
            { path: 'post/:postId', Component: PostDetailPage, entry: 'src/pages/PostDetailPage.tsx' },
            { path: 'user/:userId', Component: UserProfilePage, entry: 'src/pages/UserProfilePage.tsx' },
            { path: 'series/:seriesId', Component: SeriesDetailPage, entry: 'src/pages/SeriesDetailPage.tsx' },
            { path: 'login', Component: LoginPage, entry: 'src/pages/LoginPage.tsx' },
            { path: 'register', Component: RegisterPage, entry: 'src/pages/RegisterPage.tsx' },
            { path: 'settings', element: <PrivateRoute><SettingsPage /></PrivateRoute> },
            { path: 'drafts', element: <PrivateRoute><DraftsPage /></PrivateRoute> },
            { path: 'editor', element: <PrivateRoute><EditorPage /></PrivateRoute> },
            { path: 'editor/:postId', element: <PrivateRoute><EditorPage /></PrivateRoute> },
            { path: 'editor_private', element: <PrivateRoute><EditorPage /></PrivateRoute> },
            { path: '*', Component: NotFoundPage, entry: 'src/pages/NotFoundPage.tsx' },
        ],
    },
];
