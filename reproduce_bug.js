
function calculateAllocation(stocksValue, optionsValue, optionsPL) {
    // Current buggy logic uses optionsPL
    const totalBuggy = stocksValue + optionsPL;
    const stockPercentBuggy = (stocksValue / totalBuggy) * 100;

    // Proposed fix uses optionsValue (Market Value)
    const totalFixed = stocksValue + optionsValue;
    const stockPercentFixed = (stocksValue / totalFixed) * 100;

    console.log(`Stocks Value: ${stocksValue}`);
    console.log(`Options PL: ${optionsPL}`);
    console.log(`Options Market Value: ${optionsValue}`);
    console.log('---');
    console.log(`[Buggy] Total: ${totalBuggy}`);
    console.log(`[Buggy] Stock Allocation: ${stockPercentBuggy.toFixed(2)}%`);
    console.log('---');
    console.log(`[Fixed] Total: ${totalFixed}`);
    console.log(`[Fixed] Stock Allocation: ${stockPercentFixed.toFixed(2)}%`);
}

// Scenario: Long Stock $10,000, Long Option bought for $10,000, now worth $10 (Loss of $9,990)
calculateAllocation(10000, 10, -9990);
