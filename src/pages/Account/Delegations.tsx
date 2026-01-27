import { useState } from "react";
import { readAmount } from "@terra.kitchen/utils";
import BigNumber from "bignumber.js";
import { lte } from "../../scripts/math";
import { getFindMoniker } from "../../queries/validator";
import { useDelegations, useValidators } from "../../queries/staking";
import { useStakingRewards } from "../../queries/distribution";
import ValidatorStatus from "../../components/ValidatorStatus";
import FlexTable from "../../components/FlexTable";
import Card from "../../components/Card";
import Finder from "../../components/Finder";
import Amount from "../../components/Amount";
import s from "./Account.module.scss";
import format from "../../scripts/format";
import { useIsClassic } from "../../contexts/ChainsContext";
import { useIBCWhitelist, useWhitelist } from "../../hooks/useTerraAssets";

const Delegations = ({ address }: { address: string }) => {
  const [hideLowValueRewards, setHideLowValueRewards] = useState(true);
  const { data: delegation } = useDelegations(address);
  const { data: validators } = useValidators();
  const { data: rewards } = useStakingRewards(address);
  const isClassic = useIsClassic();
  const whitelist = useWhitelist();
  const ibcWhitelist = useIBCWhitelist();

  if (!delegation || !validators || !rewards) {
    return null;
  }

  const [delegations] = delegation;

  const data = delegations
    .filter(({ balance }) => !lte(balance.amount.toString(), 0))
    .map(validator => {
      const { validator_address, balance } = validator;
      const moniker = getFindMoniker(validators)(validator_address);
      const amount = readAmount(balance.amount.toString(), { comma: true });
      const denom = format.denom(balance.denom, isClassic);
      const stakingRewards = rewards?.rewards[validator_address]?.toArray();
      const filteredRewards = stakingRewards?.filter(({ denom, amount }) => {
        if (!hideLowValueRewards) return true;
        const hash = denom?.replace("ibc/", "");
        const decimals =
          whitelist?.[denom ?? ""]?.decimals ??
          ibcWhitelist?.[hash ?? ""]?.decimals ??
          6;
        const min = new BigNumber(10).pow(decimals).multipliedBy(0.01);
        return new BigNumber(amount.toString()).gte(min);
      });
      const orderedRewards = filteredRewards?.sort((a, b) => {
        const aAmount = new BigNumber(a.amount.toString());
        const bAmount = new BigNumber(b.amount.toString());
        return bAmount.comparedTo(aAmount);
      });

      return [
        <span>
          <Finder
            q="validator"
            v={validator_address}
            children={moniker ?? validator_address}
          />
        </span>,
        <span>
          <ValidatorStatus validatorAddress={validator_address} />
        </span>,
        <span>{[amount, denom].join(" ")}</span>,
        <div>
          {orderedRewards && Array.isArray(orderedRewards) && (
            <ul>
              {orderedRewards.map(({ denom, amount }, index) => (
                <li key={index}>
                  <Amount denom={denom}>{amount.toString()}</Amount>
                </li>
              ))}
            </ul>
          )}
        </div>
      ];
    });

  const head = [`Validator`, `Status`, `Amount`, `Rewards`];

  return data.length ? (
    <Card
      title={<span className={s.cardTitleText}>Delegations</span>}
      bordered
      headerClassName={s.cardTitle}
      bodyClassName={s.cardBodyContainer}
      actions={
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={hideLowValueRewards}
            onChange={() => setHideLowValueRewards(!hideLowValueRewards)}
          />
          <span className={s.toggleTrack} />
          <span className={s.toggleLabel}>Hide low-balance</span>
        </label>
      }
    >
      <FlexTable
        head={head}
        body={data.map(delegation => delegation)}
        tableStyle={{ border: "none" }}
        headStyle={{ background: "none" }}
      />
    </Card>
  ) : null;
};

export default Delegations;
