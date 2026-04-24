import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactElement } from 'react';
import { AuthContext, type AuthContextType } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastProvider';
import { makeAuthValue } from './fixtures';

export interface RenderOptionsEx extends Omit<RenderOptions, 'wrapper'> {
    authValue?: Partial<AuthContextType>;
    route?: string;
    path?: string;
}

export function renderWithProviders(ui: ReactElement, options: RenderOptionsEx = {}) {
    const { authValue, route = '/', path, ...rest } = options;
    const value = makeAuthValue(authValue);

    const wrapped = path
        ? <Routes><Route path={path} element={ui} /></Routes>
        : ui;

    return render(
        <MemoryRouter initialEntries={[route]}>
            <AuthContext.Provider value={value}>
                <ToastProvider>{wrapped}</ToastProvider>
            </AuthContext.Provider>
        </MemoryRouter>,
        rest,
    );
}
