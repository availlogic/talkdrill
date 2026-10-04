import React, { useState, useEffect } from 'react';
import { LibraryOverview } from './views/LibraryOverview';
import { CorpusStudio } from './views/CorpusStudio';
import { DrillWorkspace } from './views/DrillWorkspace';
import { SettingsHub } from './views/SettingsHub';
import { audioContextManager } from './utils/audioContextManager';

export function parseRoute(hash: string): { route: string; params: Record<string, string> } {
  const clean = hash.replace(/^#\/?/, '');
  const [path = '', queryString = ''] = clean.split('?');
  const params: Record<string, string> = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((val, key) => {
      params[key] = val;
    });
  }
  return { route: path || 'library', params };
}

export const App: React.FC = () => {
  const [routeInfo, setRouteInfo] = useState(() => parseRoute(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setRouteInfo(parseRoute(window.location.hash));
    };

    const handleFirstGesture = () => {
      audioContextManager.unlock();
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('pointerdown', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const navigateTo = (path: string) => {
    window.location.hash = path;
  };

  const { route, params } = routeInfo;

  if (route === 'studio') {
    return (
      <CorpusStudio
        onCancel={() => navigateTo('library')}
        onStartDrill={(id) => navigateTo(`drill?id=${id}`)}
      />
    );
  }

  if (route === 'drill' && params.id) {
    return <DrillWorkspace articleId={params.id} onBack={() => navigateTo('library')} />;
  }

  if (route === 'settings') {
    return <SettingsHub onBack={() => navigateTo('library')} />;
  }

  return (
    <LibraryOverview
      onSelectArticle={(id) => navigateTo(`drill?id=${id}`)}
      onNewArticle={() => navigateTo('studio')}
      onOpenSettings={() => navigateTo('settings')}
    />
  );
};

export default App;
