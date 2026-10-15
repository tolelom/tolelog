import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import Navbar from '../Navbar';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

describe('Navbar', () => {
    const loggedOut = { token: null };

    it('shows both login and register links on other pages', () => {
        renderWithProviders(<Navbar />, { route: '/', authValue: loggedOut });
        expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '회원가입' })).toBeInTheDocument();
    });

    it('hides the link to the page the visitor is already on', () => {
        renderWithProviders(<Navbar />, { route: '/login', authValue: loggedOut });
        expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: '회원가입' })).toBeInTheDocument();
    });
});
