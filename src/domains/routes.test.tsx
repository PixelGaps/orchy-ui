import { render, screen } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { DomainRoutes, domainNav } from "./routes"

function Marker({ name }: { name: string }) {
  return <div>{name}</div>
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}{location.search}</output>
}

const pages = {
  Overview: () => <Marker name="Overview page" />,
  Assurance: () => <Marker name="Assurance page" />,
  Issues: () => <Marker name="Issues page" />,
  Missions: () => <Marker name="Missions page" />,
  Queue: () => <Marker name="Queue page" />,
  ImageFactory: () => <Marker name="Image page" />,
  LLM: () => <Marker name="LLM page" />,
  Workbench: () => <Marker name="Workbench page" />,
  ComfyUI: () => <Marker name="Comfy page" />,
  Healthcheck: () => <Marker name="Health page" />,
  Logs: () => <Marker name="Logs page" />,
  GlobalSettings: () => <Marker name="Settings page" />,
}

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DomainRoutes pages={pages} />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe("domain routes", () => {
  it("keeps navigation metadata complete and grouped", () => {
    expect(domainNav.map((item) => item.to)).toEqual([
      "/",
      "/assurance",
      "/issues",
      "/missions",
      "/queue",
      "/image-factory",
      "/llm",
      "/workbench",
      "/comfyui",
      "/healthcheck",
      "/logs",
      "/settings",
    ])
    expect(new Set(domainNav.map((item) => item.group))).toEqual(
      new Set(["Command", "Workflows", "Runtimes", "Operations"]),
    )
  })

  it.each([
    ["/", "Overview page"],
    ["/assurance", "Assurance page"],
    ["/issues", "Issues page"],
    ["/missions", "Missions page"],
    ["/queue", "Queue page"],
    ["/image-factory", "Image page"],
    ["/llm", "LLM page"],
    ["/workbench", "Workbench page"],
    ["/comfyui", "Comfy page"],
    ["/healthcheck", "Health page"],
    ["/logs", "Logs page"],
    ["/settings", "Settings page"],
  ])("renders %s with its owning page", (path, label) => {
    renderRoute(path)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it.each([
    ["/tasks", "/"],
    ["/validation", "/"],
    ["/comfyui/image-factory", "/image-factory"],
    ["/runtime", "/llm?tab=runtime"],
    ["/configuration", "/llm?tab=settings"],
    ["/runs", "/logs?tab=ci"],
    ["/evidence", "/logs?tab=evidence"],
  ])("redirects legacy %s to %s", (path, destination) => {
    renderRoute(path)
    expect(screen.getByTestId("location")).toHaveTextContent(destination)
  })
})
