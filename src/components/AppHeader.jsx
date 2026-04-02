import './Layout.css';

/**
 * Shared top bar for Log, Timeline, and Chat (same markup + tokens as Phase 21 shell).
 * `views` must include logJournal, timeline, chat keys matching App routing.
 */
export function AppHeader({ views, currentView, onViewChange, onSignOut }) {
  return (
    <header className="header" role="banner">
      <div className="header-brand">
        <span className="header-title">Reflector</span>
      </div>

      <nav aria-label="Main navigation">
        <ul className="header-nav" role="list">
          <li className="header-nav-item">
            <button
              type="button"
              className={`header-nav-link${currentView === views.logJournal ? ' active' : ''}`}
              onClick={() => onViewChange(views.logJournal)}
              aria-current={currentView === views.logJournal ? 'page' : undefined}
            >
              Log
            </button>
          </li>
          <li className="header-nav-item">
            <button
              type="button"
              className={`header-nav-link${currentView === views.timeline ? ' active' : ''}`}
              onClick={() => onViewChange(views.timeline)}
              aria-current={currentView === views.timeline ? 'page' : undefined}
            >
              Timeline
            </button>
          </li>
          <li className="header-nav-item">
            <button
              type="button"
              className={`header-nav-link${currentView === views.chat ? ' active' : ''}`}
              onClick={() => onViewChange(views.chat)}
              aria-current={currentView === views.chat ? 'page' : undefined}
            >
              Chat
            </button>
          </li>
        </ul>
      </nav>

      <div className="header-actions" aria-label="Account actions">
        <button type="button" className="header-sign-out" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
