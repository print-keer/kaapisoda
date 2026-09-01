'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [src, setSrc] = useState('/kaapisoda.html');

  useEffect(() => {
    setSrc(`/kaapisoda.html${window.location.search}${window.location.hash}`);
  }, []);

  return (
    <main className="kaapisoda-shell">
      <iframe className="kaapisoda-frame" title="Kaapisoda" src={src} />
    </main>
  );
}
