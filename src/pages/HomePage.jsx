import {Link} from 'react-router-dom';
import {useState} from 'react';

export default function HomePage() {
    const [hovered, setHovered] = useState(false);

    const baseStyle = {
        display: 'inline-block',
        padding: '8px 16px',
        borderRadius: '6px',
        textDecoration: 'none',
        marginTop: '20px',
        border: '1px solid #fff',
        fontWeight: '500',
        transition: 'background 0.2s, color 0.2s',
        cursor: 'pointer',
    };

    const hoveredStyle = {
        background: '#fff',
        color: '#222',
    };

    const normalStyle = {
        background: 'none',
        color: '#fff',
    };


    return (
        <>
            <h1>tolelog</h1>

            <Link
                to="/login"
                style={{
                    ...baseStyle,
                    ...(hovered ? hoveredStyle : normalStyle),
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                로그인
            </Link>

        </>
    );
}