# opentui-rove

OpenTUI's native library with one change, built for [Rove](https://github.com/Sma1lboy/rove).

This branch is `v0.8.4` plus one commit in `packages/native/src/renderer.zig`. Everything else, including the JavaScript packages, is upstream's; Rove installs the official `@opentui/core` and loads this library in place of the stock one.

## The change

When a frame changes several styled runs next to each other on one row, the stock encoder writes a reset, a cursor move, the foreground and the background before each run. This build writes only the colors that differ when all three hold:

- the previous cell on the row was just written, and it was printable ASCII, so the terminal cursor is known to be on the next column;
- no text attribute has to be turned off (bold to plain still takes a reset);
- the run is not the first of a row.

Graphemes, images and the first run after a skipped cell take the stock path.

Measured in Rove on a 132x46 terminal pane, 10 seconds at 60 frames a second, bytes written to the host terminal:

| output | stock | this build |
| --- | --- | --- |
| every cell a new color each frame | 15.6 MB | 10.2 MB |
| every row rewritten, bold toggling every 9 cells | 14.4 MB | 14.1 MB |
| last two rows rewritten | 69 KB | 69 KB |

CPU time did not move. The gain is bytes on the wire, which matters over SSH.

## Build

Needs Zig 0.17.0 and Bun. From `packages/native`:

```sh
bun run prepare:zig                       # Zig deps and the host FFmpeg
zig build -Doptimize=ReleaseFast          # lib/aarch64-macos on an Apple silicon Mac

bun scripts/build-ffmpeg.ts --target=x86_64-linux
zig build -Doptimize=ReleaseFast -Dlibrary-target=x86_64-linux-gnu.2.17 -Drequire-video
```

On a Mac with Homebrew's FFmpeg installed, `zig build test` compiles `video-shim.c` against `/opt/homebrew/include` and fails; the library builds above are not affected.

## Packages

`bun scripts/rove-package.ts <version>` writes one npm package per built target into `dist-rove/`:

- `@sma1lboy/opentui-rove-darwin-arm64`
- `@sma1lboy/opentui-rove-linux-x64`

Each holds the library, the license notices upstream ships with its own native packages, and a `package.json` naming the OpenTUI version it was built from (`opentui`) and the library file (`lib`). Rove loads the package for the running platform only when that version equals the installed `@opentui/core`; on any other platform or version it uses the stock library. Publish with `npm publish --access public` from each directory.

## Moving to a new OpenTUI

Rebase the one commit onto the new tag, rebuild, publish with the new version, and bump `@opentui/core` in Rove in the same change.
