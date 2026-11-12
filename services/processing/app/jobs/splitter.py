"""Contributor-aware and duplicate-aware train/validation/test splitting.

Items that share a contributor, or share a grouping key (e.g. the same source
sentence translated by different people), are placed in the SAME split, so a
model is never evaluated on a contributor or source sentence it saw in
training. Assignment is deterministic for a given seed.
"""

from __future__ import annotations

import hashlib


class _UnionFind:
    def __init__(self):
        self.parent: dict[str, str] = {}

    def find(self, x: str) -> str:
        self.parent.setdefault(x, x)
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: str, b: str) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


def assign_splits(items: list[dict], ratios: dict[str, float], seed: int = 42) -> list[str]:
    """items: [{"contributor": str, "groups": [str, ...]}] -> split name per item."""
    uf = _UnionFind()
    for i, it in enumerate(items):
        node = f"c:{it['contributor']}"
        uf.find(node)
        for g in it.get("groups", []):
            if g:
                uf.union(node, f"g:{g}")
    clusters: dict[str, list[int]] = {}
    for i, it in enumerate(items):
        clusters.setdefault(uf.find(f"c:{it['contributor']}"), []).append(i)

    # Largest clusters first (so the biggest groups land in train), ties broken
    # by a seeded hash for deterministic but unbiased ordering.
    order = sorted(clusters, key=lambda k: (-len(clusters[k]), hashlib.sha256(f"{seed}:{k}".encode()).hexdigest()))
    names = [n for n in ("train", "validation", "test") if ratios.get(n, 0) > 0]
    total = len(items)
    targets = {n: ratios[n] * total for n in names}
    counts = {n: 0 for n in names}
    result = [""] * total

    # Seed validation/test with the smallest distinct clusters when there are
    # enough clusters (>= 2 per evaluation split), so small datasets still get
    # non-empty evaluation splits without starving train.
    queue = list(order)
    if len(queue) >= 2 * len(names):
        for n in reversed(names[1:]):
            c = queue.pop()
            for i in clusters[c]:
                result[i] = n
            counts[n] += len(clusters[c])
    for c in queue:
        # Pick the split furthest below its target (largest deficit ratio).
        n = max(names, key=lambda s: (targets[s] - counts[s]) / max(targets[s], 1e-9))
        for i in clusters[c]:
            result[i] = n
        counts[n] += len(clusters[c])
    return result
