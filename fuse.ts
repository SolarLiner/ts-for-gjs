import { FuseBox, QuantumPlugin } from "fuse-box"
import { src, task, exec, context } from "fuse-box/sparky"

class FuseboxConfig {
  forceMode?: "dev" | "prod"

  get mode() {
    if (this.forceMode) return this.forceMode
    return process.env.NODE_ENV === "production" ? "prod" : "dev"
  }

  getConfig() {
    return FuseBox.init({
      homeDir: ".",
      target: "server@es5",
      output: "dist/$name.js",
      plugins: this.mode === "prod" ? [QuantumPlugin({ uglify: true, treeshake: true })] : []
    })
  }
}

context(FuseboxConfig)

task("clean", async () => {
  await src("./out")
    .clean("dist/")
    .exec()
})

task("build", ["clean"], async (ctx: FuseboxConfig) => {
  ctx.forceMode = "prod"
  const fuse = ctx.getConfig()
  fuse.bundle("bin").instructions("> main.ts")
  fuse.run()
})

task("watch", ["clean"], async (ctx: FuseboxConfig) => {
  const fuse = ctx.getConfig()
  fuse
    .bundle("bin")
    .instructions("> [main.ts]")
    .watch()
  fuse.run()
})

task("default", ["build"])
