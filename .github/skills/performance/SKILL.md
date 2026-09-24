---
name: performance
description: Improve Vite, React Three Fiber, and Unity WebGL performance without changing behavior.
---

# Performance

Measure before optimizing and preserve the visual and interaction contract.

- Look for unnecessary React rerenders, unstable object identities, and per-frame allocations in 3D components.
- Reuse geometry/materials and dispose resources according to the rendering library lifecycle.
- Avoid blocking the main thread during Unity WebGL loading; show explicit loading and failure states.
- Keep asset and bundle changes measurable with the existing build output.
- Validate performance changes on the relevant browser path and confirm no regressions in animation or input handling.

