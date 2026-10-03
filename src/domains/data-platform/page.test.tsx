import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DataPlatformPage } from "./page"

describe("Data Platform operator view", () => {
  it("shows verified platform contracts without inventing runtime telemetry", () => {
    render(<DataPlatformPage />)
    expect(screen.getByRole("heading", { name: "Data Platform" })).toBeInTheDocument()
    expect(screen.getAllByText("PixelGaps/data-warehouse").length).toBeGreaterThan(0)
    expect(screen.getByText("30290ef4dd55")).toBeInTheDocument()
    expect(screen.getByText("Runtime dataset telemetry is intentionally not synthesized")).toBeInTheDocument()
    expect(screen.getByText("Raw")).toBeInTheDocument()
    expect(screen.getByText("Canonical")).toBeInTheDocument()
    expect(screen.getByText("Derived")).toBeInTheDocument()
    expect(screen.getByText("Evidence Lake")).toBeInTheDocument()
    expect(screen.getByText("OR-891")).toBeInTheDocument()
  })
})
