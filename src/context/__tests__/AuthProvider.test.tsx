import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { AuthProvider } from '../AuthProvider';
import { STORAGE_KEYS } from '../../utils/constants';
import { AUTH_TOKENS_EVENT } from '../../utils/api/client';

function TestConsumer() {
  const auth = useContext(AuthContext);
  return (
    <div>
      <span data-testid="token">{auth.token ?? 'null'}</span>
      <span data-testid="username">{auth.username ?? 'null'}</span>
      <span data-testid="userId">{auth.userId ?? 'null'}</span>
      <span data-testid="avatarUrl">{auth.avatarUrl ?? 'null'}</span>
      <button
        data-testid="login-btn"
        onClick={() =>
          auth.login({
            token: 'test-token',
            refreshToken: 'test-refresh',
            username: 'testuser',
            userId: 42,
            avatarUrl: 'avatar.png',
          })
        }
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => auth.logout()}>
        Logout
      </button>
      <button
        data-testid="set-avatar-btn"
        onClick={() => auth.setAvatarUrl('new-avatar.png')}
      >
        Set Avatar
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default null values when no localStorage data', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('token').textContent).toBe('null');
    expect(screen.getByTestId('username').textContent).toBe('null');
    expect(screen.getByTestId('userId').textContent).toBe('null');
  });

  it('loads token from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, 'stored-token');
    localStorage.setItem(
      STORAGE_KEYS.USER,
      JSON.stringify({ username: 'stored-user', user_id: 10, avatar_url: '' })
    );
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('token').textContent).toBe('stored-token');
    expect(screen.getByTestId('username').textContent).toBe('stored-user');
  });

  it('sets auth state on login', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByTestId('login-btn'));

    expect(screen.getByTestId('token').textContent).toBe('test-token');
    expect(screen.getByTestId('username').textContent).toBe('testuser');
    expect(screen.getByTestId('userId').textContent).toBe('42');
    expect(screen.getByTestId('avatarUrl').textContent).toBe('avatar.png');
  });

  it('persists token to localStorage after login', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByTestId('login-btn'));

    // useEffect runs after render, localStorage should be updated
    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBe('test-token');
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBe('test-refresh');
  });

  it('clears state on logout', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByTestId('login-btn'));
    await user.click(screen.getByTestId('logout-btn'));

    expect(screen.getByTestId('token').textContent).toBe('null');
    expect(screen.getByTestId('username').textContent).toBe('null');
  });

  it('removes localStorage entries on logout', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByTestId('login-btn'));
    await user.click(screen.getByTestId('logout-btn'));

    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
  });

  it('updates avatar URL', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByTestId('login-btn'));
    await user.click(screen.getByTestId('set-avatar-btn'));

    expect(screen.getByTestId('avatarUrl').textContent).toBe('new-avatar.png');
  });

  it('handles corrupt localStorage user data gracefully', () => {
    localStorage.setItem(STORAGE_KEYS.USER, 'not valid json');
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('username').textContent).toBe('null');
    // corrupt data should be removed
    expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
  });
});

describe('AuthProvider 토큰 갱신 알림', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  async function loggedIn() {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    await userEvent.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('token')).toHaveTextContent('test-token');
  }

  it('API 클라이언트가 갱신한 토큰으로 바꾼다', async () => {
    await loggedIn();
    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_TOKENS_EVENT, { detail: { token: 'new-token', refreshToken: 'new-refresh' } }));
    });
    expect(screen.getByTestId('token')).toHaveTextContent('new-token');
    expect(screen.getByTestId('username')).toHaveTextContent('testuser');
  });

  it('갱신에 실패했다는 알림이 오면 로그아웃 상태가 된다', async () => {
    await loggedIn();
    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_TOKENS_EVENT, { detail: null }));
    });
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('username')).toHaveTextContent('null');
  });

  it('로그아웃한 뒤 늦게 온 새 토큰으로 다시 로그인되지 않는다', async () => {
    await loggedIn();
    await userEvent.click(screen.getByTestId('logout-btn'));
    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_TOKENS_EVENT, { detail: { token: 'late-token', refreshToken: 'late-refresh' } }));
    });
    expect(screen.getByTestId('token')).toHaveTextContent('null');
  });
});
