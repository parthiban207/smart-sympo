---
agent-notes: { ctx: "performance budget for smartsympo", deps: [AGENTS.md], state: active, last: "archie@2026-07-28" }
---

# Performance Budget: SmartSympo Platform

**Target Metrics:**

| Metric | Target | Measurement Strategy |
|--------|--------|---------------------|
| First Contentful Paint (FCP) | < 1.5s | Mobile Lighthouse Audit |
| Time to Interactive (TTI) | < 2.5s | Mobile Lighthouse Audit |
| API Registration Latency | < 100ms | Express API benchmark |
| Socket.io Broadcast Latency | < 50ms | Server-to-Client latency check |
| QR Verification Round-trip | < 300ms | Camera scan to success toast |
