import Dividend from "./dividend.js";
import IndicatorHistory from "./indicator_history.js";

type Stock = {
  ticker: string;
  value: number;
  indicators: IndicatorHistory[];
  dividends_history: Dividend[];
  bazin_profit: number;
  graham_profit: number;
}

export default Stock;
  