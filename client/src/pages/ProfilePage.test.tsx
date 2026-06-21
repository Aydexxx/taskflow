import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { User } from '@taskflow/shared';
import { ProfilePage } from './ProfilePage';

// AppHeader pulls in auth/notifications/theme context we don't exercise here.
vi.mock('../components/AppHeader', () => ({ AppHeader: () => null }));

const updateUser = vi.fn();
const baseUser: User = {
  id: 'u1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  avatarUrl: null,
  title: 'Engineer',
  bio: 'I build calm software.',
  socialLinks: { github: 'https://github.com/ada' },
  createdAt: '',
  updatedAt: '',
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: baseUser, updateUser }),
}));

const { updateProfile } = vi.hoisted(() => ({ updateProfile: vi.fn() }));

vi.mock('../lib/api', () => ({
  api: { users: { updateProfile, uploadAvatar: vi.fn() } },
  ApiRequestError: class ApiRequestError extends Error {},
}));

function renderPage(): void {
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    updateProfile.mockReset();
    updateUser.mockReset();
  });

  it('renders the form prefilled with the current profile', () => {
    renderPage();
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace');
    expect(screen.getByLabelText('Title')).toHaveValue('Engineer');
    expect(screen.getByLabelText('Bio')).toHaveValue('I build calm software.');
    expect(screen.getByLabelText('GitHub')).toHaveValue('https://github.com/ada');
  });

  it('submits the edited profile and shows a saved state', async () => {
    const user = userEvent.setup();
    updateProfile.mockResolvedValue({
      ...baseUser,
      title: 'Staff Engineer',
      socialLinks: { github: 'https://github.com/ada' },
    });

    renderPage();

    const titleInput = screen.getByLabelText('Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Staff Engineer');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      title: 'Staff Engineer',
      bio: 'I build calm software.',
      socialLinks: { github: 'https://github.com/ada' },
    });
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });
});
