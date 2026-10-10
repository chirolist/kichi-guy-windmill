"use client";

type PauseScreenProps = {
  onResume: () => void;
  onRetry: () => void;
};

export function PauseScreen({ onResume, onRetry }: PauseScreenProps) {
  return (
    <div className="overlay overlay-pause">
      <div className="overlay-card">
        <p className="overlay-kicker">一時停止</p>
        <h2>STOPPED</h2>
        <div className="overlay-actions">
          <button type="button" className="primary-button" onClick={onResume}>
            再開
          </button>
          <button type="button" className="ghost-button" onClick={onRetry}>
            リトライ
          </button>
        </div>
      </div>
    </div>
  );
}
