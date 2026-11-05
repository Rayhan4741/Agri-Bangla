# public/models

All 3D content (rice paddy, trees, farmer, egrets, growth timeline plants) is generated in code,
so no model files are downloaded. If you add glTF models later, compress them with
`gltf-transform optimize --compress draco --texture-compress webp` and load them lazily.
