import { useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import Card from "../../components/Card";
import Info from "../../components/Info";
import Loading from "../../components/Loading";
import { useCurrentChain, useIsClassic } from "../../contexts/ChainsContext";
import { useInitialBankBalance } from "../../queries/bank";
import useTokenBalance from "../../hooks/cw20/useTokenBalance";
import { isIbcDenom } from "../../scripts/utility";
import { useIBCWhitelist } from "../../hooks/useTerraAssets";
import AmountCard from "./AmountCard";
import Available from "./Available";
import AvailableList from "./AvailableList";
import OldVesting from "./OldVesting";
import s from "./TokenBalance.module.scss";

const TokenBalance = ({ address }: { address: string }) => {
  const [hideLowValueAssets, setHideLowValueAssets] = useState(true);
  const [deferTokens, setDeferTokens] = useState(true);
  const [pricesEnabled, setPricesEnabled] = useState(false);
  const tokens = useTokenBalance(deferTokens ? "" : address);
  const [hideLowValueTokens, setHideLowValueTokens] = useState(true);
  const { data: balance } = useInitialBankBalance(address);
  const nativeBlanace = balance?.filter(({ denom }) => !isIbcDenom(denom));
  const ibcBalance = balance?.filter(({ denom }) => isIbcDenom(denom));
  const ibcWhitelist = useIBCWhitelist();

  const { name } = useCurrentChain();
  const isClassic = useIsClassic();
  const cwFallbackIcon =
    "https://raw.githubusercontent.com/terra-money/assets/master/icon/svg/CW.svg";
  useEffect(() => {
    setDeferTokens(true);
    setPricesEnabled(false);
    const tokenTimer = setTimeout(() => setDeferTokens(false), 800);
    const priceTimer = setTimeout(() => setPricesEnabled(true), 800);
    return () => {
      clearTimeout(tokenTimer);
      clearTimeout(priceTimer);
    };
  }, [address]);
  return (
    <>
      <Card
        title={<span className={s.cardTitleText}>Coins</span>}
        bordered
        headerClassName={s.cardTitle}
        actions={
          <label className={s.toggle}>
            <input
              type="checkbox"
              checked={hideLowValueAssets}
              onChange={() => setHideLowValueAssets(!hideLowValueAssets)}
            />
            <span className={s.toggleTrack} />
            <span className={s.toggleLabel}>Hide low-balance</span>
          </label>
        }
      >
        {nativeBlanace?.length ? (
          <div className={s.cardBodyContainer}>
            <AvailableList
              list={nativeBlanace}
              showLowValueCoins={!hideLowValueAssets}
              pricesEnabled={pricesEnabled}
            />
          </div>
        ) : (
          <Card>
            <Info icon="info_outline" title="">
              This account doesn't hold any coins yet.
            </Info>
          </Card>
        )}
      </Card>

      {(tokens?.list?.filter(t => t.balance !== "0").length ||
        ibcBalance?.length) &&
      !tokens?.loading ? (
        <Card
          title={<span className={s.cardTitleText}>Tokens</span>}
          bordered
          headerClassName={s.cardTitle}
          actions={
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={hideLowValueTokens}
                onChange={() => setHideLowValueTokens(!hideLowValueTokens)}
              />
              <span className={s.toggleTrack} />
              <span className={s.toggleLabel}>Hide low-balance</span>
            </label>
          }
        >
          <div className={s.cardBodyContainer}>
            {[
              ...(ibcBalance?.map(balance => {
                const hash = balance.denom.replace("ibc/", "");
                const decimals = ibcWhitelist?.[hash]?.decimals ?? 6;
                const value = new BigNumber(balance.amount.toString()).div(
                  new BigNumber(10).pow(decimals)
                );
                return {
                  key: balance.denom,
                  type: "ibc" as const,
                  value,
                  denom: balance.denom,
                  amount: balance.amount.toString(),
                  decimals
                };
              }) ?? []),
              ...(tokens?.list
                ?.filter(t => t.balance !== "0")
                .map(t => {
                  const decimals = t.decimals ?? 6;
                  const value = new BigNumber(t.balance).div(
                    new BigNumber(10).pow(decimals)
                  );
                  return {
                    key: t.address ?? t.symbol,
                    type: "cw20" as const,
                    value,
                    denom: t.symbol,
                    amount: t.balance,
                    decimals,
                    icon: t.icon,
                    address: t.address
                  };
                }) ?? [])
            ]
              .filter(item => {
                if (!hideLowValueTokens) return true;
                return item.value.gte(0.01);
              })
              .sort((a, b) => b.value.comparedTo(a.value))
              .map(item =>
                item.type === "ibc" ? (
                  <Available
                    key={item.key}
                    denom={item.denom}
                    amount={item.amount}
                  />
                ) : (
                  <AmountCard
                    key={item.key}
                    denom={item.denom}
                    amount={item.amount}
                    icon={item.icon ?? cwFallbackIcon}
                    fallbackIcon={cwFallbackIcon}
                    decimals={item.decimals}
                    linkTo={
                      item.address
                        ? `/${name}/address/${item.address}`
                        : undefined
                    }
                  />
                )
              )}
          </div>
        </Card>
      ) : tokens?.loading ? (
        <Card
          title={<span className={s.cardTitleText}>Tokens</span>}
          bordered
          headerClassName={s.cardTitle}
        >
          <div className={s.cardBodyContainer}>
            <Loading />
          </div>
        </Card>
      ) : null}
      {isClassic ? <OldVesting address={address} /> : null}
    </>
  );
};

export default TokenBalance;
