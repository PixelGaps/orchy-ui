import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { QueryStateNotice } from "./primitives"

describe("QueryStateNotice", () => {
  it("stays visually silent during healthy background refetch", () => {
    const { container } = render(
      <QueryStateNotice
        isFetching
        updatedAt={Date.now()}
        onRetry={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText("Refreshing…")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
  })

  it("keeps retry available for genuine query errors", () => {
    const retry = vi.fn()
    render(
      <QueryStateNotice
        error={new Error("network down")}
        updatedAt={Date.now()}
        onRetry={retry}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Latest refresh failed. Showing last known data.",
    )
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
