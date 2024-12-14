import Dividend from "./dividend";
import IndicatorHistory from "./indicator_history";

type Stock = {
  ticker: string;
  value: number;
  indicators: IndicatorHistory[];
  dividends_history: Dividend[];
  bazin_profit: number;
  graham_profit: number;
}

export default Stock;
  