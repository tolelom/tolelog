import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
    useEffect(() => { document.title = '404 | Tolelog'; }, []);
    return (
        <div className="not-found-page">
            <p className="not-found-code">404</p>
            <h1 className="not-found-title">페이지를 찾을 수 없습니다</h1>
            <p className="not-found-desc">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
            <Link to="/" className="not-found-link">홈으로 돌아가기</Link>
        </div>
    );
}
