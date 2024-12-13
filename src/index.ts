import puppeteer, { Page } from "puppeteer";

(async function main() {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navigate the page to a URL
  await page.goto('https://investidor10.com.br/acoes/wege3/', {
    waitUntil: 'networkidle2',
  });

  // Set screen size
  await page.setViewport({width: 1080, height: 1024});

  const indicatorHistory = await extract_indications_history_data(page);
  const quoteValue = await extract_quote_value(page);
  const dividend_history = await extract_dividend_history(page);
  const bazin_max_value = calculates_bazin_method(dividend_history);
  const graham_max_value = calculates_graham_method(indicatorHistory);

  const quoteData: QuoteData = {
    ticker: 'wege3',
    value: quoteValue,
    indicators: indicatorHistory,
    dividends_history: dividend_history,
    bazin_profit: bazin_max_value/quoteValue - 1,
    graham_profit: graham_max_value/quoteValue - 1
  };


  console.log(JSON.stringify(quoteData, null, 2));

  await browser.close();
})();

function calculates_graham_method(indicators: IndicatorHistory[]): number {
  const earnings_per_share = indicators.find(indicator => indicator.indicator.toUpperCase() === 'LPA')?.values[0].value ?? 0;
  const book_value_per_share = indicators.find(indicator => indicator.indicator.toUpperCase() === 'VPA')?.values[0].value ?? 0;

  return Math.sqrt(22.5 * earnings_per_share * book_value_per_share);
}

function calculates_bazin_method(dividends_history: Dividend[]): number {
  const dividend_yield_history = dividends_history;

  const avg_dividend_yield_five_years = (() => {
    let total = 0;
    const quantity_of_years = 3;
    for (let i = 1; i < quantity_of_years + 1; i++) {
      const dividend = dividend_yield_history[i].value;
      total += dividend;
    }
    return total / quantity_of_years;
  })();

  console.log(`Avg Dividend Yield 3 years: ${avg_dividend_yield_five_years}`);

  return avg_dividend_yield_five_years / 0.06;
}

async function extract_dividend_history(page: Page): Promise<Dividend[]> {

  const dividend_tables = [];
  let dividends_per_year: Dividend[] = [];

  for (let i = 0; i < 50; i++) {
    // extract current table dividend data
    const dividend_table_data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#table-dividends-history tr'));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => cell.textContent?.trim());
      });
    });

    function compareMatrixes(matrix1: (string | undefined)[][], matrix2: (string | undefined)[][]): boolean {
      if (matrix1.length !== matrix2.length) {
        return false;
      }

      for (let i = 0; i < matrix1.length; i++) {
        if (matrix1[i].length !== matrix2[i].length) {
          return false;
        }

        for (let j = 0; j < matrix1[i].length; j++) {
          if (matrix1[i][j] !== matrix2[i][j]) {
            return false;
          }
        }
      }

      return true;
    }

    if (dividend_tables.length > 0 && compareMatrixes(dividend_tables[dividend_tables.length - 1], dividend_table_data)) {
      break;
    }

    dividend_tables.push(dividend_table_data);

    // Click on the next page
    await page.locator('#table-dividends-history_next').click();
  }

  // Calculate the dividends per year
  for (const table of dividend_tables) {
    for (const row of table) {
      if (!Number(row[1]?.split('/')[2])) {
        continue;
      }

      if (dividends_per_year.find(dividend => dividend.year === Number(row[1]?.split('/')[2])) === undefined) {
        dividends_per_year.push({
          year: Number(row[1]?.split('/')[2]),
          value: Number(row[3]?.replaceAll('R$', '').replaceAll('.', '').replaceAll(',', '.'))
        });

        continue;
      }

      dividends_per_year = dividends_per_year.map(dividend => {
        if (dividend.year === Number(row[1]?.split('/')[2])) {
          dividend.value += Number(row[3]?.replaceAll('R$', '').replaceAll('.', '').replaceAll(',', '.'));
        }
        return dividend;
      });
    }
  }

  // console.log(JSON.stringify(dividend_tables, null, 2));

  return dividends_per_year;
}

