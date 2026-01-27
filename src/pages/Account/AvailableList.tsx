import { Coin } from "@terra-money/terra.js";
import { useMemo } from "react";
import { useRecoilValue } from "recoil";
import { useFCDURL, useIsClassic } from "../../contexts/ChainsContext";
import useRequest from "../../hooks/useRequest";
import { useDenoms } from "../../queries/oracle";
import { DEFAULT_CURRENCY } from "../../scripts/utility";
import { useQuery } from "react-query";
import axios from "axios";
import { Currency } from "../../store/CurrencyStore";
import BigNumber from "bignumber.js";
import Available from "./Available";
import format from "../../scripts/format";

const PRICE_TTL = 5 * 60 * 1000;
const FX_TTL = 12 * 60 * 60 * 1000;

const AvailableList = ({
  list,
  showLowValueCoins = false,
  pricesEnabled = true
}: {
  list: Coin[];
  showLowValueCoins?: boolean;
  pricesEnabled?: boolean;
}) => {
  const currency = useRecoilValue(Currency);
  const { data: denoms } = useDenoms();
  const denom = denoms?.includes(currency) ? currency : DEFAULT_CURRENCY;
  const fcdURL = useFCDURL();
  const isClassic = useIsClassic();
  const { data, isLoading } = useRequest<CurrencyData[]>({
    url: `${fcdURL}/v1/market/swaprate/${denom}`,
    enabled: isClassic && pricesEnabled
  });

  const cachedUstcPrice = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const cached = window.localStorage.getItem("ustcPrice");
    const parsed = cached ? Number(cached) : undefined;
    return Number.isFinite(parsed) ? parsed : undefined;
  }, []);

  const cachedUstcTs = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const cached = window.localStorage.getItem("ustcPriceTs");
    const parsed = cached ? Number(cached) : undefined;
    return Number.isFinite(parsed) ? parsed : undefined;
  }, []);

  const shouldFetchUstc =
    pricesEnabled && (!cachedUstcTs || Date.now() - cachedUstcTs > PRICE_TTL);

  const { data: ustcPrice } = useQuery(
    ["coingecko-ustc"],
    async () => {
      try {
        const { data: result } = await axios.get<{
          terrausd?: { usd?: number };
          terraclassicusd?: { usd?: number };
        }>(
          "https://api.coingecko.com/api/v3/simple/price?ids=terrausd,terraclassicusd&vs_currencies=usd"
        );

        const price = result?.terrausd?.usd ?? result?.terraclassicusd?.usd;
        if (price) return price;
      } catch {
        // fall through to alternative source
      }

      const { data: paprika } = await axios.get<{
        quotes?: { USD?: { price?: number } };
      }>("https://api.coinpaprika.com/v1/tickers/ust-terrausd");

      return paprika?.quotes?.USD?.price;
    },
    {
      staleTime: PRICE_TTL,
      cacheTime: PRICE_TTL,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      enabled: shouldFetchUstc,
      onError: () => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("ustcPriceTs", String(Date.now()));
        }
      }
    }
  );

  const cachedLunaPrice = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const cached = window.localStorage.getItem("lunaPrice");
    const parsed = cached ? Number(cached) : undefined;
    return Number.isFinite(parsed) ? parsed : undefined;
  }, []);

  const cachedLunaTs = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const cached = window.localStorage.getItem("lunaPriceTs");
    const parsed = cached ? Number(cached) : undefined;
    return Number.isFinite(parsed) ? parsed : undefined;
  }, []);

  const shouldFetchLuna =
    pricesEnabled && (!cachedLunaTs || Date.now() - cachedLunaTs > PRICE_TTL);

  const { data: lunaPrice } = useQuery(
    ["coingecko-luna"],
    async () => {
      const { data: result } = await axios.get<{
        terra?: { usd?: number };
        "terra-luna-2"?: { usd?: number };
      }>(
        "https://api.coingecko.com/api/v3/simple/price?ids=terra,terra-luna-2&vs_currencies=usd"
      );

      return result?.terra?.usd ?? result?.["terra-luna-2"]?.usd;
    },
    {
      staleTime: PRICE_TTL,
      cacheTime: PRICE_TTL,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      enabled: shouldFetchLuna,
      onError: () => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("lunaPriceTs", String(Date.now()));
        }
      }
    }
  );

  const resolvedUstcPrice = ustcPrice ?? cachedUstcPrice;

  if (ustcPrice && typeof window !== "undefined") {
    window.localStorage.setItem("ustcPrice", String(ustcPrice));
    window.localStorage.setItem("ustcPriceTs", String(Date.now()));
  }

  const enhancedData = useMemo(() => {
    if (!data || !resolvedUstcPrice) return data;
    const hasUstc = data.some(item => item.denom === "uusd");
    if (hasUstc) return data;
    const swaprate = new BigNumber(1).div(resolvedUstcPrice).toString();
    return [
      ...data,
      {
        denom: "uusd",
        swaprate,
        oneDayVariation: "0",
        oneDayVariationRate: "0"
      }
    ];
  }, [data, resolvedUstcPrice]);

  const resolvedLunaPrice = lunaPrice ?? cachedLunaPrice;

  if (lunaPrice && typeof window !== "undefined") {
    window.localStorage.setItem("lunaPrice", String(lunaPrice));
    window.localStorage.setItem("lunaPriceTs", String(Date.now()));
  }

  const props = {
    data: enhancedData,
    isLoading,
    currency,
    ustcPrice: resolvedUstcPrice,
    lunaPrice: resolvedLunaPrice
  };

  const { data: fxRates } = useQuery(
    ["fx-rates-usd"],
    async () => {
      const { data: result } = await axios.get<{
        rates?: Record<string, number>;
      }>("https://api.frankfurter.app/latest?from=USD&to=MNT,TWD");
      return result?.rates;
    },
    {
      staleTime: FX_TTL,
      cacheTime: FX_TTL,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      enabled: pricesEnabled
    }
  );

  const fxUsdRates = useMemo(() => {
    if (!fxRates) return undefined;
    const mnt = fxRates.MNT ? 1 / fxRates.MNT : undefined;
    const twd = fxRates.TWD ? 1 / fxRates.TWD : undefined;
    return {
      ...(mnt ? { MNT: mnt } : {}),
      ...(twd ? { TWD: twd } : {})
    };
  }, [fxRates]);

  const displayList = useMemo(() => {
    if (!pricesEnabled) return list;
    if (!showLowValueCoins && !isClassic) {
      return list.filter(coin => {
        const amount = new BigNumber(coin.amount.toString());
        return amount.div(1e6).gte(0.01);
      });
    }
    if (showLowValueCoins) return list;

    return list.filter(coin => {
      const denom = coin.denom;
      const amount = new BigNumber(coin.amount.toString());

      if (isClassic) {
        const classicDenom = format.denom(denom, true);
        if (denom === "uluna" || denom === "uusd") {
          return true;
        }
        if (classicDenom.endsWith("TC")) {
          if (!resolvedUstcPrice) return false;
          const rate = props.data?.find(item => item.denom === denom)?.swaprate;
          const usdValue =
            denom === "uusd"
              ? amount.div(1e6).multipliedBy(resolvedUstcPrice)
              : rate
              ? amount.div(rate).div(1e6).multipliedBy(resolvedUstcPrice)
              : undefined;
          return usdValue ? usdValue.gte(1) : false;
        }
      }

      const rate = props.data?.find(item => item.denom === denom)?.swaprate;
      if (!rate) return false;
      const usdValue = amount.div(rate).div(1e6);
      return usdValue.gte(1);
    });
  }, [
    list,
    showLowValueCoins,
    pricesEnabled,
    props.data,
    isClassic,
    resolvedUstcPrice
  ]);
  return (
    <>
      {displayList.map((coin, i) => {
        const { denom, amount } = coin;
        return (
          <Available
            denom={denom}
            amount={amount.toString()}
            key={i}
            response={props}
            ustcPrice={resolvedUstcPrice}
            lunaPrice={resolvedLunaPrice}
            fxRates={fxUsdRates}
          />
        );
      })}
    </>
  );
};

export default AvailableList;
