import { FuseBox, QuantumPlugin } from "fuse-box";

const fuse = FuseBox.init({
  homeDir: ".",
  target: "server@es5",
  output: "dist/$name.js",
  plugins: [QuantumPlugin({ uglify: true, treeshake: true })]
});

fuse.bundle("bin").instructions("> main.ts");
fuse.run();
