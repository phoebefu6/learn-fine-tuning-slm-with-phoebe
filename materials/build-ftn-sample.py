"""Build assets/ftn-sample.js for learn-fine-tuning-slm-with-phoebe.

Real rows: Banking77 (PolyAI, CC BY 4.0), test split, from
https://github.com/PolyAI-LDN/task-specific-datasets/tree/master/banking_data
Modified: 600 rows drawn with a fixed seed, and each of the 77 intents mapped to one of six queues
(the mapping is printed in the output file). The text of each row is shipped unchanged.

The predictions are MODELLED, not produced by any model: for each arm and each row, a seeded draw
says "correct" with the arm's per-queue probability (ARMS below); a wrong answer goes to a
neighbouring queue chosen with the CONFUSE weights. Every metric on the bench is computed from these
labels and predictions, in the browser and in materials/ftn_reference.py.

Usage: python3 build-ftn-sample.py <dir with b77_train.csv and b77_test.csv> <repo>/assets/ftn-sample.js
"""
import csv, json, random, sys, collections

SEED = 20261108
N = 600
QUEUES = ["Fraud and loss", "Cards", "Transfers", "Top-ups and cash", "Payments and fees", "Account and identity"]
SHORT = ["FRAUD", "CARD", "XFER", "TOPUP", "PAY", "ACCT"]
MAP = {
 0: "lost_or_stolen_card lost_or_stolen_phone compromised_card card_payment_not_recognised cash_withdrawal_not_recognised direct_debit_payment_not_recognised card_swallowed",
 1: "activate_my_card card_about_to_expire card_acceptance card_arrival card_delivery_estimate card_linking card_not_working change_pin contactless_not_working disposable_card_limits get_disposable_virtual_card get_physical_card getting_spare_card getting_virtual_card order_physical_card pin_blocked virtual_card_not_working visa_or_mastercard apple_pay_or_google_pay supported_cards_and_currencies",
 2: "balance_not_updated_after_bank_transfer beneficiary_not_allowed cancel_transfer declined_transfer failed_transfer pending_transfer receiving_money transfer_fee_charged transfer_into_account transfer_not_received_by_recipient transfer_timing",
 3: "automatic_top_up pending_top_up top_up_by_bank_transfer_charge top_up_by_card_charge top_up_by_cash_or_cheque top_up_failed top_up_limits top_up_reverted topping_up_by_card verify_top_up atm_support cash_withdrawal_charge declined_cash_withdrawal pending_cash_withdrawal wrong_amount_of_cash_received wrong_exchange_rate_for_cash_withdrawal balance_not_updated_after_cheque_or_cash_deposit",
 4: "Refund_not_showing_up card_payment_fee_charged card_payment_wrong_exchange_rate declined_card_payment exchange_charge exchange_rate exchange_via_app extra_charge_on_statement pending_card_payment request_refund reverted_card_payment? transaction_charged_twice fiat_currency_support",
 5: "age_limit country_support edit_personal_details passcode_forgotten terminate_account unable_to_verify_identity verify_my_identity verify_source_of_funds why_verify_identity",
}
INTENT_Q = {i: q for q, s in MAP.items() for i in s.split()}
assert len(INTENT_Q) == 77

# per-queue probability that the arm routes a row correctly (modelled)
ARMS = [
 {"id": "big", "label": "Big API model + prompt", "p": [0.95, 0.93, 0.90, 0.91, 0.86, 0.92]},
 {"id": "base", "label": "Small model, prompt only", "p": [0.80, 0.78, 0.74, 0.76, 0.66, 0.75]},
 {"id": "tuned", "label": "Small model, LoRA-tuned", "p": [0.86, 0.97, 0.95, 0.96, 0.93, 0.96]},
]
CONFUSE = [
 [0, .5, 0, .2, .3, 0],
 [.3, 0, 0, 0, .3, .4],
 [0, 0, 0, .3, .5, .2],
 [0, .2, .4, 0, .4, 0],
 [.3, 0, .35, .35, 0, 0],
 [0, .6, .2, .2, 0, 0],
]

def main(src, out):
    test = list(csv.DictReader(open(src + "/b77_test.csv", encoding="utf-8")))
    train = list(csv.DictReader(open(src + "/b77_train.csv", encoding="utf-8")))
    rng = random.Random(SEED)
    rows = rng.sample(test, N)
    y = [INTENT_Q[r["category"]] for r in rows]
    preds = {}
    for k, arm in enumerate(ARMS):
        ar = random.Random(SEED + 101 * (k + 1))
        p = []
        for t in y:
            if ar.random() < arm["p"][t]:
                p.append(t)
            else:
                w = CONFUSE[t]
                u = ar.random() * sum(w)
                acc = 0.0
                for j, wj in enumerate(w):
                    acc += wj
                    if wj > 0 and u < acc:
                        p.append(j); break
                else:
                    p.append(max(range(6), key=lambda j: w[j]))
        preds[arm["id"]] = p
    # facts about the training split, for session 3 (computed, not modelled)
    tr_txt = [r["text"].strip() for r in train]
    te_txt = [r["text"].strip() for r in test]
    norm = lambda s: " ".join(s.lower().split())
    dup_exact = len(tr_txt) - len(set(tr_txt))
    dup_norm = len(tr_txt) - len(set(map(norm, tr_txt)))
    overlap = len(set(map(norm, te_txt)) & set(map(norm, tr_txt)))
    trq = collections.Counter(INTENT_Q[r["category"]] for r in train)
    facts = {"trainRows": len(train), "testRows": len(test), "intents": 77,
             "trainDupExact": dup_exact, "trainDupNormalised": dup_norm,
             "testTextsAlsoInTrain": overlap,
             "trainPerQueue": [trq[q] for q in range(6)],
             "trainMinPerIntent": min(collections.Counter(r["category"] for r in train).values()),
             "trainMaxPerIntent": max(collections.Counter(r["category"] for r in train).values())}
    data = {"source": "Banking77 (PolyAI, CC BY 4.0), test split; 600 rows sampled with seed 20261108; 77 intents mapped to 6 queues",
            "licence": "CC BY 4.0, https://creativecommons.org/licenses/by/4.0/",
            "citation": "Casanueva et al. 2020, Efficient Intent Detection with Dual Sentence Encoders, arXiv:2003.04807",
            "seed": SEED, "queues": QUEUES, "short": SHORT,
            "intentQueue": MAP,
            "arms": [{"id": a["id"], "label": a["label"], "p": a["p"]} for a in ARMS],
            "confuse": CONFUSE,
            "text": [r["text"].strip() for r in rows],
            "intent": [r["category"] for r in rows],
            "y": y, "pred": preds, "facts": facts}
    js = ("/* Derived from Banking77 (PolyAI, CC BY 4.0, github.com/PolyAI-LDN/task-specific-datasets). "
          "Modified: 600 test rows sampled (seed 20261108), intents mapped to six queues. "
          "Predictions are MODELLED (seeded noise model), not model outputs. Generated by materials/build-ftn-sample.py */\n"
          "window.FTN_SAMPLE = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    open(out, "w", encoding="utf-8").write(js)
    print("wrote", out, len(js), "bytes;", json.dumps(facts))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
