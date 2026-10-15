import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../SettingsPage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { AUTH_API } from '../../utils/api';

vi.mock('../../utils/api', () => ({
    AUTH_API: { changePassword: vi.fn(), deleteAccount: vi.fn() },
}));

vi.mock('vite-react-ssg', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockChangePassword = vi.mocked(AUTH_API.changePassword);

function submitPasswordChange() {
    fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: 'old-pass-1' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'new-pass-1' } });
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'new-pass-1' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));
}

describe('SettingsPage 비밀번호 변경', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('서버가 준 새 토큰으로 이 기기의 세션을 이어 간다', async () => {
        mockChangePassword.mockResolvedValueOnce({
            status: 'success',
            data: { access_token: 'new-access', refresh_token: 'new-refresh', username: 'alice', user_id: 7, avatar_url: '/a.png' },
        });
        const login = vi.fn();
        renderWithProviders(<SettingsPage />, { authValue: { token: 'old-access', username: 'alice', userId: 7, login } });

        submitPasswordChange();

        await waitFor(() => expect(login).toHaveBeenCalledWith({
            token: 'new-access',
            refreshToken: 'new-refresh',
            username: 'alice',
            userId: 7,
            avatarUrl: '/a.png',
        }));
        expect(mockChangePassword).toHaveBeenCalledWith('old-pass-1', 'new-pass-1', 'old-access');
    });

    it('토큰이 없는 응답(이전 서버)이면 세션을 건드리지 않는다', async () => {
        mockChangePassword.mockResolvedValueOnce({ status: 'success', data: { message: '비밀번호가 변경되었습니다' } } as never);
        const login = vi.fn();
        renderWithProviders(<SettingsPage />, { authValue: { token: 'old-access', username: 'alice', userId: 7, login } });

        submitPasswordChange();

        await waitFor(() => expect(screen.getByLabelText('현재 비밀번호')).toHaveValue(''));
        expect(login).not.toHaveBeenCalled();
    });

    it('실패하면 세션을 건드리지 않고 오류를 보여 준다', async () => {
        mockChangePassword.mockRejectedValueOnce(new Error('현재 비밀번호가 올바르지 않습니다'));
        const login = vi.fn();
        renderWithProviders(<SettingsPage />, { authValue: { token: 'old-access', username: 'alice', userId: 7, login } });

        submitPasswordChange();

        expect(await screen.findAllByText('현재 비밀번호가 올바르지 않습니다')).not.toHaveLength(0);
        expect(login).not.toHaveBeenCalled();
    });
});
