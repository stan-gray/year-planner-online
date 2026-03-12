import React from "react"
import { useCalendar } from "../contexts/CalendarContext"

const OnboardingCard: React.FC = () => {
  const { dismissOnboarding, createSnapshot } = useCalendar()

  return (
    <section className="panel onboarding-card">
      <div>
        <p className="section-kicker">Start here</p>
        <h2>Use it like a planner, not a spreadsheet</h2>
        <ol>
          <li>Write your annual vision and what success means.</li>
          <li>Tap a day cell to paint it. Use the small ✎ button when you want a note.</li>
          <li>Use routines to prefill repeatable work, review, or recovery days.</li>
          <li>Stay local-only if you want, or add account sync later for a server-backed copy across devices.</li>
        </ol>
      </div>
      <div className="onboarding-actions">
        <button className="primary-button" onClick={() => createSnapshot("Fresh start backup")}>
          Create first backup
        </button>
        <button className="ghost-button" onClick={dismissOnboarding}>
          Hide checklist
        </button>
      </div>
    </section>
  )
}

export default OnboardingCard
