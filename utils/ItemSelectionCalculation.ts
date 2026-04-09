export interface BillingInput {
    orderItems: any[];
    returnCharge?: number;
}

export function calculateFinalBilling({
    orderItems,
    returnCharge = 0,
}: BillingInput) {
    // === STEP 1: Accepted (kept) items ===
    const acceptedItems = orderItems.filter(
        item => item.tryStatus === "keep"
    );

    // Base amount calculation
    let baseAmount = 0;
    for (const item of acceptedItems) {
        baseAmount += item.price * (item.quantity || 1);
    }

    // === STEP 2: Return logic ===
    const returnedItemsCount = orderItems.filter(i => i.tryStatus === "returned").length;
    const allItemsKept = returnedItemsCount === 0;

    // Deduction only if all items are kept
    const returnChargeDeduction = allItemsKept ? returnCharge : 0;

    // === STEP 3: GST (set to 0 for now) ===
    const gst = 0;

    // === STEP 4: Final total ===
    const totalBeforeDeduction = baseAmount + gst;

    // prevent negative billing
    const totalPayable = Math.max(
        0,
        totalBeforeDeduction - returnChargeDeduction
    );

    return {
        baseAmount,
        gst,
        overtimePenalty: 0,
        returnCharge,
        returnChargeDeduction,
        totalPayable,
        itemsAccepted: acceptedItems.length,
        itemsReturned: returnedItemsCount,
        allItemsKept,
    };
}
