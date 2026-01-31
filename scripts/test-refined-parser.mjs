const testCases = [
  { text: "* 구매상품 : 토큰 100(1개) 100원", expected: 100 },
  { text: "* 구매상품 : 토큰 5,000(1개) 5,000원", expected: 5000 },
  { text: "* 구매상품 : 토큰 11,000(1개) 11,000원", expected: 11000 },
  { text: "* 구매상품 : M-Poster 토큰 55,000(1개) 55,000원", expected: 55000 },
  { text: "* 구매상품 : 토큰 33000(1개) 33000원", expected: 33000 },
];

function parseToken(content) {
  // Refining regex: allow digits and commas, and handle arbitrary text before "토큰"
  const productMatch = content.match(/구매상품\s*:\s*.*?토큰\s*([\d,]+)/);
  if (productMatch) {
    const amountStr = productMatch[1].replace(/,/g, '');
    return parseInt(amountStr, 10);
  }
  return null;
}

console.log('--- Testing Refined Token Parsing ---');
testCases.forEach(({ text, expected }, index) => {
  const result = parseToken(text);
  const status = result === expected ? '✅ PASS' : `❌ FAIL (Got: ${result})`;
  console.log(`Test ${index + 1}: "${text}" -> ${result} [${status}]`);
});
