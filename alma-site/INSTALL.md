# Install Alma

Paste this into a coding agent:

Install Alma by following https://alma.suvorav.com/INSTALL.md

The repository is not public yet: https://github.com/ohsuvorav/alma-brain

## Clone

```sh
git clone https://github.com/ohsuvorav/alma-brain.git
cd alma-brain
```

## Setup

```sh
brain setup
```

## Create a brain

```sh
brain init <path>
```

`<path>` is the folder for this brain. The command asks which sources to import: a markdown or Obsidian folder, Notion or Google Docs via MCP, or Claude memory and chat exports.

## Check

```sh
brain doctor
```

For each problem, this prints one line on how to fix it.

## Ask

```sh
brain ask
```

Ask a question. The answer comes from your notes and links the source.

## Verify

- `brain doctor` reports no problems, or every problem has a one-line fix.
- `brain ask` answers from your notes and prints a path to the source.
- Open that file. The passage it cites is the one the answer used.
