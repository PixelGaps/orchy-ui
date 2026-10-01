import { beforeEach, describe, expect, it, vi } from "vitest"
import { CONFIG_GRAPH_FINGERPRINT, PUBLIC_RUNTIME_DEFAULTS } from "./generated/config"

const rootState = vi.hoisted(() => ({
  render: vi.fn(),
  createRoot: vi.fn(),
}))

vi.mock("react-dom/client", () => ({
  createRoot: rootState.createRoot,
}))

vi.mock("./App", () => ({
  default: () => null,
}))

describe("main bootstrap", () => {
  beforeEach(() => {
    vi.resetModules()
    rootState.render.mockReset()
    rootState.createRoot.mockReset()
    rootState.createRoot.mockReturnValue({ render: rootState.render } as never)
    document.body.innerHTML = '<div id="root"></div>'
  })

  it("loads generated public runtime configuration", () => {
    expect(CONFIG_GRAPH_FINGERPRINT).toMatch(/^[0-9a-f]{64}$/)
    expect(PUBLIC_RUNTIME_DEFAULTS.vllm_base_url.env).toBe("VLLM_BASE_URL")
    expect(PUBLIC_RUNTIME_DEFAULTS.comfyui_base_url.default).toContain("8188")
  })

  it("mounts the application into the root element", async () => {
    const root = document.getElementById("root")
    expect(root).not.toBeNull()

    await import("./main")

    expect(rootState.createRoot).toHaveBeenCalledTimes(1)
    expect(rootState.createRoot).toHaveBeenCalledWith(root)
    expect(rootState.render).toHaveBeenCalledTimes(1)
  })
})