async function extract_quote_value(page: Page): Promise<number> {
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

async function extract_indications_history_data(page: Page): Promise<IndicatorHistory[]> {
  // Get Indicators History Data
  const tableData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#table-indicators-history tr'));
    return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => cell.textContent?.trim());
    });
  });

  // Extract Header
  const header: string[] = (() => {
    const header = tableData.shift();
    header?.shift(); // discard the first cell
    let not_undefined_header = header ?? [];
    let header_with_no_undefined_inside_value = not_undefined_header.map((value) => value ? value : "");
    return header_with_no_undefined_inside_value;
  })();

  // Extract and Parse The Indicators History
  const indicatorHistory: IndicatorHistory[] = tableData.map(row => {
    const indicator = row.shift();
    return {
      indicator: indicator || '',
      values: row.map((value, index) => ({
        year: header[index] || '',
        value: Number((value || '').replaceAll('%', '').replaceAll('.', '').replaceAll(',', '.'))
      }))
    };
  });

  return indicatorHistory;
}

type QuoteData = {
  ticker: string;
  value: number;
  indicators: IndicatorHistory[];
  dividends_history: Dividend[];
  bazin_profit: number;
  graham_profit: number;
}

type Dividend = {
  year: number;
  value: number;
}

type IndicatorHistory = {
  indicator: string;
  values: {
    year: string;
    value: number;
  }[];
}

