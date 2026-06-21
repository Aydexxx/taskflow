import { useRef, useState, type ComponentType, type FormEvent } from 'react';
import type { SocialLinks } from '@taskflow/shared';
import { Camera, Globe } from 'lucide-react';
import { api, ApiRequestError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { GithubIcon, LinkedinIcon, TwitterIcon } from '../components/icons';
import { Alert, Button, FieldLabel, Input, Spinner, Textarea } from '../components/ui';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

type SocialKey = keyof SocialLinks;
type IconComponent = ComponentType<{ className?: string }>;

const SOCIAL_FIELDS: { key: SocialKey; label: string; placeholder: string; icon: IconComponent }[] = [
  { key: 'website', label: 'Website', placeholder: 'https://yoursite.com', icon: Globe },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/username', icon: GithubIcon },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username', icon: LinkedinIcon },
  { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/username', icon: TwitterIcon },
];

export function ProfilePage(): JSX.Element | null {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [title, setTitle] = useState(user?.title ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [social, setSocial] = useState<SocialLinks>(user?.socialLinks ?? {});

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  function setSocialField(key: SocialKey, value: string): void {
    setSocial((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Avatar must be a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Avatar must be 2 MB or smaller.');
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const updated = await api.users.uploadAvatar({ data: dataUrl });
      updateUser(updated);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      // Send blanks through as-is; the server normalizes empty links away.
      const socialLinks: SocialLinks = {};
      for (const { key } of SOCIAL_FIELDS) {
        const value = social[key]?.trim();
        if (value) socialLinks[key] = value;
      }
      const updated = await api.users.updateProfile({
        name: name.trim(),
        title: title.trim() || null,
        bio: bio.trim() || null,
        socialLinks,
      });
      updateUser(updated);
      setSocial(updated.socialLinks);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <AppHeader title="Your profile" backTo={{ to: '/app', label: 'Workspaces' }} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        {/* Avatar + identity card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft ring-1 ring-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:ring-0">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar name={user.name} avatarUrl={user.avatarUrl} className="h-20 w-20 !text-2xl" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                aria-label="Upload a new avatar"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition duration-150 ease-out-soft hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
              >
                {isUploading ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                className="sr-only"
                aria-hidden="true"
                tabIndex={-1}
              />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-h3 text-slate-900 dark:text-white">{user.name}</h2>
              {user.title && <p className="truncate text-sm text-indigo-600 dark:text-indigo-400">{user.title}</p>}
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            JPG, PNG, or WebP, up to 2 MB. Uploads replace your current avatar.
          </p>
        </section>

        {/* Profile form */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft ring-1 ring-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:ring-0"
        >
          <div className="space-y-5">
            <div>
              <FieldLabel htmlFor="profile-name">Name</FieldLabel>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                required
                maxLength={100}
                className="mt-1"
              />
            </div>

            <div>
              <FieldLabel htmlFor="profile-title">Title</FieldLabel>
              <Input
                id="profile-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setSaved(false);
                }}
                placeholder="e.g. Product Designer"
                maxLength={100}
                className="mt-1"
              />
            </div>

            <div>
              <FieldLabel htmlFor="profile-bio">Bio</FieldLabel>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(event) => {
                  setBio(event.target.value);
                  setSaved(false);
                }}
                rows={3}
                maxLength={500}
                placeholder="A short line about you and what you work on."
                className="mt-1"
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{bio.length}/500</p>
            </div>

            <fieldset className="border-t border-slate-200 pt-5 dark:border-slate-700/80">
              <legend className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                Social links
              </legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {SOCIAL_FIELDS.map(({ key, label, placeholder, icon: Icon }) => (
                  <div key={key}>
                    <FieldLabel htmlFor={`profile-${key}`} className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      {label}
                    </FieldLabel>
                    <Input
                      id={`profile-${key}`}
                      type="url"
                      inputMode="url"
                      value={social[key] ?? ''}
                      onChange={(event) => setSocialField(key, event.target.value)}
                      placeholder={placeholder}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          </div>

          {error && (
            <Alert tone="danger" className="mt-5">
              {error}
            </Alert>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            {saved && !error && (
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400" role="status">
                Saved
              </span>
            )}
            <Button type="submit" isLoading={isSaving} disabled={!name.trim()}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}
