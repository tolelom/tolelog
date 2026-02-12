import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.js';
import './HomePage.css';

export default function HomePage() {
    const { username } = useContext(AuthContext);

    return (
        <>
            <h1>tolelog</h1>

            {username ? (
                <>
                    <p className="home-greeting">
                        안녕하세요, {username}님
                    </p>
                    <Link to="/editor_private" className="home-action-link">
                        글쓰기
                    </Link>
                </>
            ) : (
                <Link to="/login" className="home-action-link">
                    로그인
                </Link>
            )}
        </>
    );
}