// CALI3
// GPAR3
// VSTE3
// AMBP3
// CLSA3
// LOGN3
// DOHL3
// RAIL3
// CBEE3
// MGEL4
// PTBL3
// HAPV3
// DOHL4
// ALPK3
// MAPT4
// NGRD3
// MSPA3
// AURA33
// MAPT3
// AESB3
// ANIM3
// BIOM3
// DTCY3
// ESPA3
// RCSL3
// ZAMP3
// SIMH3
// CSNA3
// VVEO3
// CVCB3
// RPAD5
// CASH3
// MRVE3
// LIGT3
// QUAL3
// AALR3
// RPAD3
// GFSA3
// RPAD6
// ENJU3
// HBSA3
// CRPG5
// CRPG6
// BLUT3
// CBAV3
// COGN3
// KRSA3
// NORD3
// EPAR3
// TELB3
// MATD3
// PDTC3
// MOVI3
// ADHM3
// RCSL4
// FIEI3
// MEAL3
// AVLL3
// AERI3
// DASA3
// ALPA4
// TELB4
// SHOW3
// ALPA3
// MBLY3
// MLAS3
// MWET3
// MWET4
// NTCO3
// DOTZ3
// BLUT4
// WEST3
// BRKM5
// BRKM3
// AMAR3
// TRAD3
// AZEV3
// AZEV4
// ESTR4
// BRKM6
// VIVR3
// FHER3
// PCAR3
// TCSA3
// PLAS3
// CTSA3
// SNSY5
// RDNI3
// AGXY3
// CTNM3
// AZUL4
// CTSA4
// GOLL4
// JFEN3
// NEXP3
// BHIA3
// RPMG3
// TEKA3
// TEKA4
// SEQL3
// GSHP3
// PMAM3
// CTNM4
// IFCM3
// SGPS3
// OSXB3
// GPIV33
// PDGR3
// OIBR3
// BDLL4
// INEP3
// INEP4
// ATMP3
// AMER3
// RSID3
// OIBR4
// TXRX4
// HOOT4
// IGBR3
// LUPA3
// HBTS5
// SYNE3
// TXRX3
// CTKA3
// CTKA4
// AHEB3
// VBBR3
// AHEB5
// RNEW4
// POSI3
// BGIP4
// BGIP3
// RNEW3
// ETER3
// RNEW11
// TPIS3
// EUCA4
// ATOM3
// CEDO4
// BAZA3
// HAGA4
// BRAP3
// EUCA3
// CEDO3
// PINE3
// BRAP4
// HETA4
// ECOR3
// PINE4
// HBRE3
// BBAS3
// HBOR3
// CMIG4
// CLSC3
// BNBR3
// TKNO4
// MDNE3
// ALLD3
// SCAR3
// EALT4
// EALT3
// BRSR6
// CLSC4
// JHSF3
// ISAE4
// BMEB3
// LAVV3
// BMGB4
// BRSR3
// ABCB4
// EQMA3B
// CEEB5
// CMIG3
// BALM4
// CYRE3
// LOGG3
// WIZC3
// VALE3
// SBFG3
// DEXP4
// CAML3
// CGAS3
// DEXP3
// TECN3
// VLID3
// RSUL4
// SAPR11
// SAPR3
// CEEB3
// SAPR4
// CGRA3
// EQPA3
// BMEB4
// ISAE3
// CAMB3
// CGRA4
// CGAS5
// PETR4
// JOPA3
// BALM3
// LEVE3
// BRSR5
// POMO3
// SOJA3
// HAGA3
// COCE5
// TRIS3
// CEBR5
// CSUD3
// CSMG3
// MTSA4
// MRSA3B
// MRSA3B
// ENGI4
// CEBR3
// NEOE3
// PETR3
// SBSP3
// CPFE3
// MRSA5B
// MRSA5B
// ROMI3
// COCE3
// PLPL3
// WLMM3
// NUTR3
// MRSA6B
// MRSA6B
// KEPL3
// CEBR6
// GOAU3
// GOAU4
// MILS3
// ENGI11
// ITSA4
// BEES3
// WLMM4
// ITSA3
// CSED3
// GRND3
// EGIE3
// BOBR4
// BEES4
// FIQE3
// JSLG3
// SHUL4
// PATI3
// PRIO3
// ITUB3
// EZTC3
// BPAC5
// SMTO3
// HYPE3
// BBDC3
// MTRE3
// SANB3
// UGPA3
// BRBI11
// PFRM3
// CMIN3
// CSAN3
// RECV3
// TAEE3
// SANB11
// TAEE11
// AGRO3
// TAEE4
// VULC3
// INTB3
// ELET3
// MERC4
// USIM3
// SOND5
// RAPT3
// USIM5
// CPLE3
// EQPA5
// BBDC4
// REDE3
// EKTR4
// MELK3
// GGBR3
// SANB4
// POMO4
// BBSE3
// ITUB4
// EQPA7
// ALUP4
// ALUP11
// TGMA3
// ALUP3
// GGBR4
// CEAB3
// TTEN3
// ELET6
// MDIA3
// CPLE6
// CURY3
// VAMO3
// DMVF3
// SOND6
// DIRR3
// PSSA3
// BMKS3
// UCAS3
// RAPT4
// PATI4
// BMIN4
// EMAE4
// TUPY3
// LJQQ3
// MYPK3
// ENGI3
// EVEN3
// CPLE5
// BPAC11
// PTNT4
// MULT3
// VIVA3
// ODPV3
// BMOB3
// ARML3
// WHRL3
// OPCT3
// BMIN3
// BPAN4
// FESA4
// WHRL4
// JBSS3
// BRIT3
// VITT3
// FLRY3
// LREN3
// GMAT3
// SMFT3
// PGMN3
// OFSA3
// UNIP3
// ENMT3
// IRBR3
// IGTI3
// B3SA3
// YDUQ3
// AZZA3
// TFCO4
// JALL3
// UNIP5
// UNIP6
// ASAI3
// RANI3
// KLBN4
// BLAU3
// AURE3
// KLBN11
// CXSE3
// CCRO3
// PNVL3
// ALOS3
// KLBN3
// BRFS3
// PTNT3
// ENMT4
// STBP3
// TASA4
// VTRU3
// PORT3
// IGTI11
// TASA3
// DESK3
// ABEV3
// VIVT3
// BPAC3
// EMBR3
// GGPS3
// FESA3
// BAUH4
// DXCO3
// GUAR3
// EQTL3
// RDOR3
// NINJ3
// BSLI3
// LUXM4
// FRAS3
// BSLI4
// MGLU3
// USIM6
// SRNA3
// BRAV3
// SUZB3
// LPSB3
// AFLT3
// JPSA3
// LVTC3
// LIPR3
// SLCE3
// SEER3
// ORVR3
// PEAB3
// RENT3
// TIMS3
// PEAB4
// MOAR3
// TEND3
// TOTS3
// ENEV3
// ONCO3
// GEPA3
// GEPA4
// ELMD3
// RAIZ4
// RADL3
// WEGE3
// CEGR3
// MNPR3
// LAND3
// FRIO3
// MRFG3
// MNDL3
// LWSA3
// PRNR3
// PETZ3
// CRFB3
// BIED3
// BEEF3