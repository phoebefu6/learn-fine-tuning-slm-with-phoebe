"""Independent Python reference for the ftn bench (learn-fine-tuning-slm-with-phoebe).

Reads assets/ftn-sample.js, recomputes every metric and every break-even scenario with the same
rules as assets/ftn-live.js, and prints the canon as JSON. Compare with materials/ftn-node.js
using materials/compare-ladder.py (by value, relative tolerance 1e-9).
Usage: python3 ftn_reference.py <repo>/assets/ftn-sample.js
"""
import json, sys

DEFAULTS = dict(preset="gpt-4.1", volume=900000, tin=600, tout=20, pin=2.00, pout=8.00,
                gpuHour=0.80, hours=730, replicas=1, examples=2000, tokPerEx=150, epochs=3,
                trainPrice=0.34, trainMin=4.00, build=6000, amort=12, retrainLabour=600, retrain=False,
                floorMetric="accuracy", floor=0.92, mode="floor", latBig=900, latSmall=180)
SCENARIOS = [
    ("default", {}), ("retrain", {"retrain": True}), ("fraudFloor", {"floorMetric": "fraud"}),
    ("fraudFloorCheapest", {"floorMetric": "fraud", "mode": "cheapest"}),
    ("gpt5", {"preset": "gpt-5", "pin": 1.25, "pout": 10.00}),
    ("gpt5mini", {"preset": "gpt-5-mini", "pin": 0.25, "pout": 2.00}),
    ("lowVolume", {"volume": 300000}), ("highFloor", {"floor": 0.96}),
    ("highFloorCheapest", {"floor": 0.96, "mode": "cheapest"}),
]

def score(y, p, k):
    cm = [[0] * k for _ in range(k)]
    correct = 0
    for t, q in zip(y, p):
        cm[t][q] += 1
        correct += t == q
    recall, precision, f1 = [], [], []
    for i in range(k):
        tp = cm[i][i]; row = sum(cm[i]); col = sum(cm[j][i] for j in range(k))
        r = tp / row if row else 0; pr = tp / col if col else 0
        recall.append(r); precision.append(pr)
        f1.append(2 * r * pr / (r + pr) if r + pr > 0 else 0)
    worst = min(range(k), key=lambda i: (recall[i], i))
    return dict(accuracy=correct / len(y), macroF1=sum(f1) / k, recall=recall, precision=precision,
                correct=correct, confusion=cm, worst=worst, support=[sum(r) for r in cm])

def break_even(s, tuned):
    big_per = (s["tin"] * s["pin"] + s["tout"] * s["pout"]) / 1e6
    big_m = s["volume"] * big_per
    train = max(s["trainMin"], s["examples"] * s["tokPerEx"] * s["epochs"] / 1e6 * s["trainPrice"])
    small_m = s["gpuHour"] * s["hours"] * s["replicas"] + (s["build"] + train) / s["amort"] + \
        ((train + s["retrainLabour"]) if s["retrain"] else 0)
    be = small_m / big_per if big_per > 0 else float("inf")
    fv = tuned["recall"][0] if s["floorMetric"] == "fraud" else tuned["accuracy"]
    clears = fv >= s["floor"] - 1e-12
    cheaper = small_m < big_m
    go = cheaper if s["mode"] == "cheapest" else (cheaper and clears)
    return dict(bigMonthly=big_m, smallMonthly=small_m, trainCost=train, breakEvenVolume=be,
                big1k=big_per * 1000, small1k=small_m / s["volume"] * 1000, floorValue=fv,
                clearsFloor=clears, cheaper=cheaper, go=go)

def main(path):
    txt = open(path, encoding="utf-8").read()
    data = json.loads(txt[txt.index("{"): txt.rindex("}") + 1])
    k = len(data["queues"])
    sc = {a["id"]: score(data["y"], data["pred"][a["id"]], k) for a in data["arms"]}
    res = {"rows": len(data["y"]), "arms": {}, "scenarios": {}, "support": sc["big"]["support"]}
    for a, s in sc.items():
        res["arms"][a] = {x: s[x] for x in ("accuracy", "macroF1", "recall", "precision", "correct", "confusion", "worst")}
    for sid, over in SCENARIOS:
        s = dict(DEFAULTS); s.update(over)
        res["scenarios"][sid] = break_even(s, sc["tuned"])
    print(json.dumps(res, indent=1))

if __name__ == "__main__":
    main(sys.argv[1])
