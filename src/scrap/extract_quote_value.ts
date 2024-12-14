import { Page } from "puppeteer";

export default async function extract_quote_value(page: Page): Promise<number> {
  const quote_value = await page.evaluate(() => {
    return Number(
      document
        .querySelector('.cotacao .value')
        ?.textContent
        ?.trim()
        .replaceAll('R$', '')
        .replaceAll('.', '')
        .replaceAll(',', '.') ?? 0
      );
  });

  return quote_value;
}
  