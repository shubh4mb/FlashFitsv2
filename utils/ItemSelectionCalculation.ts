export interface BillingInput {
    orderItems: any[];
    deliveryCharge?: number;
    returnCharge?: number;
    deliveryTip?: number;
    discountToApply?: number;
    overtimePenalty?: number;
}

export function calculateFinalBilling({
    orderItems,
    deliveryCharge = 0,
    returnCharge = 0,
    deliveryTip = 0,
    discountToApply = 0,
    overtimePenalty = 0,
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
    const allItemsKept = returnedItemsCount === 0 && orderItems.length > 0;

    // Return charge applies only if there are return items
    const effectiveReturnCharge = allItemsKept ? 0 : returnCharge;
    const returnChargeDeduction = allItemsKept ? returnCharge : 0;

    // Delivery charge and tip included if buying at least 1
    const deliveryAndService = acceptedItems.length > 0
        ? (Number(deliveryCharge) || 0) + (Number(effectiveReturnCharge) || 0) + (Number(deliveryTip) || 0)
        : 0;

    // === STEP 3: GST (set to 0 for now) ===
    const gst = 0;

    // === STEP 4: Final total ===
    const totalBeforeDeduction = baseAmount + overtimePenalty + deliveryAndService + gst;

    // prevent negative billing
    const totalPayable = Math.max(
        0,
        Math.round(totalBeforeDeduction - discountToApply)
    );

    return {
        baseAmount,
        gst,
        overtimePenalty,
        deliveryCharge,
        returnCharge,
        effectiveReturnCharge,
        deliveryTip,
        returnChargeDeduction,
        discountApplied: discountToApply,
        totalPayable,
        itemsAccepted: acceptedItems.length,
        itemsReturned: returnedItemsCount,
        allItemsKept,
    };
}
