# Sweepur

Sweepur is a small OpenTUI dashboard for answering one question quickly:

`What is running on this machine, and how do I stop it?`

It combines two local views in one terminal UI:

- `Local Ports`: listening TCP ports discovered via `lsof`
- `Docker Containers`: container state discovered via `docker ps -a`

## Controls

- `Tab`, `Left`, `Right`: switch between Ports and Docker
- `Up`, `Down`, `PageUp`, `PageDown`: move selection
- `G`: refresh both tabs
- `K`: terminate the selected process on the Ports tab
- `S`: stop the selected Docker container
- `R`: restart the selected Docker container
- `D`: delete the selected Docker container
- `Q`: quit

`K` and `D` are confirmation-gated: press the same key twice within 4 seconds.

## Prerequisites

- `bun`
- `lsof`
- `docker` if you want the Docker tab to return live data

## Install And Run

Try it without installing:

```bash
bunx sweepur
```

Install it globally:

```bash
npm install -g sweepur
sweepur
```

`sweepur` is a Bun-backed CLI. `npm` can install the package, but the executable still expects `bun` to be present on the machine. If you want the one-shot runner, prefer `bunx` over `npx`.

## Run

```bash
bun install
bun run dev
```

## Publish Notes

Before publishing to npm, make sure:

- the package name is available
- the version is correct
- `bun run check` passes
- you publish from an environment with Bun installed

## Verify

```bash
bun test
bun run typecheck
```
# sweepur
