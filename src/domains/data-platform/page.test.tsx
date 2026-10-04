import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DataPlatformPage } from "./page"

describe("Data Platform operator view", () => {
  it("shows current platform, complete QA dimensions and analysis without fabricated telemetry", () => {
    render(<DataPlatformPage />)
    expect(screen.getByRole("heading", { name: "Data Platform" })).toBeInTheDocument()
    expect(screen.getAllByText("PixelGaps/data-warehouse").length).toBeGreaterThan(0)
    expect(screen.getAllByText("31b315eeff6e")).toHaveLength(2)
    expect(screen.getByText("Capability is verified; live telemetry is not fabricated")).toBeInTheDocument()
    for (const name of ["Contracts & schema","Completeness","Uniqueness","Range & domain","Freshness","Referential integrity","Lineage","Reconciliation","Transformation correctness","Generative invariants","Idempotency & resilience","Evidence immutability","Drift governance","Availability semantics"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    }
    for (const name of ["Quality history","Reconciliation analysis","Evidence history","Lineage analysis","Producer coverage","Drift analysis"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    }
    expect(screen.getByText("7 / 7")).toBeInTheDocument()
    expect(screen.getAllByText(/OR-891/).length).toBeGreaterThan(0)\n    expect(screen.getAllByText(/complete/i).length).toBeGreaterThan(0)\n    expect(screen.getByText(/OR-1148 historical backfill retained/)).toBeInTheDocument()
    expect(screen.getAllByText(/OR-892/).length).toBeGreaterThan(0)
  })
})
