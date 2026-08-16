---
title: Sweet Cookie knowledge base
aliases:
  - Repository knowledge base
kb_catalog: authored
---

# Knowledge base

This Git-backed Markdown vault is durable memory for Sweet Cookie. Open `kb/` itself as the vault. Markdown and Git are authoritative. Catalogs, backlinks, graph views, semantic indexes, repository context, and Git projections are derived.

Start repository work with the pinned KB command exposed by this repository, then expand through bounded links, exact metadata, text search, or history only when needed.

## Record boundaries

- `articles/` holds self-contained captured sources and local assets.
- `notes/` holds maintained concepts and synthesis.
- `plans/` holds proposed through terminal coordination records.
- `riffs/` holds cleaned first-person notes made from dictated or stream-of-consciousness source material.
- `scopes/` holds curated repository-context hubs.

The [[scopes/repository--cdb4ee2aea69|repository context hub]] explains repository-wide rule boundaries. [[notes/documentation-ownership|Documentation ownership]] records the durable split between guides, docs, executable contracts, and KB context. [[notes/repository-seams|Repository seams]] records which interfaces may cross repository boundaries.

Git history is the maintenance log. Do not add generated backlink sections or a second append-only fact store. Each record owns its metadata, links, and typed outbound relationships.

## Maintenance

Run the pinned KB tools directly without changing this upstream-derived repository's package manifests:

```sh
bunx --bun github:hraness/kb#v0.15.1 refresh --root kb
bunx --bun github:hraness/kb#v0.15.1 check --root kb
bunx --bun github:hraness/kb#v0.15.1 agents check --root kb --repo .
```

