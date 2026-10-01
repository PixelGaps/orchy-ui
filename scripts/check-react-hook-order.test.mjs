import assert from "node:assert/strict";
import test from "node:test";

import { analyzeSource } from "./check-react-hook-order.mjs";

test("accepts hooks before an early return", () => {
  const source = `
    function Example({ ready }) {
      const [value] = useState(0);
      useEffect(() => {}, []);
      if (!ready) return null;
      return value;
    }
  `;
  assert.deepEqual(analyzeSource(source), []);
});

test("accepts custom hooks that directly return another Hook", () => {
  const source = `
    function useExecutions() {
      return useQuery({ queryKey: ["executions"] });
    }
  `;
  assert.deepEqual(analyzeSource(source), []);
});

test("rejects the OR-368 early-return-before-hook shape", () => {
  const source = `
    function Overview({ loading }) {
      if (loading) return null;
      const visible = useMemo(() => [], []);
      return visible.length;
    }
  `;
  const violations = analyzeSource(source);
  assert.equal(violations.some((item) => item.code === "hook-after-return"), true);
});

test("rejects hooks nested in conditionals", () => {
  const source = `
    function Example({ enabled }) {
      if (enabled) {
        useEffect(() => {}, []);
      }
      return null;
    }
  `;
  const violations = analyzeSource(source);
  assert.equal(violations.some((item) => item.code === "conditional-hook"), true);
});

test("rejects hooks nested in loops", () => {
  const source = `
    function Example({ items }) {
      for (const item of items) {
        useMemo(() => item, [item]);
      }
      return null;
    }
  `;
  const violations = analyzeSource(source);
  assert.equal(violations.some((item) => item.code === "conditional-hook"), true);
});

test("ignores returns owned by nested callbacks", () => {
  const source = `
    function Example() {
      const helper = () => {
        if (Math.random()) return null;
        return 1;
      };
      const [value] = useState(0);
      return helper() ?? value;
    }
  `;
  assert.deepEqual(analyzeSource(source), []);
});

test("allows React use semantics to remain outside this ordering guard", () => {
  const source = `
    function Example({ promise, enabled }) {
      if (enabled) {
        use(promise);
      }
      return null;
    }
  `;
  assert.deepEqual(analyzeSource(source), []);
});
