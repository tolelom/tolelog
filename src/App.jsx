import './App.css'
import {BrowserRouter, Routes, Link, Route} from "react-router-dom";
import HomePage from './pages/HomePage.jsx';
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import EditorPage from "./pages/EditorPage.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";

function App() {
    return (
        <BrowserRouter>
            {/*<nav>*/}
            {/*    <Link to='/'>홈</Link>*/}
            {/*    <Link to="/contact">문의</Link>*/}
            {/*</nav>*/}

            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/editor" element={<EditorPage />} />
                <Route path="/editor_private" element={<PrivateRoute><EditorPage /></PrivateRoute>} />

                <Route path="*" element={<div>페이지를 찾을 수 없습니다.(404)</div>} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
