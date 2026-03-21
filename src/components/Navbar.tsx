import { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/constants';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

export default function Navbar() {
    const location = useLocation();
    const { token, username, userId, avatarUrl, logout } = useContext(AuthContext);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [hidden, setHidden] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const lastScrollY = useRef(0);

    const isEditorPage = location.pathname.startsWith('/editor');

    // 스크롤 다운 숨김 / 업 재등장
    useEffect(() => {
        if (isEditorPage) return;
        const handleScroll = () => {
            const currentY = window.scrollY;
            if (currentY > lastScrollY.current && currentY > 60) {
                setHidden(true);
            } else {
                setHidden(false);
            }
            lastScrollY.current = currentY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isEditorPage]);

    // 드롭다운 외부 클릭 닫기
    useEffect(() => {
        if (!dropdownOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [dropdownOpen]);

    // 페이지 이동 시 드롭다운 닫기
    useEffect(() => {
        setDropdownOpen(false);
    }, [location.pathname]);

    const handleLogout = useCallback(() => {
        setDropdownOpen(false);
        logout();
    }, [logout]);

    // EditorPage에서는 렌더링하지 않음
    if (isEditorPage) {
        return null;
    }

    return (
        <nav className={`navbar${hidden ? ' navbar-hidden' : ''}`}>
            <div className="navbar-inner">
                <Link to="/" className="navbar-logo">tolelog</Link>

                <div className="navbar-right">
                    <div className="navbar-theme">
                        <ThemeToggle />
                    </div>

                    {token ? (
                        <>
                            <Link to="/editor_private" className="navbar-write-btn">
                                글쓰기
                            </Link>

                            <div className="navbar-profile" ref={dropdownRef}>
                                <button
                                    className="navbar-avatar-btn"
                                    onClick={() => setDropdownOpen(prev => !prev)}
                                    aria-expanded={dropdownOpen}
                                    aria-haspopup="true"
                                    aria-label="사용자 메뉴"
                                >
                                    {avatarUrl ? (
                                        <img
                                            src={`${API_BASE_URL}${avatarUrl}`}
                                            alt={username || ''}
                                            className="navbar-avatar-img"
                                        />
                                    ) : (
                                        <span className="navbar-avatar-fallback">
                                            {username ? username.charAt(0).toUpperCase() : '?'}
                                        </span>
                                    )}
                                </button>

                                {dropdownOpen && (
                                    <div className="navbar-dropdown" role="menu">
                                        <div className="navbar-dropdown-header">
                                            <span className="navbar-dropdown-username">{username}</span>
                                        </div>
                                        <Link
                                            to={`/user/${userId}`}
                                            className="navbar-dropdown-item"
                                            role="menuitem"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            내 프로필
                                        </Link>
                                        <Link
                                            to="/settings"
                                            className="navbar-dropdown-item"
                                            role="menuitem"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            설정
                                        </Link>
                                        <Link
                                            to="/drafts"
                                            className="navbar-dropdown-item"
                                            role="menuitem"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            내 초안
                                        </Link>
                                        <div className="navbar-dropdown-divider" />
                                        <button
                                            className="navbar-dropdown-item navbar-dropdown-logout"
                                            role="menuitem"
                                            onClick={handleLogout}
                                        >
                                            로그아웃
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="navbar-link">로그인</Link>
                            <Link to="/register" className="navbar-link navbar-link-register">회원가입</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
