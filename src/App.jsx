import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import EditorPage from './pages/EditorPage.jsx';
import PostDetailPage from './pages/PostDetailPage.jsx';
import UserProfilePage from './pages/UserProfilePage.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/post/:postId" element={<PostDetailPage />} />
                <Route path="/user/:userId" element={<UserProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/editor" element={<PrivateRoute><EditorPage /></PrivateRoute>} />
                <Route path="/editor/:postId" element={<PrivateRoute><EditorPage /></PrivateRoute>} />
                <Route path="/editor_private" element={<PrivateRoute><EditorPage /></PrivateRoute>} />

                <Route path="*" element={<div>페이지를 찾을 수 없습니다.(404)</div>} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
