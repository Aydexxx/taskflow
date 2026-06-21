import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('falls back to initials when no avatar URL is set', () => {
    render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('uses the first letter only for a single-word name', () => {
    render(<Avatar name="Ada" avatarUrl={null} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders the uploaded image when an avatar URL is present', () => {
    render(<Avatar name="Ada Lovelace" avatarUrl="https://cdn.example.com/ada.png" />);
    const img = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/ada.png');
    expect(screen.queryByText('AL')).not.toBeInTheDocument();
  });
});
