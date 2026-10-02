/**
 * Test documentation — executable specification
 * OR-647 keeps the required operator surfaces and platform limits explicit in the UI.
 */
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/domains/shared", () => ({
  DomainConfiguration: ({ section }: { section: string }) => <div>configuration:{section}</div>,
}))

import { GlobalSettingsPage } from "./page"

describe("GlobalSettingsPage operator parity register", () => {
  it("renders every required surface and explicit platform boundary", () => {
    render(<GlobalSettingsPage />)

    const register = screen.getByLabelText("Operator surface parity")
    expect(screen.getByText("12/12 surfaced")).toBeInTheDocument()
    for (const label of [
      "Overview",
      "Test Assurance",
      "Issues",
      "Missions",
      "Queue",
      "Image Factory",
      "LLM",
      "ComfyUI",
      "Healthcheck",
      "Logs",
      "Global Settings",
      "Quotas",
    ]) {
      expect(within(register).getByText(label, { exact: true })).toBeInTheDocument()
    }

    expect(screen.getByText(/Vercel and Netlify remain quarantined/)).toBeInTheDocument()
    expect(screen.getByText(/Resident polling is forbidden/)).toBeInTheDocument()
    expect(screen.getByText(/browser never owns Jira work state/)).toBeInTheDocument()
    expect(screen.getByText("configuration:global")).toBeInTheDocument()
  })
})
