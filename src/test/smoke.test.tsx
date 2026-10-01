import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

function CoverageSmoke() {
  return <div>Orchy frontend test foundation</div>
}

describe("frontend test foundation", () => {
  it("renders React components in jsdom", () => {
    render(<CoverageSmoke />)
    expect(screen.getByText("Orchy frontend test foundation")).toBeInTheDocument()
  })
})
