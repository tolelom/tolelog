import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from '../PrivateRoute';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

function renderAt(authValue: { token: string | null; ready: boolean }) {
    return renderWithProviders(
        <Routes>
            <Route path="/drafts" element={<PrivateRoute><p>임시저장 목록</p></PrivateRoute>} />
            <Route path="/login" element={<p>로그인 화면</p>} />
        </Routes>,
        { route: '/drafts', authValue },
    );
}

describe('PrivateRoute', () => {
    it('does not send a signed-in visitor to login before the saved session is read', () => {
        renderAt({ token: null, ready: false });
        expect(screen.queryByText('로그인 화면')).not.toBeInTheDocument();
    });

    it('shows the page once the saved session is read', () => {
        renderAt({ token: 'saved', ready: true });
        expect(screen.getByText('임시저장 목록')).toBeInTheDocument();
    });

    it('sends a visitor without a session to login', () => {
        renderAt({ token: null, ready: true });
        expect(screen.getByText('로그인 화면')).toBeInTheDocument();
    });
});
