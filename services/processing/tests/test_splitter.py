from collections import Counter

from app.jobs.splitter import assign_splits


def test_contributor_aware_no_leakage():
    items = [{"contributor": f"c{i % 20}", "groups": []} for i in range(400)]
    splits = assign_splits(items, {"train": 0.8, "validation": 0.1, "test": 0.1}, seed=7)
    by_contributor: dict[str, set] = {}
    for it, s in zip(items, splits):
        by_contributor.setdefault(it["contributor"], set()).add(s)
    assert all(len(v) == 1 for v in by_contributor.values())
    counts = Counter(splits)
    assert counts["train"] > counts["validation"] > 0 and counts["test"] > 0


def test_group_keys_bind_across_contributors():
    items = [{"contributor": "a", "groups": ["src:1"]}, {"contributor": "b", "groups": ["src:1"]}] + [{"contributor": f"z{i}", "groups": []} for i in range(30)]
    splits = assign_splits(items, {"train": 0.8, "validation": 0.1, "test": 0.1}, seed=1)
    assert splits[0] == splits[1]


def test_deterministic():
    items = [{"contributor": f"c{i}", "groups": []} for i in range(50)]
    r = {"train": 0.8, "validation": 0.1, "test": 0.1}
    assert assign_splits(items, r, 42) == assign_splits(items, r, 42)


def test_largest_group_goes_to_train_when_few_contributors():
    items = [{"contributor": "big", "groups": []} for _ in range(10)] + [{"contributor": "small", "groups": []} for _ in range(2)]
    splits = assign_splits(items, {"train": 0.8, "validation": 0.1, "test": 0.1}, seed=42)
    assert set(splits[:10]) == {"train"}
