import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DataPlatformPage } from "./page"

describe("Data Platform operator view", () => {
  it("shows current platform, complete QA dimensions and analysis without fabricated telemetry", () => {
    render(<DataPlatformPage />)
    expect(screen.getByRole("heading", { name: "Data Platform" })).toBeInTheDocument()
    expect(screen.getAllByText("PixelGaps/data-warehouse").length).toBeGreaterThan(0)
    expect(screen.getByText("594ac3149ae8")).toBeInTheDocument()
    expect(screen.getByText("Capability is verified; live telemetry is not fabricated")).toBeInTheDocument()
    for (const name of ["Contracts & schema","Completeness","Uniqueness","Range & domain","Freshness","Referential integrity","Lineage","Reconciliation","Transformation correctness","Generative invariants","Idempotency & resilience","Evidence immutability","Drift governance","Availability semantics"]) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    for (const name of ["Quality history","Reconciliation analysis","Evidence history","Lineage analysis","Producer coverage","Drift analysis"]) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(screen.getByText("7 / 7")).toBeInTheDocument()
    expect(screen.getByText("OR-891")).toBeInTheDocument()
    expect(screen.getByText(/OR-892/)).toBeInTheDocument()
  })
})
