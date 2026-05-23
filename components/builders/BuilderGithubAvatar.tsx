'use client';

import {
  builderAvatarUrl,
  dicebearAvatarUrl,
  githubAvatarUrl,
  normalizeGithubHandle,
} from '@/lib/github-avatar';
import { useEffect, useState } from 'react';

type BuilderGithubAvatarProps = {
  address: string;
  githubHandle?: string | null;
  size?: number;
  className?: string;
};

/**
 * Profile image for any builder: on-chain `githubHandle` → GitHub avatar,
 * with Dicebear fallback if the handle is empty or the image fails to load.
 */
export default function BuilderGithubAvatar({
  address,
  githubHandle,
  size = 160,
  className = 'h-full w-full object-cover',
}: BuilderGithubAvatarProps) {
  const login = normalizeGithubHandle(githubHandle ?? '');
  const fallbackSrc = dicebearAvatarUrl(address);

  const [src, setSrc] = useState(() =>
    builderAvatarUrl(address, githubHandle, size),
  );

  useEffect(() => {
    setSrc(login ? githubAvatarUrl(login, size) : fallbackSrc);
  }, [address, login, size, fallbackSrc]);

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== fallbackSrc) setSrc(fallbackSrc);
      }}
    />
  );
}
