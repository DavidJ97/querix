# Quérix Next Gen

Baseline: restored main. Do not merge until browser validation.

## References
- https://github.com/maxlibin/threejs-fish-tank : MIT code, Cycles baked room, WebGPU, Playwright. Reported 100 FPS on M4 Max is not a mobile benchmark.
- https://github.com/manuelhintermayr/sketchbook-rapier : capsule controller, animation state machine; verify license before copying.
- https://github.com/czlonkowski/blender-web-3d-skill : MIT, HDR lightmaps, batching, meshopt/KTX2, compileAsync.

## Gates
1. Separate experimental route, preserve existing assets and UI.
2. Fixed 60 Hz physics with interpolated render transforms; Rapier capsule and static geometry colliders.
3. Baked full clinic lighting, preserve texture fidelity; no silent quality reduction.
4. Browser tests for wall penetration, frame pacing, input and camera. Measure on physical Android as well as desktop.
5. Compare screenshots and frame times against main. Target 30 stable mobile FPS, 60 preferred. No merge without evidence.

No external code or assets copied yet.
