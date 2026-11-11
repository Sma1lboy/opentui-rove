/** bun scripts/rove-package.ts <version>: one npm package per built native target, in dist-rove/. See ROVE.md. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const version = process.argv[2]
if (!version) throw new Error("usage: bun scripts/rove-package.ts <version>, e.g. 0.8.4-rove.1")
const opentui = (JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8")) as { version: string }).version
if (!version.startsWith(`${opentui}-`)) throw new Error(`version ${version} must start with the OpenTUI version ${opentui}-`)

const targets = [
  { zig: "aarch64-macos", os: "darwin", cpu: "arm64", lib: "libopentui.dylib" },
  { zig: "x86_64-linux", os: "linux", cpu: "x64", lib: "libopentui.so" },
]
// The notices upstream stages for its own native packages (build-native.yml).
const notices: [string, string][] = [
  ["LICENSE", "LICENSE"],
  ["packages/core/THIRD_PARTY_LICENSES/GHOSTTY", "LICENSE-GHOSTTY"],
  ["packages/native/src/vendor/wuffs/LICENSE", "LICENSE-WUFFS"],
  ["packages/native/src/vendor/stb/LICENSE", "LICENSE-STB"],
  ["packages/native/src/vendor/libwebp/COPYING", "LICENSE-LIBWEBP"],
  ["packages/native/src/vendor/libwebp/PATENTS", "PATENTS-LIBWEBP"],
  ["packages/native/src/vendor/libwebp/AUTHORS", "AUTHORS-LIBWEBP"],
  ["packages/native/src/vendor/lcms2/LICENSE", "LICENSE-LCMS2"],
  ["packages/native/src/vendor/ffmpeg/COPYING.LGPLv2.1", "LICENSE-FFMPEG"],
  ["packages/native/src/vendor/ffmpeg/README.md", "FFMPEG-SOURCE.md"],
  ["packages/native/src/vendor/ffmpeg/LICENSE-ZLIB", "LICENSE-ZLIB"],
]

for (const target of targets) {
  const built = join(root, "packages/native/lib", target.zig, target.lib)
  if (!existsSync(built)) {
    console.log(`skip ${target.os}-${target.cpu}: ${built} is not built`)
    continue
  }
  const name = `@sma1lboy/opentui-rove-${target.os}-${target.cpu}`
  const dir = join(root, "dist-rove", `opentui-rove-${target.os}-${target.cpu}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  copyFileSync(built, join(dir, target.lib))
  for (const [from, to] of notices) copyFileSync(join(root, from), join(dir, to))
  writeFileSync(
    join(dir, "README.md"),
    `# ${name}\n\nOpenTUI ${opentui}'s native library for ${target.os} ${target.cpu} with Rove's frame encoder change.\nSource and details: https://github.com/Sma1lboy/opentui-rove/blob/rove-${opentui}/ROVE.md\n`,
  )
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify(
      {
        name,
        version,
        description: `OpenTUI ${opentui} native library for ${target.os} ${target.cpu}, with Rove's frame encoder change`,
        license: "MIT AND LGPL-2.1-or-later",
        repository: { type: "git", url: "git+https://github.com/Sma1lboy/opentui-rove.git" },
        os: [target.os],
        cpu: [target.cpu],
        opentui,
        lib: target.lib,
      },
      null,
      2,
    )}\n`,
  )
  console.log(`wrote ${dir}`)
}
