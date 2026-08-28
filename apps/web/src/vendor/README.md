# KIN visual references (source snapshots)

These source snapshots are kept beside the KIN wrappers so visual behavior can be audited and extended without depending on hosted demos at runtime.

- `wave/`: [franky-adl/3d-wave-grid](https://github.com/franky-adl/3d-wave-grid), commit `f1fe51434c294008b7e40d51579711b522f1e27f`
- `xylophone/`: [Sujenphea/xylophone](https://github.com/Sujenphea/xylophone), commit `8e4f9a8c7729f52edc006ca02c6c377921c4f1b`
- `scroll/`: [codrops/ScrollTextMotion](https://github.com/codrops/ScrollTextMotion), commit `9f05d938f7b38e76e3146f26e393118e7975b6b3`
- `gommage/`: [WallabyMonochrome/WebGPU-clair-obscur-gommage-codrops](https://github.com/WallabyMonochrome/WebGPU-clair-obscur-gommage-codrops), commit `f2ed512d4313ff50404b68263504915d16055165`
- `dither/`: [zavalit/bayer-dithering-webgl-demo](https://github.com/zavalit/bayer-dithering-webgl-demo), commit `3db1d5fb94bb2270ca7d88aec9e55605d6845810`

The production page uses adapted wrappers in `src/kinAnimations.js` and the Fluid Glass implementation in `src/fluidglass/`.

The second page now also vendors the complete `3d-wave-grid` Three.js scene in
`wave-original-threejs/` and runs its `Orchestrator`/`Stage`/`MouseTrail`
implementation through `src/originalWaveGrid.js`, with KIN copy layered above.
